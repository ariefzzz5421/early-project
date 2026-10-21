'use strict';
/**
 * Ethereum archival market discovery backed by DEX Screener public API.
 * - No API key required
 * - No token-name searches: always matches exact contract addresses
 * - Historical/wrapped trade links are never confused with original deployments
 * - Paginated discovery scans the full 2,432-contract archive
 */
const coins = require('../data/coins.json');
const tcos = require('../data/tcos.json');
const contracts = require('../data/contracts.json');
const ETH = /^0x[a-f\d]{40}$/i;
const cache = new Map();
const NOW = () => Date.now();
const addr = x => ETH.test(String(x || '')) ? String(x).toLowerCase() : '';
const num = n => Number.isFinite(Number(n)) ? Number(n) : null;
const pick = (o,k) => o && Object.prototype.hasOwnProperty.call(o,k) ? o[k] : null;

function linkedToken(raw) {
  try {
    const u = new URL(raw);
    if (u.hostname !== 'app.uniswap.org' || u.pathname !== '/swap') return '';
    return addr(u.searchParams.get('outputCurrency'));
  } catch { return ''; }
}
const curated = new Map();
function addRows(data,type) {
  const cols = data.columns;
  for (const row of data.rows) {
    const obj = Object.fromEntries(cols.map((c,i) => [c, String(row[i] ?? '')]));
    const address = addr(obj['Contract Address']);
    if (!address) continue;
    // An NFT listed on OpenSea is not a fungible-token DEX candidate.
    if (type === 'TCO' && obj['F/NF'] !== 'F') continue;
    const trade = obj['Trade URL'] || '';
    const mirror = linkedToken(trade);
    for (const marketAddress of [...new Set([address, mirror].filter(Boolean))]) {
      const key = marketAddress;
      const old = curated.get(key);
      const primary = old && old.source === 'Coin' ? old : {
        id: key, name: obj.Name, address: marketAddress, archiveAddress: address,
        linkedRepresentation: address !== marketAddress,
        source: type, originalName: obj.Name, date: obj['Deployment Time'] || '',
        tradeUrl: trade, sourceUrl: data.source,
      };
      if (!old || old.source !== 'Coin') curated.set(key, primary);
    }
  }
}
addRows(coins,'Coin');addRows(tcos,'TCO');

const contractRecords = contracts.rows.filter(row=>addr(row[2])).map(row => ({
  id:'contract-' + row[0],
  name:'Contract #' + row[0],
  address:addr(row[2]), archiveAddress:addr(row[2]),
  linkedRepresentation:false, source:'Contract', date:row[1] || '',
  note:(row[8] || '').slice(0,140), tradeUrl:'', sourceUrl:contracts.source
}));
const TOTAL_PAGES = Math.ceil(contractRecords.length / 120);
const BASE = 'https://api.dexscreener.com/tokens/v1/ethereum/';

function parsePair(pair, token) {
  if (pair?.chainId !== 'ethereum' || addr(pair?.baseToken?.address) !== token) return null;
  const url = typeof pair.url === 'string' && /^https:\/\/dexscreener\.com\//i.test(pair.url) ? pair.url : '';
  const liquidity = num(pair.liquidity?.usd);
  const volume24h = num(pair.volume?.h24);
  return {
    pairAddress:addr(pair.pairAddress), dexId:String(pair.dexId || ''),
    dexUrl:url, symbol:String(pair.baseToken?.symbol || ''),
    displayName:String(pair.baseToken?.name || ''),
    priceUsd:num(pair.priceUsd), marketCap:num(pair.marketCap), fdv:num(pair.fdv),
    liquidityUsd:liquidity, volume24h, change24h:num(pair.priceChange?.h24),
    buys24h:num(pair.txns?.h24?.buys), sells24h:num(pair.txns?.h24?.sells),
    pairCreatedAt:num(pair.pairCreatedAt),
    imageUrl:typeof pair.info?.imageUrl === 'string' && /^https:\/\//i.test(pair.info.imageUrl) ? pair.info.imageUrl : ''
  };
}
async function getPairs(addresses) {
  const batches = [];
  for (let i=0;i<addresses.length;i+=30) batches.push(addresses.slice(i,i+30));
  const outcomes = await Promise.allSettled(batches.map(async batch => {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),8500);
    try {
      const res = await fetch(BASE + batch.join(','), {headers:{Accept:'application/json'},signal:controller.signal});
      if (!res.ok) throw new Error('DEX Screener HTTP ' + res.status);
      const body = await res.json();
      if (!Array.isArray(body)) throw new Error('Unexpected DEX Screener response');
      return body;
    } finally {clearTimeout(timer)}
  }));
  let failed=0;
  const pairs=outcomes.flatMap(r=>{
    if(r.status==='fulfilled') return r.value;
    failed++;return [];
  });
  if(failed===outcomes.length && outcomes.length) throw new Error('DEX Screener is unavailable');
  return {pairs,failed};
}
async function hydrate(list,includeUnmatched) {
  const wanted = [...new Set(list.map(x=>x.address).filter(Boolean))];
  const {pairs,failed}=await getPairs(wanted);
  const grouped=new Map();
  for (const raw of pairs) {
    const base=addr(raw.baseToken?.address);
    if (!wanted.includes(base)) continue;
    const p=parsePair(raw,base);
    if(!p) continue;
    if(!grouped.has(base)) grouped.set(base,[]);
    grouped.get(base).push(p);
  }
  const output=[];
  for (const item of list) {
    const alternatives=(grouped.get(item.address) || []).sort((a,b)=>
      (b.liquidityUsd||0)-(a.liquidityUsd||0) || (b.volume24h||0)-(a.volume24h||0));
    const best=alternatives[0] || null;
    if (!includeUnmatched && !best) continue;
    output.push({
      ...item, pair:best, pairCount:alternatives.length,
      status: best ? ((best.liquidityUsd||0)>0 || (best.volume24h||0)>0 ? 'active':'indexed-no-liquidity'):'not-indexed'
    });
  }
  return {assets:output,failedBatches:failed};
}
module.exports=async function handler(req,res) {
  if(req.method !== 'GET') {res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'})}
  const scope=String(req.query.scope || 'curated');
  const page=Number(req.query.page || 0);
  if(!['curated','archive'].includes(scope) || !Number.isSafeInteger(page) || page<0 || (scope==='archive'&&page>=TOTAL_PAGES)) return res.status(400).json({error:'Invalid scope or page'});
  const key=scope+':'+page;
  const hit=cache.get(key);
  if(hit && NOW()-hit.at<240000) {
    res.setHeader('Cache-Control','public, s-maxage=240, stale-while-revalidate=600');
    return res.status(200).json(hit.value);
  }
  const list=scope==='curated' ? [...curated.values()] : contractRecords.slice(page*120,page*120+120);
  try {
    const result=await hydrate(list,scope==='curated');
    const output={
      scope,page,totalPages:scope==='archive'?TOTAL_PAGES:1,
      tested:list.length, matched:result.assets.filter(a=>a.pair).length,
      checkedAt:new Date().toISOString(),
      partial:result.failedBatches>0,
      marketSource:'DEX Screener',assets:result.assets
    };
    cache.set(key,{at:NOW(),value:output});
    if(cache.size>45) cache.delete(cache.keys().next().value);
    res.setHeader('Cache-Control','public, s-maxage=240, stale-while-revalidate=600');
    return res.status(200).json(output);
  } catch (error) {
    return res.status(502).json({error:'DEX Screener data temporarily unavailable',scope,page,detail:String(error.message||'Upstream error')});
  }
};