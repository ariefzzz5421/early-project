(()=>{
  'use strict';
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeLink=(str,host)=>{
    try {const u=new URL(str);return u.protocol==='https:' && (!host||u.hostname===host)?u.href:''}catch{return ''}
  };
  const compact=(value,dollar=false)=>{
    if(value===null||value===undefined||!Number.isFinite(Number(value)))return '—';
    const n=Number(value),abs=Math.abs(n);
    const prefix=dollar?'$':'';
    if(abs>=1e9)return prefix+(n/1e9).toFixed(2)+'B';
    if(abs>=1e6)return prefix+(n/1e6).toFixed(2)+'M';
    if(abs>=1e3)return prefix+(n/1e3).toFixed(2)+'K';
    if(abs>=1)return prefix+n.toLocaleString('en-US',{maximumFractionDigits:3});
    if(abs===0)return prefix+'0';
    if(abs>=0.0001)return prefix+n.toFixed(5);
    return prefix+n.toPrecision(3);
  };
  const price=n=>{
    if(n===null||n===undefined||!Number.isFinite(Number(n)))return '—';
    const value=Number(n);
    return value>=1?('$'+value.toLocaleString('en-US',{maximumFractionDigits:5})):('$'+(value>=.00001?value.toFixed(7):value.toPrecision(5)));
  };
  const marketCache=window.genesisMarkets={tokens:new Map(),nfts:new Map()};
  const state={
    open:false,initialized:false,marketType:'tokens',search:'',sort:'marketCap',onlyActive:true,
    tokenAssets:new Map(),nftAssets:new Map(),tokenPages:0,nftPages:0,
    scanPages:0,scanDone:0,scanTotal:2432,scanRunning:false,nftRunning:false,
    tokenError:'',nftError:'',tokenChecked:'',nftChecked:'',lastErrorPage:-1,refreshed:0
  };
  const notify=()=>document.dispatchEvent(new CustomEvent('genesis:markets-updated'));
  const metric=(id,value)=>{const el=$(id);if(el)el.textContent=value};
  const tokenValues=()=>[...state.tokenAssets.values()];
  const nftValues=()=>[...state.nftAssets.values()];
  const isActive=item=>item.status==='active';
  const tradeUrlFor=item=>safeLink(item.pair?.dexUrl,'dexscreener.com') ||
    'https://dexscreener.com/ethereum/'+encodeURIComponent(item.address);
  const badgeSource=item=>{
    if(item.linkedRepresentation)return '<span class="trade-linked">RELATED / WRAPPED TOKEN</span>';
    if(item.source==='Contract')return 'ORIGINAL CONTRACT · #'+esc(item.id.split('-').pop());
    return esc(item.source.toUpperCase()+' · HISTORICAL ARCHIVE');
  };
  function refreshMetrics() {
    const tokens=tokenValues(),nfts=nftValues();
    metric('#trade-token-count',tokens.filter(t=>t.pair).length.toLocaleString('en-US'));
    metric('#trade-active-tokens',tokens.filter(isActive).length.toLocaleString('en-US'));
    metric('#trade-nft-count',nfts.length.toLocaleString('en-US'));
    metric('#trade-active-nfts',nfts.filter(isActive).length.toLocaleString('en-US'));
    metric('#token-tab-count',tokens.filter(isActive).length);
    metric('#nft-tab-count',nfts.filter(isActive).length);
    if(state.tokenChecked||state.nftChecked)metric('#trade-updated','API CHECKED '+new Date(state.tokenChecked||state.nftChecked).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}));
  }
  function renderHeader(){
    const tokens=state.marketType==='tokens';
    $('#trade-table-head').innerHTML=tokens
    ?'<tr><th>HISTORICAL ASSET</th><th>MARKET CAP / FDV</th><th>PRICE USD</th><th>24H CHANGE</th><th>24H VOLUME</th><th>LIQUIDITY</th><th>MARKET</th></tr>'
    :'<tr><th>HISTORICAL COLLECTION</th><th>FLOOR PRICE</th><th>24H VOLUME</th><th>ALL-TIME VOLUME</th><th>24H SALES</th><th>COLLECTION STATUS</th><th>OPENSEA</th></tr>';
    const options=tokens
      ?[['marketCap','Market cap ↓'],['price','Token price ↓'],['volume','24h volume ↓'],['liquidity','DEX liquidity ↓']]
      :[['floor','Floor price ↓'],['volume','24h volume ↓'],['totalVolume','Total volume ↓'],['sales','24h sales ↓']];
    const el=$('#trade-sort');
    if(!options.some(x=>x[0]===state.sort))state.sort=options[0][0];
    el.innerHTML=options.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join('');
    el.value=state.sort;
    $('#trade-search').placeholder=tokens?'Search name, ticker or contract...':'Search NFT name, address or collection...';
    $('#trade-provider').textContent=tokens?'DEX SCREENER · ETHEREUM':'OPENSEA · ETHEREUM';
    $$('.trade-toggle-button').forEach(el=>{const on=el.dataset.marketType===state.marketType;el.classList.toggle('active',on);el.setAttribute('aria-selected',String(on))});
  }
  function getSort(item) {
    if(state.marketType==='tokens'){
      if(state.sort==='volume')return item.pair?.volume24h;
      if(state.sort==='liquidity')return item.pair?.liquidityUsd;
      if(state.sort==='price')return item.pair?.priceUsd;
      return item.pair?.marketCap ?? item.pair?.fdv;
    }
    if(state.sort==='volume')return item.market?.volume24h;
    if(state.sort==='totalVolume')return item.market?.totalVolume;
    if(state.sort==='sales')return item.market?.sales24h;
    return item.market?.floorPrice;
  }
  function visibleRows(){
    const list=state.marketType==='tokens'?tokenValues():nftValues();
    const q=state.search.trim().toLowerCase();
    return list.filter(x=>(!state.onlyActive||isActive(x))&&(!q||[x.name,x.address,x.pair?.symbol,x.pair?.displayName,x.slug].some(v=>String(v||'').toLowerCase().includes(q))))
      .sort((a,b)=>{
        const av=getSort(a),bv=getSort(b);
        if(av===null||av===undefined)return bv===null||bv===undefined?a.name.localeCompare(b.name):1;
        if(bv===null||bv===undefined)return -1;
        return bv-av || a.name.localeCompare(b.name);
      });
  }
  function fallbackStatus(){
    if(state.marketType==='tokens'){
      if(state.tokenError)return state.tokenError;
      if(state.scanRunning)return 'Scanning contract archive · '+state.scanDone.toLocaleString('en-US')+' / '+state.scanTotal.toLocaleString('en-US')+' checked';
      return state.tokenChecked?'DEX markets indexed · cached for approximately 4 minutes':'Connecting to DEX Screener…';
    }
    if(state.nftError)return state.nftError;
    if(state.nftRunning)return 'Resolving historical collections and requesting floor / volume data…';
    return state.nftChecked?'OpenSea markets indexed · cached for approximately 9 minutes':'Connecting to OpenSea…';
  }
  function marketActions(item,kind){
    if(kind==='tokens'){
      const dex=safeLink(item.pair?.dexUrl,'dexscreener.com')||tradeUrlFor(item);
      const explorer='https://etherscan.io/address/'+encodeURIComponent(item.address);
      const trade=safeLink(item.tradeUrl);
      return '<div class="trade-market-links"><a target="_blank" rel="noopener noreferrer" href="'+esc(dex)+'">DEX ↗</a>'+
        (trade?'<a class="secondary" target="_blank" rel="noopener noreferrer" href="'+esc(trade)+'">TRADE ↗</a>':'')+
        '<a class="secondary" target="_blank" rel="noopener noreferrer" href="'+esc(explorer)+'">ETH ↗</a></div>';
    }
    const opensea=safeLink(item.openseaUrl,'opensea.io');
    const source=safeLink(item.originalLink);
    return '<div class="trade-market-links">'+(opensea?'<a target="_blank" rel="noopener noreferrer" href="'+esc(opensea)+'">OPENSEA ↗</a>':'<span class="trade-placeholder">NOT RESOLVED</span>')+
      (source&&!source.includes('opensea.io/collection/')?'<a class="secondary" target="_blank" rel="noopener noreferrer" href="'+esc(source)+'">SOURCE ↗</a>':'')+'</div>';
  }
  function tokenRow(a){
    const p=a.pair||{};
    const cap=p.marketCap??p.fdv;
    const capKind=p.marketCap!=null?'MARKET CAP':p.fdv!=null?'FDV ONLY':'UNAVAILABLE';
    const delta=p.change24h;
    const change=delta===null||delta===undefined?'<span class="trade-placeholder">—</span>':
      '<span class="'+(delta>=0?'trade-positive':'trade-negative')+'">'+(delta>=0?'+':'')+Number(delta).toFixed(2)+'%</span>';
    const avatar=safeLink(p.imageUrl)?'<img src="'+esc(p.imageUrl)+'" alt="" loading="lazy" referrerpolicy="no-referrer" />':'◈';
    const sub=badgeSource(a);
    const wrapped=a.linkedRepresentation?'<span class="trade-subvalue">Historical: '+esc(a.archiveAddress.slice(0,9))+'… (different contract)</span>':'';
    return '<tr><td><div class="trade-asset"><div class="trade-avatar">'+avatar+'</div><div><strong>'+esc(a.name)+'</strong><small>'+esc(p.symbol||'')+' · '+esc(a.address.slice(0,7)+'…'+a.address.slice(-5))+'</small><small>'+sub+'</small>'+wrapped+'</div></div></td>'+
      '<td><span class="trade-value">'+compact(cap,true)+'</span><span class="trade-subvalue">'+capKind+'</span></td>'+
      '<td><span class="trade-value">'+price(p.priceUsd)+'</span></td>'+
      '<td>'+change+'</td>'+
      '<td><span class="trade-value">'+compact(p.volume24h,true)+'</span></td>'+
      '<td><span class="trade-value">'+compact(p.liquidityUsd,true)+'</span></td>'+
      '<td>'+marketActions(a,'tokens')+'</td></tr>';
  }
  function nftRow(a){
    const m=a.market||{};
    const floor=m.floorPrice!=null?compact(m.floorPrice)+' '+esc(m.floorCurrency||'ETH'):'—';
    const volume=m.volume24h!=null?compact(m.volume24h)+' '+esc(m.volumeCurrency||'ETH'):'—';
    const total=m.totalVolume!=null?compact(m.totalVolume)+' '+esc(m.totalVolumeCurrency||'ETH'):'—';
    const status=a.status==='active'?'<span class="trade-positive">● MARKET DATA</span>':
      a.status==='provider-unavailable'?'<span class="trade-placeholder">API UNAVAILABLE</span>':
      '<span class="trade-placeholder">NOT CONFIRMED</span>';
    const collectionNote=a.resolution==='source-link'?'ARCHIVE-LINKED COLLECTION · VERIFY WRAPPER':a.resolution==='contract-resolved'?'CONTRACT-RESOLVED BY OPENSEA':'NO VERIFIED COLLECTION';
    return '<tr><td><div class="trade-asset"><div class="trade-avatar nft">▧</div><div><strong>'+esc(a.name)+'</strong><small>'+esc(a.address.slice(0,7)+'…'+a.address.slice(-5))+'</small><small>'+esc(collectionNote)+'</small></div></div></td>'+
      '<td><span class="trade-value">'+floor+'</span></td>'+
      '<td><span class="trade-value">'+volume+'</span></td>'+
      '<td><span class="trade-value">'+total+'</span></td>'+
      '<td><span class="trade-value">'+(m.sales24h==null?'—':compact(m.sales24h))+'</span></td>'+
      '<td>'+status+'</td><td>'+marketActions(a,'nfts')+'</td></tr>';
  }
  function render(){
    if(!state.open)return;
    renderHeader();
    refreshMetrics();
    const records=visibleRows();
    $('#trade-table-body').innerHTML=records.length?records.slice(0,250).map(state.marketType==='tokens'?tokenRow:nftRow).join(''):
      '<tr><td colspan="7" class="empty-state">'+(state.onlyActive?'No active markets confirmed for this filter. Disable “Active only” to see archived links and unpriced records.':'No matching records, or markets still loading.')+'</td></tr>';
    $('#trade-result-count').textContent=records.length+' '+(state.marketType==='tokens'?'token':'collection')+' records'+(records.length>250?' (showing first 250)':'');
    $('#trade-status').textContent=fallbackStatus();
    const scanned=Math.min(state.scanDone,state.scanTotal);
    $('#scan-progress').textContent=scanned.toLocaleString('en-US')+' / '+state.scanTotal.toLocaleString('en-US');
    $('#scan-progress-bar').style.width=(state.scanTotal?scanned/state.scanTotal*100:0)+'%';
    $('#scan-description').textContent=state.scanRunning?'SCANNING ETHEREUM…':(state.scanDone>=state.scanTotal?'SCAN COMPLETED':'FULL ARCHIVE DISCOVERY');
    $('#scan-subtext').textContent=state.tokenError||(
      state.scanDone>=state.scanTotal?'Full archive checked. Automatic refresh on next visit.':
      state.scanDone?'Checked '+state.scanDone.toLocaleString('en-US')+' historical contracts':'Starts automatically when Trade is opened');
    $('#scan-retry').hidden=!(state.tokenError && !state.scanRunning);
  }
  function rememberToken(a){
    if(!a?.address)return;
    const key=a.address.toLowerCase();
    if(a.source==='Contract' && state.tokenAssets.has(key))return;
    const existing=state.tokenAssets.get(key);
    if(existing && existing.source!=='Contract' && a.source==='Contract')return;
    state.tokenAssets.set(key,a);
    marketCache.tokens.set(key,a);
    if(a.archiveAddress && a.address.toLowerCase()===a.archiveAddress.toLowerCase()) marketCache.tokens.set(a.archiveAddress.toLowerCase(),a);
  }
  function rememberNft(a){
    if(!a?.address)return;
    const key=a.address.toLowerCase();
    state.nftAssets.set(key,a);
    marketCache.nfts.set(key,a);
  }
  async function fetchJson(path){
    const response=await fetch(path,{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('HTTP '+response.status);
    return response.json();
  }
  async function loadCurated(){
    try{
      const data=await fetchJson('/api/market-tokens?scope=curated');
      (data.assets||[]).forEach(rememberToken);
      state.tokenChecked=data.checkedAt;
      if(data.partial)state.tokenError='Partial DEX coverage: some API batches failed';
      notify();
    }catch(e){
      state.tokenError='DEX Screener request failed ('+e.message+'). The original archive remains available.';
    }
    render();
  }
  async function scanArchive(){
    if(state.scanRunning)return;
    state.scanRunning=true;state.tokenError='';render();
    try{
      let page=state.scanPages;
      // Deliberately pace requests; each server request performs at most 4 batched DEX calls.
      while(page<21){
        const data=await fetchJson('/api/market-tokens?scope=archive&page='+page);
        (data.assets||[]).forEach(rememberToken);
        state.scanPages=page+1;
        state.scanDone+=data.tested||0;
        state.scanTotal=2432;
        if(data.partial) state.tokenError='DEX partial response on archive page '+(page+1);
        if(data.totalPages && page+1>=data.totalPages) {break}
        page++;
        notify();render();
        await new Promise(r=>setTimeout(r,350));
      }
    }catch(e){
      state.tokenError='Contract scan interrupted ('+e.message+'). Press retry to continue.';
    }finally{state.scanRunning=false;notify();render()}
  }
  async function loadNftCollections(){
    if(state.nftRunning)return;
    state.nftRunning=true;state.nftError='';render();
    try{
      let page=state.nftPages;
      while(page<15){
        const data=await fetchJson('/api/market-nfts?page='+page);
        (data.assets||[]).forEach(rememberNft);
        state.nftPages=page+1;
        state.nftChecked=data.checkedAt;
        if(data.providerError){
          state.nftError=data.providerError+' · source links remain visible';
          state.onlyActive=false;$('#trade-active-only').checked=false;
        }
        notify();render();
        if(page+1>=data.totalPages)break;
        page++;
        await new Promise(r=>setTimeout(r,140));
      }
    }catch(e){
      state.nftError='OpenSea market stats not available ('+e.message+'). Existing links remain available.';
      state.onlyActive=false;$('#trade-active-only').checked=false;
    }finally{state.nftRunning=false;notify();render()}
  }
  function start(){
    if(state.initialized){render();return}
    state.initialized=true;state.open=true;render();
    loadCurated();
    loadNftCollections();
    scanArchive();
  }
  function refresh(){
    const now=Date.now();
    if(now-state.refreshed<90000){$('#trade-status').textContent='Please allow 90 seconds between full refreshes.';return}
    state.refreshed=now;
    state.scanPages=0;state.scanDone=0;state.nftPages=0;state.tokenError='';state.nftError='';
    state.tokenAssets.clear();state.nftAssets.clear();marketCache.tokens.clear();marketCache.nfts.clear();
    loadCurated();loadNftCollections();scanArchive();render();
  }
  document.addEventListener('genesis:view',event=>{
    state.open=event.detail.tab==='trade';
    if(state.open)start();
  });
  $$('.trade-toggle-button').forEach(el=>el.addEventListener('click',()=>{
    state.marketType=el.dataset.marketType;state.sort=state.marketType==='tokens'?'marketCap':'floor';
    state.search='';$('#trade-search').value='';
    render();
  }));
  $('#trade-search').addEventListener('input',e=>{state.search=e.target.value;render()});
  $('#trade-sort').addEventListener('change',e=>{state.sort=e.target.value;render()});
  $('#trade-active-only').addEventListener('change',e=>{state.onlyActive=e.target.checked;render()});
  $('#trade-refresh').addEventListener('click',refresh);
  $('#scan-retry').addEventListener('click',scanArchive);
  if(location.pathname==='/trade'||location.pathname==='/trade/') {
    // The app's archive loader may still be pending; render the live page immediately.
    state.open=true;start();
  }
})();