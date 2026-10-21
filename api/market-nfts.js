'use strict';
/**
 * NFT discovery from historical collections, linked to official OpenSea.
 * Uses OPENSEA_API_KEY when configured, otherwise the documented no-signup
 * seven-day agent key. This key stays server-side and is never returned.
 */
const nftData=require('../data/nfts.json');
const tcoData=require('../data/tcos.json');
const ETH=/^0x[a-f\d]{40}$/i;
const addr=x=>ETH.test(String(x||''))?String(x).toLowerCase():'';
const num=x=>x===null||x===undefined||x===''?null:(Number.isFinite(Number(x))?Number(x):null);
const takeUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'||u.protocol==='http:'?u.href:''}catch{return ''}};
const slugFromUrl=v=>{try{const u=new URL(v);if(!['opensea.io','www.opensea.io'].includes(u.hostname))return '';const m=u.pathname.match(/^\/collection\/([a-z0-9][a-z0-9-]*)\/?$/i);return m?m[1]:''}catch{return ''}};
let minted=null;
let minting=null;
let memo=new Map();

const all=new Map();
function add(data,type) {
  for(const row of data.rows) {
    const x=Object.fromEntries(data.columns.map((k,i)=>[k,String(row[i]??'')]));
    const address=addr(x['Contract Address']);
    if(!address) continue;
    const rawUrl=takeUrl(x['Trade URL']);
    // TCOs labeled fungible are not NFT collections unless source explicitly links an OpenSea collection.
    if(type==='TCO' && x['F/NF']!=='NF' && !slugFromUrl(rawUrl))continue;
    const existing=all.get(address);
    const entry={
      id:address,address,name:x.Name||'Untitled collection',
      collectionSource:type,sourceUrl:data.source,originalLink:rawUrl,
      originalSite:takeUrl(x['Website URL']),
      slug:slugFromUrl(rawUrl),date:x['Deployment Time']||'',
      limit:x.Limit||'',historicBefore2021:x['Pre-2021']||'',
      sourceLinked:!!slugFromUrl(rawUrl)
    };
    if(!existing||type==='NFT') all.set(address,entry);
  }
}
add(tcoData,'TCO');add(nftData,'NFT');
const entries=[...all.values()];
const PAGE_SIZE=9;
const PAGES=Math.ceil(entries.length/PAGE_SIZE);

async function withTimeout(url,options={}) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),7000);
  try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(timer)}
}
async function getKey() {
  if(process.env.OPENSEA_API_KEY) return process.env.OPENSEA_API_KEY;
  if(minted && Date.now()<minted.until) return minted.key;
  if(minting) return minting;
  minting=(async()=>{
    const response=await withTimeout('https://api.opensea.io/api/v2/auth/keys',{method:'POST',headers:{Accept:'application/json'}});
    if(!response.ok) throw new Error('OpenSea instant key HTTP '+response.status);
    const data=await response.json();
    if(!data.api_key) throw new Error('OpenSea key generation unavailable');
    const expiration=Date.parse(data.expires_at);
    minted={key:data.api_key,until:Number.isFinite(expiration)?expiration-120000:Date.now()+1000*3600*24*6};
    return minted.key;
  })();
  try{return await minting}finally{minting=null}
}
async function apiGet(route,key) {
  const response=await withTimeout('https://api.opensea.io/api/v2/'+route,{
    headers:{'X-API-KEY':key,Accept:'application/json'}
  });
  if(response.status===404) return null;
  if(response.status===401||response.status===403) throw new Error('OpenSea authorization declined');
  if(response.status===429) throw new Error('OpenSea rate limit reached');
  if(!response.ok) throw new Error('OpenSea HTTP '+response.status);
  return response.json();
}
async function enrich(item,key) {
  let slug=item.slug;
  let resolution=item.sourceLinked?'source-link':'not-found';
  if(!slug){
    const info=await apiGet('chain/ethereum/contract/'+item.address,key);
    if(info && typeof info.collection==='string' && /^[a-z0-9][a-z0-9-]*$/i.test(info.collection)) {
      slug=info.collection;resolution='contract-resolved';
    }
  }
  const url=slug?'https://opensea.io/collection/'+encodeURIComponent(slug):(item.originalLink||'');
  if(!slug)return {...item,openseaUrl:url||null,slug:null,market:null,status:'not-found',resolution};
  const stats=await apiGet('collections/'+encodeURIComponent(slug)+'/stats',key);
  if(!stats)return {...item,openseaUrl:url,slug,market:null,status:'not-found',resolution};
  const total=stats.total||{};
  const interval=(stats.intervals||[]).find(x=>['one_day','1d','24h'].includes(String(x.interval)))||null;
  const floor=num(total.floor_price);
  const vol=num(interval?.volume);
  const floorCurrency=String(total.floor_price_symbol||'ETH');
  const volumeCurrency=String(interval?.volume_symbol||total.volume_symbol||floorCurrency||'ETH');
  return {
    ...item,slug,openseaUrl:url,resolution,
    status:(floor!==null&&floor>0)||(vol!==null&&vol>0)?'active':'no-active-market',
    market:{
      floorPrice:floor, floorCurrency,
      volume24h:vol, volumeCurrency,
      totalVolume:num(total.volume),
      totalVolumeCurrency:String(total.volume_symbol||volumeCurrency),
      sales24h:num(interval?.sales),owners:num(total.num_owners),
      salesTotal:num(total.sales)
    }
  };
}
async function processAll(items) {
  let key=null;
  try{key=await getKey()}catch(e){return {assets:items.map(x=>({...x,openseaUrl:x.slug?'https://opensea.io/collection/'+encodeURIComponent(x.slug):x.originalLink||null,market:null,status:'provider-unavailable',resolution:x.sourceLinked?'source-link':'not-found'})),providerError:'OpenSea API authentication temporarily unavailable'}}
  let cursor=0,errors=0;
  const output=new Array(items.length);
  const jobs=Array.from({length:Math.min(3,items.length)},async()=>{
    while(cursor<items.length) {
      const index=cursor++;
      try{output[index]=await enrich(items[index],key)}
      catch(e) {
        errors++;
        const x=items[index];
        output[index]={...x,openseaUrl:x.slug?'https://opensea.io/collection/'+encodeURIComponent(x.slug):x.originalLink||null,market:null,status:'provider-unavailable',resolution:x.sourceLinked?'source-link':'not-found',error:String(e.message||'Upstream error')};
      }
    }
  });
  await Promise.all(jobs);
  return {assets:output,providerError:errors?'OpenSea unavailable or limited for '+errors+' records':null};
}
module.exports=async function handler(req,res) {
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'})}
  const page=Number(req.query.page||0);
  if(!Number.isSafeInteger(page)||page<0||page>=PAGES)return res.status(400).json({error:'Invalid page'});
  const cached=memo.get(page);
  if(cached&&Date.now()-cached.time<540000){
    res.setHeader('Cache-Control','public, s-maxage=540, stale-while-revalidate=1200');
    return res.status(200).json(cached.body);
  }
  const segment=entries.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  const result=await processAll(segment);
  const body={page,totalPages:PAGES,totalEntries:entries.length,checkedAt:new Date().toISOString(),
    marketSource:'OpenSea',providerError:result.providerError,assets:result.assets};
  if(!result.providerError)memo.set(page,{time:Date.now(),body});
  res.setHeader('Cache-Control',result.providerError?'public, s-maxage=60':'public, s-maxage=540, stale-while-revalidate=1200');
  return res.status(200).json(body);
};