(() => {
  'use strict';

  const ids = {
    contracts: '1r-SDx4V-DHsQQfRltFHI3tU_oPIZ-YOrcHGZdHcKQgs',
    coins: '1-mZRSdvs0-royMN9t2f9ZgRiOifN7d3wnLng8Elge90',
    nfts: '19vbNZyta0Vfkfw8FtEQmvZkfOtiuTarLqdX7V9XvBEw',
    tcos: '1j2hL6pnQBJWpqxFjLj-I2_4AY-HA_fkC49Qp46OAF3Q'
  };
  const labels = { overview:'Overview',contracts:'Contracts',coins:'Coins',nfts:'NFTs',tcos:'TCOs',trade:'Trade' };
  const overlayKeys = ['contracts', 'ownable', 'coin-contracts', 'nft-contracts', 'other-contracts'];
  const ranges = [[1,402],[403,768],[769,1020],[1021,1246],[1247,1515],[1516,1758],[1759,1965],[1966,2203],[2204,2336],[2337,2432]];
  const cache = {};
  const bytecodeCache = {};
  let activeTab = 'overview';
  let contractTab = 'contracts';
  let query = '';
  let sort = 'oldest';
  let page = 1;
  let matched = [];
  let selectedRecord = null;
  const PAGE_SIZE = 20;

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validAddress = s => /^0x[a-fA-F0-9]{40}$/.test(String(s || ''));
  const safeUrl = s => { try { const u = new URL(String(s || '')); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const number = n => Number(n || 0).toLocaleString('en-US');

  function asDate(text) {
    const m = String(text || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    const year = +m[3] < 100 ? +m[3] + 2000 : +m[3];
    const date = new Date(Date.UTC(year, +m[1] - 1, +m[2]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  function humanDate(s) {
    const d = asDate(s);
    return d ? d.toLocaleDateString('en-US', {timeZone:'UTC',month:'short',day:'2-digit',year:'numeric'}) : (s || '—');
  }
  function shortAddress(s) {
    return s && s.length > 18 ? s.slice(0, 8) + '…' + s.slice(-6) : (s || '—');
  }
  function sheetFor(key) {
    return 'https://docs.google.com/spreadsheets/d/' + ids[overlayKeys.includes(key) ? 'contracts' : key] + '/edit' +
      (overlayKeys.includes(key) ? '#gid=' + ({contracts:879543193,ownable:1665344427,'coin-contracts':913655049,'nft-contracts':1303564825,'other-contracts':2061849275}[key]) : '');
  }
  function normalize(key, result) {
    const columns = result.columns || [];
    const category = overlayKeys.includes(key) ? 'contracts' : key;
    return (result.rows || []).map((arr, index) => {
      const fields = {};
      columns.forEach((col, i) => fields[col] = String(arr[i] ?? ''));
      const address = fields.Address || fields['Contract Address'] || '';
      if (!validAddress(address)) return null;
      const title = category === 'contracts' ? 'Contract #' + fields.Index : fields.Name;
      const subtitle = category === 'contracts' ? (fields.Notes && fields.Notes !== 'empty' ? fields.Notes : (fields.Type || 'Original Ethereum smart contract')) : (
        category === 'tcos' ? (fields['F/NF'] === 'NF' ? 'Non-fungible collectible' : fields['F/NF'] === 'F' ? 'Fungible collectible' : 'Early tokenized collectible') :
        category === 'coins' ? 'Historical fungible token' : 'Historical non-fungible artifact'
      );
      const date = fields.Date || fields['Deployment Time'] || '';
      const limit = fields.Limit || '';
      const kind = fields.Type || (category === 'tcos' ? fields['F/NF'] : '') || category;
      const source = result.source || sheetFor(key);
      return {id:key + '-' + index, key, category, fields, name:title || 'Unknown entry', subtitle, date, timestamp:asDate(date)?.getTime() ?? 0, address, limit, kind, source, index:Number(fields.Index || 0), haystack:Object.values(fields).join(' ').toLowerCase()};
    }).filter(Boolean);
  }
  async function load(key) {
    if (cache[key]) return cache[key];
    const response = await fetch('/data/' + encodeURIComponent(key) + '.json', {cache:'force-cache'});
    if (!response.ok) throw new Error('Dataset ' + key + ' returned HTTP ' + response.status);
    const payload = await response.json();
    cache[key] = normalize(key, payload);
    return cache[key];
  }

  function allVisible() {
    if (activeTab === 'overview') return ['contracts','coins','nfts','tcos'].flatMap(key => cache[key] || []);
    return cache[activeTab === 'contracts' ? contractTab : activeTab] || [];
  }
  function filterData() {
    const term = query.trim().toLowerCase();
    matched = allVisible().filter(row => !term || row.haystack.includes(term));
    matched.sort((a,b) => {
      if (sort === 'name') return a.name.localeCompare(b.name) || (a.timestamp - b.timestamp);
      return (sort === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp) || a.name.localeCompare(b.name);
    });
    return matched;
  }
  function categoryBadge(row) {
    return '<span class="category-pill ' + escapeHtml(row.category) + '"><span aria-hidden="true">' +
      ({contracts:'⌘',coins:'◈',nfts:'▧',tcos:'◎'}[row.category]) + '</span> ' +
      escapeHtml(labels[row.category]) + '</span>';
  }

  function marketStamp(item) {
    const m=window.genesisMarkets;
    if(!m) return '';
    if(item.category==='coins'||item.category==='tcos') {
      const info=m.tokens?.get(item.address.toLowerCase());
      if(info?.pair && info.status==='active') {
        const n=info.pair.marketCap ?? info.pair.fdv;
        const label=info.pair.marketCap!=null?'MC':'FDV';
        return n==null?'':'<span class="market-stamp">'+label+' 
    filterData();
    const pages = Math.max(1,Math.ceil(matched.length / PAGE_SIZE));
    page = Math.min(Math.max(1,page),pages);
    const start = (page - 1) * PAGE_SIZE;
    const chunk = matched.slice(start,start + PAGE_SIZE);
    $('#result-count').textContent = number(matched.length) + ' records found' + (query ? ' for "' + query.slice(0,65) + '"' : '');
    $('#page-summary').textContent = matched.length ? 'SHOWING ' + number(start + 1) + '–' + number(Math.min(start + PAGE_SIZE, matched.length)) + ' OF ' + number(matched.length) : 'NO MATCHING RECORDS';
    $('#page-indicator').textContent = page + ' / ' + pages;
    $('#prev-page').disabled = page <= 1;
    $('#next-page').disabled = page >= pages;
    const tbody = $('#table-body');
    if (!chunk.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No records matched. Try another address, project name, or keyword.</td></tr>';
      return;
    }
    tbody.innerHTML = chunk.map(item => '<tr tabindex="0" role="button" aria-label="Inspect ' + escapeHtml(item.name) + '" data-record="' + escapeHtml(item.id) + '">' +
      '<td><span class="table-item-name">' + escapeHtml(item.name) + '</span><span class="table-item-note">' + escapeHtml(item.subtitle) + '</span>' + marketStamp(item) + '</td>' +
      '<td><span class="mono-date">' + escapeHtml(humanDate(item.date)) + '</span></td>' +
      '<td>' + categoryBadge(item) + '</td>' +
      '<td>' + escapeHtml(item.limit.trim() || '—') + '</td>' +
      '<td><span class="mono-address">' + escapeHtml(shortAddress(item.address)) + '</span></td>' +
      '<td class="cell-more">↗</td></tr>').join('');
  }
  function setStats() {
    for (const key of ['contracts','coins','nfts','tcos']) {
      const count = number((cache[key] || []).length);
      for (const id of ['stat-' + key,'side-' + key,'tab-' + key]) {
        const node = document.getElementById(id);
        if (node) node.textContent = count;
      }
    }
    $('#tab-overview').textContent = number(['contracts','coins','nfts','tcos'].reduce((sum,key) => sum + (cache[key] || []).length,0));
  }
  function renderTimeline() {
    const contracts = cache.contracts || [];
    if (!contracts.length) { $('#timeline-bars').innerHTML='<div class="no-data">No archive data available</div>'; return; }
    const valid = contracts.filter(c => c.timestamp > 0);
    const earliest = Math.min(...valid.map(c => c.timestamp));
    const start = Math.floor(earliest / 86400000) * 86400000;
    const bins = Array.from({length:11}, (_,i) => ({date:new Date(start + i * 7 * 86400000),count:0}));
    valid.forEach(row => {
      const ix = Math.floor((row.timestamp - start) / (7 * 86400000));
      if (ix >= 0 && ix < bins.length) bins[ix].count++;
    });
    const max = Math.max(...bins.map(c => c.count),1);
    const end = new Date(Math.max(...valid.map(c=>c.timestamp)));
    $('#chart-range').textContent = new Date(start).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase() + ' – ' + end.toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase();
    $('#timeline-bars').innerHTML = bins.map((bin,i) => {
      const height = Math.max(4,Math.round(bin.count/max*91));
      return '<div class="timeline-col" title="' + escapeHtml(bin.date.toISOString().slice(0,10)) + ': ' + bin.count + ' contracts"><div class="timeline-bar" style="height:' + height + 'px"></div><span class="timeline-label">' + (i===0?'W1':i===bins.length-1?'W11':'·') + '</span></div>';
    }).join('');
  }
  async function activate(tab,scroll = true) {
    if (!labels[tab]) tab = 'overview';
    activeTab = tab; page = 1;
    document.body.classList.toggle('trade-active',tab==='trade');
    $('#breadcrumb-label').textContent = tab.toUpperCase();
    $$('.nav-item').forEach(b => b.classList.toggle('active',b.dataset.view===tab));
    $$('.collection-tab').forEach(b => { const yes=b.dataset.tab===tab; b.classList.toggle('active',yes); b.setAttribute('aria-selected',String(yes)); });
    $('#contract-subtab').classList.toggle('hidden',tab !== 'contracts');
    $('#sidebar').classList.remove('open');
    if (tab === 'contracts' && !cache[contractTab]) {
      $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract classification…</td></tr>';
      try { await load(contractTab); } catch(e) { showToast('Could not load this annotation tab'); }
    }
    renderTable();
    try { history.replaceState(null,'',tab==='trade'?'/trade':'/#' + tab); } catch {}
    document.dispatchEvent(new CustomEvent('genesis:view',{detail:{tab}}));
    if (scroll) (tab==='overview' ? $('#hero') : tab==='trade' ? $('#trade-page') : $('#archive')).scrollIntoView({behavior:'smooth',block:'start'});
  }
  function showToast(message) {
    const node = $('#toast'); node.textContent=message; node.classList.add('visible');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(()=>node.classList.remove('visible'),2900);
  }
  function csvValue(v) { return '"' + String(v??'').replace(/"/g,'""') + '"'; }
  function exportCsv() {
    const columns=['Collection','Name / Index','Date','Contract address','Classification','Limit','Notes','Trade URL','Website URL','Source sheet'];
    const lines=[columns, ...matched.map(r => [labels[r.category],r.name,r.date,r.address,r.kind,r.limit,r.fields.Notes || r.subtitle,r.fields['Trade URL'] || '',r.fields['Website URL'] || '',r.source])];
    const csv='\uFEFF' + lines.map(row=>row.map(csvValue).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url;a.download='genesis-atlas-' + activeTab + '-2026-10-22.csv';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast('Exported ' + number(matched.length) + ' records to CSV');
  }
  function recordById(id) {
    for (const list of Object.values(cache)) {
      const item=list.find(row=>row.id===id);
      if (item) return item;
    }
    return null;
  }
  function detailRows(item) {
    return Object.entries(item.fields)
      .filter(([key,val])=>!['Trade','Website','Trade URL','Website URL'].includes(key) && val && val !== '🔗')
      .map(([key,val])=>'<div class="detail-row"><label>' + escapeHtml(key) + '</label><span>' + escapeHtml(val) + '</span></div>').join('');
  }
  function detailButton(url,label,secondary=false) {
    const safe=safeUrl(url);
    return safe ? '<a class="drawer-action ' + (secondary?'secondary':'') + '" target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safe) + '">' + escapeHtml(label) + ' ↗</a>' : '';
  }
  function liveRecordStats(item) {
    const markets=window.genesisMarkets;
    if(!markets) return '';
    const t=markets.tokens?.get(item.address.toLowerCase());
    const n=markets.nfts?.get(item.address.toLowerCase());
    if(t?.pair && t.status==='active') {
      const value=t.pair.marketCap ?? t.pair.fdv;
      return '<div class="drawer-section-title">DEX SCREENER · LIVE SNAPSHOT</div><div class="detail-list">'+
        '<div class="detail-row"><label>'+(t.pair.marketCap!=null?'Market cap':'FDV')+'</label><span>'+(value!=null?'
    if (!item) return;
    selectedRecord=item;
    $('#drawer-number').textContent= item.category==='contracts' ? '#' + item.index : item.category.toUpperCase();
    const buttons=detailButton('https://etherscan.io/address/' + item.address,'ETHERSCAN') +
      detailButton(item.source,'SOURCE SHEET',true) +
      detailButton(item.fields['Website URL'],'WEBSITE',true) +
      detailButton(item.fields['Trade URL'],item.fields['Trade URL']?.includes('opensea.io')?'OPENSEA':'TRADE LINK',true) +
      detailButton((window.genesisMarkets?.nfts?.get(item.address.toLowerCase())?.openseaUrl || ''),'OPENSEA MARKET',true);
    $('#drawer-content').innerHTML =
      '<div class="drawer-kicker">' + escapeHtml(labels[item.category].toUpperCase()) + ' / HISTORICAL RECORD</div>' +
      '<h2 class="drawer-title">' + escapeHtml(item.name) + '</h2>' +
      '<p class="drawer-subtitle">' + escapeHtml(item.subtitle) + '</p>' +
      '<div class="drawer-action-row">' + buttons +
        '<button id="copy-address" class="drawer-action secondary" type="button">COPY ADDRESS ⧉</button></div>' +
      liveRecordStats(item) +
      '<div class="drawer-section-title">ORIGINAL RECORD DATA</div><div class="detail-list">' + detailRows(item) + '</div>' +
      (item.category==='contracts' ? '<div class="bytecode-controls"><button id="load-bytecode" class="bytecode-button" type="button">↘ VIEW ORIGINAL DEPLOYED BYTECODE (ON DEMAND)</button><div id="bytecode-container"></div></div>' : '') +
      '<p class="drawer-footnote">This is a historical research record. Always verify any contract through Etherscan and the linked primary spreadsheet. A listing does not imply the contract is active or safe to interact with.</p>';
    $('#drawer-backdrop').hidden=false;
    $('#record-drawer').hidden=false;
    document.body.style.overflow='hidden';
    $('#drawer-close').focus();
  }
  function closeRecord() {
    selectedRecord=null; $('#drawer-backdrop').hidden=true;$('#record-drawer').hidden=true;
    document.body.style.overflow='';
  }
  async function loadBytecode() {
    const item=selectedRecord;
    if (!item || !item.index) return;
    const i=ranges.findIndex(r=>item.index >= r[0] && item.index <= r[1]);
    const output=$('#bytecode-container');
    if (i<0) {output.textContent='Bytecode index unavailable. Open the original source sheet.';return}
    $('#load-bytecode').disabled=true;
    output.innerHTML='<div class="bytecode-output">Fetching archived bytecode…</div>';
    try {
      if (!bytecodeCache[i]) {
        const response=await fetch('/data/bytecode/' + String(i+1).padStart(2,'0') + '.json');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const obj=await response.json();
        bytecodeCache[i]=new Map(obj.rows.map(row=>[Number(row[0]),row[1]]));
      }
      if (selectedRecord !== item) return;
      const code=bytecodeCache[i].get(item.index) || '';
      output.innerHTML='<div class="bytecode-output">' + escapeHtml(code || 'No bytecode in source') + '</div>';
      $('#load-bytecode').textContent='ORIGINAL BYTECODE LOADED ✓';
    } catch(e) {
      output.innerHTML='<div class="bytecode-output">Could not load archived bytecode. Use the original spreadsheet source link instead.</div>';
      $('#load-bytecode').disabled=false;
    }
  }
  async function copyAddress() {
    if (!selectedRecord) return;
    try {
      await navigator.clipboard.writeText(selectedRecord.address);
      showToast('Contract address copied');
    } catch { showToast('Could not copy automatically'); }
  }

  document.addEventListener('click',event => {
    const nav=event.target.closest('[data-view]');
    if (nav) {activate(nav.dataset.view);return}
    const jump=event.target.closest('[data-jump]');
    if (jump) {activate(jump.dataset.jump);return}
    const tab=event.target.closest('[data-tab]');
    if (tab) {activate(tab.dataset.tab,false);return}
    const record=event.target.closest('[data-record]');
    if (record) {openRecord(recordById(record.dataset.record));return}
    if (event.target.closest('#copy-address')) {copyAddress();return}
    if (event.target.closest('#load-bytecode')) {loadBytecode();return}
  });
  $('#nav').addEventListener('keydown',event => { if (event.key==='Escape') $('#sidebar').classList.remove('open')});
  $('#table-body').addEventListener('keydown',event => {
    if ((event.key==='Enter'||event.key===' ') && event.target.matches('[data-record]')) {
      event.preventDefault();openRecord(recordById(event.target.dataset.record));
    }
  });
  $('#menu-button').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#explore-button').addEventListener('click',()=>$('#archive').scrollIntoView({behavior:'smooth'}));
  $('#drawer-close').addEventListener('click',closeRecord);
  $('#drawer-backdrop').addEventListener('click',closeRecord);
  document.addEventListener('keydown',event => {
    if (event.key==='Escape') {closeRecord();$('#sidebar').classList.remove('open')}
    if (event.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {event.preventDefault();$('#search').focus()}
  });
  $('#search').addEventListener('input',event=>{query=event.target.value;page=1;renderTable()});
  $('#sort').addEventListener('change',event=>{sort=event.target.value;page=1;renderTable()});
  $('#contract-subtab').addEventListener('change',async event=>{
    contractTab=event.target.value;page=1;
    $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract annotation…</td></tr>';
    try {await load(contractTab);renderTable()}catch{showToast('Could not fetch contract annotation')}
  });
  $('#export-button').addEventListener('click',exportCsv);
  $('#prev-page').addEventListener('click',()=>{if(page>1){page--;renderTable()}});
  $('#next-page').addEventListener('click',()=>{if(page<Math.ceil(matched.length/PAGE_SIZE)){page++;renderTable()}});
  async function init() {
    const results=await Promise.allSettled(['contracts','coins','nfts','tcos'].map(load));
    if(results.every(r=>r.status==='rejected')){
      $('#table-body').innerHTML='<tr><td colspan="6" class="empty-state">Unable to load local datasets. Check the deployment files.</td></tr>';
      $('#result-count').textContent='Data unavailable';return;
    }
    setStats();renderTimeline();renderTable();
    const first=location.pathname.replace(/\\/$/,'')==='/trade'?'trade':location.hash.replace('#','');
    if (labels[first]) await activate(first,false);
    if(results.some(r=>r.status==='rejected')) showToast('Some collections could not be loaded');
  }
  document.addEventListener('genesis:markets-updated',()=>{renderTable()});
  window.addEventListener('popstate',()=>{
    const view=location.pathname.replace(/\\/$/,'')==='/trade'?'trade':location.hash.replace('#','')||'overview';
    if(labels[view])activate(view,false);
  });
  init();
})();+numberCompact(n)+'</span>';
      }
    }
    if(item.category==='nfts'||item.category==='tcos') {
      const info=m.nfts?.get(item.address.toLowerCase());
      const floor=info?.market?.floorPrice;
      if(floor!=null && floor>0) return '<span class="market-stamp">FLOOR '+escapeHtml(floor)+' '+escapeHtml(info.market.floorCurrency)+'</span>';
    }
    return '';
  }
  function numberCompact(n) {
    const value=Number(n);
    if(value>=1e9)return (value/1e9).toFixed(2)+'B';
    if(value>=1e6)return (value/1e6).toFixed(2)+'M';
    if(value>=1e3)return (value/1e3).toFixed(1)+'K';
    return value.toLocaleString('en-US',{maximumFractionDigits:2});
  }
  function renderTable() {
    filterData();
    const pages = Math.max(1,Math.ceil(matched.length / PAGE_SIZE));
    page = Math.min(Math.max(1,page),pages);
    const start = (page - 1) * PAGE_SIZE;
    const chunk = matched.slice(start,start + PAGE_SIZE);
    $('#result-count').textContent = number(matched.length) + ' records found' + (query ? ' for "' + query.slice(0,65) + '"' : '');
    $('#page-summary').textContent = matched.length ? 'SHOWING ' + number(start + 1) + '–' + number(Math.min(start + PAGE_SIZE, matched.length)) + ' OF ' + number(matched.length) : 'NO MATCHING RECORDS';
    $('#page-indicator').textContent = page + ' / ' + pages;
    $('#prev-page').disabled = page <= 1;
    $('#next-page').disabled = page >= pages;
    const tbody = $('#table-body');
    if (!chunk.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No records matched. Try another address, project name, or keyword.</td></tr>';
      return;
    }
    tbody.innerHTML = chunk.map(item => '<tr tabindex="0" role="button" aria-label="Inspect ' + escapeHtml(item.name) + '" data-record="' + escapeHtml(item.id) + '">' +
      '<td><span class="table-item-name">' + escapeHtml(item.name) + '</span><span class="table-item-note">' + escapeHtml(item.subtitle) + '</span>' + marketStamp(item) + '</td>' +
      '<td><span class="mono-date">' + escapeHtml(humanDate(item.date)) + '</span></td>' +
      '<td>' + categoryBadge(item) + '</td>' +
      '<td>' + escapeHtml(item.limit.trim() || '—') + '</td>' +
      '<td><span class="mono-address">' + escapeHtml(shortAddress(item.address)) + '</span></td>' +
      '<td class="cell-more">↗</td></tr>').join('');
  }
  function setStats() {
    for (const key of ['contracts','coins','nfts','tcos']) {
      const count = number((cache[key] || []).length);
      for (const id of ['stat-' + key,'side-' + key,'tab-' + key]) {
        const node = document.getElementById(id);
        if (node) node.textContent = count;
      }
    }
    $('#tab-overview').textContent = number(['contracts','coins','nfts','tcos'].reduce((sum,key) => sum + (cache[key] || []).length,0));
  }
  function renderTimeline() {
    const contracts = cache.contracts || [];
    if (!contracts.length) { $('#timeline-bars').innerHTML='<div class="no-data">No archive data available</div>'; return; }
    const valid = contracts.filter(c => c.timestamp > 0);
    const earliest = Math.min(...valid.map(c => c.timestamp));
    const start = Math.floor(earliest / 86400000) * 86400000;
    const bins = Array.from({length:11}, (_,i) => ({date:new Date(start + i * 7 * 86400000),count:0}));
    valid.forEach(row => {
      const ix = Math.floor((row.timestamp - start) / (7 * 86400000));
      if (ix >= 0 && ix < bins.length) bins[ix].count++;
    });
    const max = Math.max(...bins.map(c => c.count),1);
    const end = new Date(Math.max(...valid.map(c=>c.timestamp)));
    $('#chart-range').textContent = new Date(start).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase() + ' – ' + end.toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase();
    $('#timeline-bars').innerHTML = bins.map((bin,i) => {
      const height = Math.max(4,Math.round(bin.count/max*91));
      return '<div class="timeline-col" title="' + escapeHtml(bin.date.toISOString().slice(0,10)) + ': ' + bin.count + ' contracts"><div class="timeline-bar" style="height:' + height + 'px"></div><span class="timeline-label">' + (i===0?'W1':i===bins.length-1?'W11':'·') + '</span></div>';
    }).join('');
  }
  async function activate(tab,scroll = true) {
    if (!labels[tab]) tab = 'overview';
    activeTab = tab; page = 1;
    $('#breadcrumb-label').textContent = tab.toUpperCase();
    $$('.nav-item').forEach(b => b.classList.toggle('active',b.dataset.view===tab));
    $$('.collection-tab').forEach(b => { const yes=b.dataset.tab===tab; b.classList.toggle('active',yes); b.setAttribute('aria-selected',String(yes)); });
    $('#contract-subtab').classList.toggle('hidden',tab !== 'contracts');
    $('#sidebar').classList.remove('open');
    if (tab === 'contracts' && !cache[contractTab]) {
      $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract classification…</td></tr>';
      try { await load(contractTab); } catch(e) { showToast('Could not load this annotation tab'); }
    }
    renderTable();
    try { history.replaceState(null,'','#' + tab); } catch {}
    if (scroll) (tab==='overview' ? $('#hero') : $('#archive')).scrollIntoView({behavior:'smooth',block:'start'});
  }
  function showToast(message) {
    const node = $('#toast'); node.textContent=message; node.classList.add('visible');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(()=>node.classList.remove('visible'),2900);
  }
  function csvValue(v) { return '"' + String(v??'').replace(/"/g,'""') + '"'; }
  function exportCsv() {
    const columns=['Collection','Name / Index','Date','Contract address','Classification','Limit','Notes','Trade URL','Website URL','Source sheet'];
    const lines=[columns, ...matched.map(r => [labels[r.category],r.name,r.date,r.address,r.kind,r.limit,r.fields.Notes || r.subtitle,r.fields['Trade URL'] || '',r.fields['Website URL'] || '',r.source])];
    const csv='\uFEFF' + lines.map(row=>row.map(csvValue).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url;a.download='genesis-atlas-' + activeTab + '-2026-10-22.csv';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast('Exported ' + number(matched.length) + ' records to CSV');
  }
  function recordById(id) {
    for (const list of Object.values(cache)) {
      const item=list.find(row=>row.id===id);
      if (item) return item;
    }
    return null;
  }
  function detailRows(item) {
    return Object.entries(item.fields)
      .filter(([key,val])=>!['Trade','Website','Trade URL','Website URL'].includes(key) && val && val !== '🔗')
      .map(([key,val])=>'<div class="detail-row"><label>' + escapeHtml(key) + '</label><span>' + escapeHtml(val) + '</span></div>').join('');
  }
  function detailButton(url,label,secondary=false) {
    const safe=safeUrl(url);
    return safe ? '<a class="drawer-action ' + (secondary?'secondary':'') + '" target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safe) + '">' + escapeHtml(label) + ' ↗</a>' : '';
  }
  function openRecord(item) {
    if (!item) return;
    selectedRecord=item;
    $('#drawer-number').textContent= item.category==='contracts' ? '#' + item.index : item.category.toUpperCase();
    const buttons=detailButton('https://etherscan.io/address/' + item.address,'ETHERSCAN') +
      detailButton(item.source,'SOURCE SHEET',true) +
      detailButton(item.fields['Website URL'],'WEBSITE',true) +
      detailButton(item.fields['Trade URL'],'TRADE LINK',true);
    $('#drawer-content').innerHTML =
      '<div class="drawer-kicker">' + escapeHtml(labels[item.category].toUpperCase()) + ' / HISTORICAL RECORD</div>' +
      '<h2 class="drawer-title">' + escapeHtml(item.name) + '</h2>' +
      '<p class="drawer-subtitle">' + escapeHtml(item.subtitle) + '</p>' +
      '<div class="drawer-action-row">' + buttons +
        '<button id="copy-address" class="drawer-action secondary" type="button">COPY ADDRESS ⧉</button></div>' +
      '<div class="drawer-section-title">ORIGINAL RECORD DATA</div><div class="detail-list">' + detailRows(item) + '</div>' +
      (item.category==='contracts' ? '<div class="bytecode-controls"><button id="load-bytecode" class="bytecode-button" type="button">↘ VIEW ORIGINAL DEPLOYED BYTECODE (ON DEMAND)</button><div id="bytecode-container"></div></div>' : '') +
      '<p class="drawer-footnote">This is a historical research record. Always verify any contract through Etherscan and the linked primary spreadsheet. A listing does not imply the contract is active or safe to interact with.</p>';
    $('#drawer-backdrop').hidden=false;
    $('#record-drawer').hidden=false;
    document.body.style.overflow='hidden';
    $('#drawer-close').focus();
  }
  function closeRecord() {
    selectedRecord=null; $('#drawer-backdrop').hidden=true;$('#record-drawer').hidden=true;
    document.body.style.overflow='';
  }
  async function loadBytecode() {
    const item=selectedRecord;
    if (!item || !item.index) return;
    const i=ranges.findIndex(r=>item.index >= r[0] && item.index <= r[1]);
    const output=$('#bytecode-container');
    if (i<0) {output.textContent='Bytecode index unavailable. Open the original source sheet.';return}
    $('#load-bytecode').disabled=true;
    output.innerHTML='<div class="bytecode-output">Fetching archived bytecode…</div>';
    try {
      if (!bytecodeCache[i]) {
        const response=await fetch('/data/bytecode/' + String(i+1).padStart(2,'0') + '.json');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const obj=await response.json();
        bytecodeCache[i]=new Map(obj.rows.map(row=>[Number(row[0]),row[1]]));
      }
      if (selectedRecord !== item) return;
      const code=bytecodeCache[i].get(item.index) || '';
      output.innerHTML='<div class="bytecode-output">' + escapeHtml(code || 'No bytecode in source') + '</div>';
      $('#load-bytecode').textContent='ORIGINAL BYTECODE LOADED ✓';
    } catch(e) {
      output.innerHTML='<div class="bytecode-output">Could not load archived bytecode. Use the original spreadsheet source link instead.</div>';
      $('#load-bytecode').disabled=false;
    }
  }
  async function copyAddress() {
    if (!selectedRecord) return;
    try {
      await navigator.clipboard.writeText(selectedRecord.address);
      showToast('Contract address copied');
    } catch { showToast('Could not copy automatically'); }
  }

  document.addEventListener('click',event => {
    const nav=event.target.closest('[data-view]');
    if (nav) {activate(nav.dataset.view);return}
    const jump=event.target.closest('[data-jump]');
    if (jump) {activate(jump.dataset.jump);return}
    const tab=event.target.closest('[data-tab]');
    if (tab) {activate(tab.dataset.tab,false);return}
    const record=event.target.closest('[data-record]');
    if (record) {openRecord(recordById(record.dataset.record));return}
    if (event.target.closest('#copy-address')) {copyAddress();return}
    if (event.target.closest('#load-bytecode')) {loadBytecode();return}
  });
  $('#nav').addEventListener('keydown',event => { if (event.key==='Escape') $('#sidebar').classList.remove('open')});
  $('#table-body').addEventListener('keydown',event => {
    if ((event.key==='Enter'||event.key===' ') && event.target.matches('[data-record]')) {
      event.preventDefault();openRecord(recordById(event.target.dataset.record));
    }
  });
  $('#menu-button').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#explore-button').addEventListener('click',()=>$('#archive').scrollIntoView({behavior:'smooth'}));
  $('#drawer-close').addEventListener('click',closeRecord);
  $('#drawer-backdrop').addEventListener('click',closeRecord);
  document.addEventListener('keydown',event => {
    if (event.key==='Escape') {closeRecord();$('#sidebar').classList.remove('open')}
    if (event.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {event.preventDefault();$('#search').focus()}
  });
  $('#search').addEventListener('input',event=>{query=event.target.value;page=1;renderTable()});
  $('#sort').addEventListener('change',event=>{sort=event.target.value;page=1;renderTable()});
  $('#contract-subtab').addEventListener('change',async event=>{
    contractTab=event.target.value;page=1;
    $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract annotation…</td></tr>';
    try {await load(contractTab);renderTable()}catch{showToast('Could not fetch contract annotation')}
  });
  $('#export-button').addEventListener('click',exportCsv);
  $('#prev-page').addEventListener('click',()=>{if(page>1){page--;renderTable()}});
  $('#next-page').addEventListener('click',()=>{if(page<Math.ceil(matched.length/PAGE_SIZE)){page++;renderTable()}});
  async function init() {
    const results=await Promise.allSettled(['contracts','coins','nfts','tcos'].map(load));
    if(results.every(r=>r.status==='rejected')){
      $('#table-body').innerHTML='<tr><td colspan="6" class="empty-state">Unable to load local datasets. Check the deployment files.</td></tr>';
      $('#result-count').textContent='Data unavailable';return;
    }
    setStats();renderTimeline();renderTable();
    const first=location.hash.replace('#','');
    if (labels[first]) await activate(first,false);
    if(results.some(r=>r.status==='rejected')) showToast('Some collections could not be loaded');
  }
  init();
})();+numberCompact(value):'Unavailable')+'</span></div>'+
        '<div class="detail-row"><label>Price</label><span>'+(t.pair.priceUsd!=null?'
    if (!item) return;
    selectedRecord=item;
    $('#drawer-number').textContent= item.category==='contracts' ? '#' + item.index : item.category.toUpperCase();
    const buttons=detailButton('https://etherscan.io/address/' + item.address,'ETHERSCAN') +
      detailButton(item.source,'SOURCE SHEET',true) +
      detailButton(item.fields['Website URL'],'WEBSITE',true) +
      detailButton(item.fields['Trade URL'],item.fields['Trade URL']?.includes('opensea.io')?'OPENSEA':'TRADE LINK',true) +
      detailButton((window.genesisMarkets?.nfts?.get(item.address.toLowerCase())?.openseaUrl || ''),'OPENSEA MARKET',true);
    $('#drawer-content').innerHTML =
      '<div class="drawer-kicker">' + escapeHtml(labels[item.category].toUpperCase()) + ' / HISTORICAL RECORD</div>' +
      '<h2 class="drawer-title">' + escapeHtml(item.name) + '</h2>' +
      '<p class="drawer-subtitle">' + escapeHtml(item.subtitle) + '</p>' +
      '<div class="drawer-action-row">' + buttons +
        '<button id="copy-address" class="drawer-action secondary" type="button">COPY ADDRESS ⧉</button></div>' +
      liveRecordStats(item) +
      '<div class="drawer-section-title">ORIGINAL RECORD DATA</div><div class="detail-list">' + detailRows(item) + '</div>' +
      (item.category==='contracts' ? '<div class="bytecode-controls"><button id="load-bytecode" class="bytecode-button" type="button">↘ VIEW ORIGINAL DEPLOYED BYTECODE (ON DEMAND)</button><div id="bytecode-container"></div></div>' : '') +
      '<p class="drawer-footnote">This is a historical research record. Always verify any contract through Etherscan and the linked primary spreadsheet. A listing does not imply the contract is active or safe to interact with.</p>';
    $('#drawer-backdrop').hidden=false;
    $('#record-drawer').hidden=false;
    document.body.style.overflow='hidden';
    $('#drawer-close').focus();
  }
  function closeRecord() {
    selectedRecord=null; $('#drawer-backdrop').hidden=true;$('#record-drawer').hidden=true;
    document.body.style.overflow='';
  }
  async function loadBytecode() {
    const item=selectedRecord;
    if (!item || !item.index) return;
    const i=ranges.findIndex(r=>item.index >= r[0] && item.index <= r[1]);
    const output=$('#bytecode-container');
    if (i<0) {output.textContent='Bytecode index unavailable. Open the original source sheet.';return}
    $('#load-bytecode').disabled=true;
    output.innerHTML='<div class="bytecode-output">Fetching archived bytecode…</div>';
    try {
      if (!bytecodeCache[i]) {
        const response=await fetch('/data/bytecode/' + String(i+1).padStart(2,'0') + '.json');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const obj=await response.json();
        bytecodeCache[i]=new Map(obj.rows.map(row=>[Number(row[0]),row[1]]));
      }
      if (selectedRecord !== item) return;
      const code=bytecodeCache[i].get(item.index) || '';
      output.innerHTML='<div class="bytecode-output">' + escapeHtml(code || 'No bytecode in source') + '</div>';
      $('#load-bytecode').textContent='ORIGINAL BYTECODE LOADED ✓';
    } catch(e) {
      output.innerHTML='<div class="bytecode-output">Could not load archived bytecode. Use the original spreadsheet source link instead.</div>';
      $('#load-bytecode').disabled=false;
    }
  }
  async function copyAddress() {
    if (!selectedRecord) return;
    try {
      await navigator.clipboard.writeText(selectedRecord.address);
      showToast('Contract address copied');
    } catch { showToast('Could not copy automatically'); }
  }

  document.addEventListener('click',event => {
    const nav=event.target.closest('[data-view]');
    if (nav) {activate(nav.dataset.view);return}
    const jump=event.target.closest('[data-jump]');
    if (jump) {activate(jump.dataset.jump);return}
    const tab=event.target.closest('[data-tab]');
    if (tab) {activate(tab.dataset.tab,false);return}
    const record=event.target.closest('[data-record]');
    if (record) {openRecord(recordById(record.dataset.record));return}
    if (event.target.closest('#copy-address')) {copyAddress();return}
    if (event.target.closest('#load-bytecode')) {loadBytecode();return}
  });
  $('#nav').addEventListener('keydown',event => { if (event.key==='Escape') $('#sidebar').classList.remove('open')});
  $('#table-body').addEventListener('keydown',event => {
    if ((event.key==='Enter'||event.key===' ') && event.target.matches('[data-record]')) {
      event.preventDefault();openRecord(recordById(event.target.dataset.record));
    }
  });
  $('#menu-button').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#explore-button').addEventListener('click',()=>$('#archive').scrollIntoView({behavior:'smooth'}));
  $('#drawer-close').addEventListener('click',closeRecord);
  $('#drawer-backdrop').addEventListener('click',closeRecord);
  document.addEventListener('keydown',event => {
    if (event.key==='Escape') {closeRecord();$('#sidebar').classList.remove('open')}
    if (event.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {event.preventDefault();$('#search').focus()}
  });
  $('#search').addEventListener('input',event=>{query=event.target.value;page=1;renderTable()});
  $('#sort').addEventListener('change',event=>{sort=event.target.value;page=1;renderTable()});
  $('#contract-subtab').addEventListener('change',async event=>{
    contractTab=event.target.value;page=1;
    $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract annotation…</td></tr>';
    try {await load(contractTab);renderTable()}catch{showToast('Could not fetch contract annotation')}
  });
  $('#export-button').addEventListener('click',exportCsv);
  $('#prev-page').addEventListener('click',()=>{if(page>1){page--;renderTable()}});
  $('#next-page').addEventListener('click',()=>{if(page<Math.ceil(matched.length/PAGE_SIZE)){page++;renderTable()}});
  async function init() {
    const results=await Promise.allSettled(['contracts','coins','nfts','tcos'].map(load));
    if(results.every(r=>r.status==='rejected')){
      $('#table-body').innerHTML='<tr><td colspan="6" class="empty-state">Unable to load local datasets. Check the deployment files.</td></tr>';
      $('#result-count').textContent='Data unavailable';return;
    }
    setStats();renderTimeline();renderTable();
    const first=location.hash.replace('#','');
    if (labels[first]) await activate(first,false);
    if(results.some(r=>r.status==='rejected')) showToast('Some collections could not be loaded');
  }
  init();
})();+numberCompact(n)+'</span>';
      }
    }
    if(item.category==='nfts'||item.category==='tcos') {
      const info=m.nfts?.get(item.address.toLowerCase());
      const floor=info?.market?.floorPrice;
      if(floor!=null && floor>0) return '<span class="market-stamp">FLOOR '+escapeHtml(floor)+' '+escapeHtml(info.market.floorCurrency)+'</span>';
    }
    return '';
  }
  function numberCompact(n) {
    const value=Number(n);
    if(value>=1e9)return (value/1e9).toFixed(2)+'B';
    if(value>=1e6)return (value/1e6).toFixed(2)+'M';
    if(value>=1e3)return (value/1e3).toFixed(1)+'K';
    return value.toLocaleString('en-US',{maximumFractionDigits:2});
  }
  function renderTable() {
    filterData();
    const pages = Math.max(1,Math.ceil(matched.length / PAGE_SIZE));
    page = Math.min(Math.max(1,page),pages);
    const start = (page - 1) * PAGE_SIZE;
    const chunk = matched.slice(start,start + PAGE_SIZE);
    $('#result-count').textContent = number(matched.length) + ' records found' + (query ? ' for "' + query.slice(0,65) + '"' : '');
    $('#page-summary').textContent = matched.length ? 'SHOWING ' + number(start + 1) + '–' + number(Math.min(start + PAGE_SIZE, matched.length)) + ' OF ' + number(matched.length) : 'NO MATCHING RECORDS';
    $('#page-indicator').textContent = page + ' / ' + pages;
    $('#prev-page').disabled = page <= 1;
    $('#next-page').disabled = page >= pages;
    const tbody = $('#table-body');
    if (!chunk.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No records matched. Try another address, project name, or keyword.</td></tr>';
      return;
    }
    tbody.innerHTML = chunk.map(item => '<tr tabindex="0" role="button" aria-label="Inspect ' + escapeHtml(item.name) + '" data-record="' + escapeHtml(item.id) + '">' +
      '<td><span class="table-item-name">' + escapeHtml(item.name) + '</span><span class="table-item-note">' + escapeHtml(item.subtitle) + '</span>' + marketStamp(item) + '</td>' +
      '<td><span class="mono-date">' + escapeHtml(humanDate(item.date)) + '</span></td>' +
      '<td>' + categoryBadge(item) + '</td>' +
      '<td>' + escapeHtml(item.limit.trim() || '—') + '</td>' +
      '<td><span class="mono-address">' + escapeHtml(shortAddress(item.address)) + '</span></td>' +
      '<td class="cell-more">↗</td></tr>').join('');
  }
  function setStats() {
    for (const key of ['contracts','coins','nfts','tcos']) {
      const count = number((cache[key] || []).length);
      for (const id of ['stat-' + key,'side-' + key,'tab-' + key]) {
        const node = document.getElementById(id);
        if (node) node.textContent = count;
      }
    }
    $('#tab-overview').textContent = number(['contracts','coins','nfts','tcos'].reduce((sum,key) => sum + (cache[key] || []).length,0));
  }
  function renderTimeline() {
    const contracts = cache.contracts || [];
    if (!contracts.length) { $('#timeline-bars').innerHTML='<div class="no-data">No archive data available</div>'; return; }
    const valid = contracts.filter(c => c.timestamp > 0);
    const earliest = Math.min(...valid.map(c => c.timestamp));
    const start = Math.floor(earliest / 86400000) * 86400000;
    const bins = Array.from({length:11}, (_,i) => ({date:new Date(start + i * 7 * 86400000),count:0}));
    valid.forEach(row => {
      const ix = Math.floor((row.timestamp - start) / (7 * 86400000));
      if (ix >= 0 && ix < bins.length) bins[ix].count++;
    });
    const max = Math.max(...bins.map(c => c.count),1);
    const end = new Date(Math.max(...valid.map(c=>c.timestamp)));
    $('#chart-range').textContent = new Date(start).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase() + ' – ' + end.toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase();
    $('#timeline-bars').innerHTML = bins.map((bin,i) => {
      const height = Math.max(4,Math.round(bin.count/max*91));
      return '<div class="timeline-col" title="' + escapeHtml(bin.date.toISOString().slice(0,10)) + ': ' + bin.count + ' contracts"><div class="timeline-bar" style="height:' + height + 'px"></div><span class="timeline-label">' + (i===0?'W1':i===bins.length-1?'W11':'·') + '</span></div>';
    }).join('');
  }
  async function activate(tab,scroll = true) {
    if (!labels[tab]) tab = 'overview';
    activeTab = tab; page = 1;
    $('#breadcrumb-label').textContent = tab.toUpperCase();
    $$('.nav-item').forEach(b => b.classList.toggle('active',b.dataset.view===tab));
    $$('.collection-tab').forEach(b => { const yes=b.dataset.tab===tab; b.classList.toggle('active',yes); b.setAttribute('aria-selected',String(yes)); });
    $('#contract-subtab').classList.toggle('hidden',tab !== 'contracts');
    $('#sidebar').classList.remove('open');
    if (tab === 'contracts' && !cache[contractTab]) {
      $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract classification…</td></tr>';
      try { await load(contractTab); } catch(e) { showToast('Could not load this annotation tab'); }
    }
    renderTable();
    try { history.replaceState(null,'','#' + tab); } catch {}
    if (scroll) (tab==='overview' ? $('#hero') : $('#archive')).scrollIntoView({behavior:'smooth',block:'start'});
  }
  function showToast(message) {
    const node = $('#toast'); node.textContent=message; node.classList.add('visible');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(()=>node.classList.remove('visible'),2900);
  }
  function csvValue(v) { return '"' + String(v??'').replace(/"/g,'""') + '"'; }
  function exportCsv() {
    const columns=['Collection','Name / Index','Date','Contract address','Classification','Limit','Notes','Trade URL','Website URL','Source sheet'];
    const lines=[columns, ...matched.map(r => [labels[r.category],r.name,r.date,r.address,r.kind,r.limit,r.fields.Notes || r.subtitle,r.fields['Trade URL'] || '',r.fields['Website URL'] || '',r.source])];
    const csv='\uFEFF' + lines.map(row=>row.map(csvValue).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url;a.download='genesis-atlas-' + activeTab + '-2026-10-22.csv';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast('Exported ' + number(matched.length) + ' records to CSV');
  }
  function recordById(id) {
    for (const list of Object.values(cache)) {
      const item=list.find(row=>row.id===id);
      if (item) return item;
    }
    return null;
  }
  function detailRows(item) {
    return Object.entries(item.fields)
      .filter(([key,val])=>!['Trade','Website','Trade URL','Website URL'].includes(key) && val && val !== '🔗')
      .map(([key,val])=>'<div class="detail-row"><label>' + escapeHtml(key) + '</label><span>' + escapeHtml(val) + '</span></div>').join('');
  }
  function detailButton(url,label,secondary=false) {
    const safe=safeUrl(url);
    return safe ? '<a class="drawer-action ' + (secondary?'secondary':'') + '" target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safe) + '">' + escapeHtml(label) + ' ↗</a>' : '';
  }
  function openRecord(item) {
    if (!item) return;
    selectedRecord=item;
    $('#drawer-number').textContent= item.category==='contracts' ? '#' + item.index : item.category.toUpperCase();
    const buttons=detailButton('https://etherscan.io/address/' + item.address,'ETHERSCAN') +
      detailButton(item.source,'SOURCE SHEET',true) +
      detailButton(item.fields['Website URL'],'WEBSITE',true) +
      detailButton(item.fields['Trade URL'],'TRADE LINK',true);
    $('#drawer-content').innerHTML =
      '<div class="drawer-kicker">' + escapeHtml(labels[item.category].toUpperCase()) + ' / HISTORICAL RECORD</div>' +
      '<h2 class="drawer-title">' + escapeHtml(item.name) + '</h2>' +
      '<p class="drawer-subtitle">' + escapeHtml(item.subtitle) + '</p>' +
      '<div class="drawer-action-row">' + buttons +
        '<button id="copy-address" class="drawer-action secondary" type="button">COPY ADDRESS ⧉</button></div>' +
      '<div class="drawer-section-title">ORIGINAL RECORD DATA</div><div class="detail-list">' + detailRows(item) + '</div>' +
      (item.category==='contracts' ? '<div class="bytecode-controls"><button id="load-bytecode" class="bytecode-button" type="button">↘ VIEW ORIGINAL DEPLOYED BYTECODE (ON DEMAND)</button><div id="bytecode-container"></div></div>' : '') +
      '<p class="drawer-footnote">This is a historical research record. Always verify any contract through Etherscan and the linked primary spreadsheet. A listing does not imply the contract is active or safe to interact with.</p>';
    $('#drawer-backdrop').hidden=false;
    $('#record-drawer').hidden=false;
    document.body.style.overflow='hidden';
    $('#drawer-close').focus();
  }
  function closeRecord() {
    selectedRecord=null; $('#drawer-backdrop').hidden=true;$('#record-drawer').hidden=true;
    document.body.style.overflow='';
  }
  async function loadBytecode() {
    const item=selectedRecord;
    if (!item || !item.index) return;
    const i=ranges.findIndex(r=>item.index >= r[0] && item.index <= r[1]);
    const output=$('#bytecode-container');
    if (i<0) {output.textContent='Bytecode index unavailable. Open the original source sheet.';return}
    $('#load-bytecode').disabled=true;
    output.innerHTML='<div class="bytecode-output">Fetching archived bytecode…</div>';
    try {
      if (!bytecodeCache[i]) {
        const response=await fetch('/data/bytecode/' + String(i+1).padStart(2,'0') + '.json');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const obj=await response.json();
        bytecodeCache[i]=new Map(obj.rows.map(row=>[Number(row[0]),row[1]]));
      }
      if (selectedRecord !== item) return;
      const code=bytecodeCache[i].get(item.index) || '';
      output.innerHTML='<div class="bytecode-output">' + escapeHtml(code || 'No bytecode in source') + '</div>';
      $('#load-bytecode').textContent='ORIGINAL BYTECODE LOADED ✓';
    } catch(e) {
      output.innerHTML='<div class="bytecode-output">Could not load archived bytecode. Use the original spreadsheet source link instead.</div>';
      $('#load-bytecode').disabled=false;
    }
  }
  async function copyAddress() {
    if (!selectedRecord) return;
    try {
      await navigator.clipboard.writeText(selectedRecord.address);
      showToast('Contract address copied');
    } catch { showToast('Could not copy automatically'); }
  }

  document.addEventListener('click',event => {
    const nav=event.target.closest('[data-view]');
    if (nav) {activate(nav.dataset.view);return}
    const jump=event.target.closest('[data-jump]');
    if (jump) {activate(jump.dataset.jump);return}
    const tab=event.target.closest('[data-tab]');
    if (tab) {activate(tab.dataset.tab,false);return}
    const record=event.target.closest('[data-record]');
    if (record) {openRecord(recordById(record.dataset.record));return}
    if (event.target.closest('#copy-address')) {copyAddress();return}
    if (event.target.closest('#load-bytecode')) {loadBytecode();return}
  });
  $('#nav').addEventListener('keydown',event => { if (event.key==='Escape') $('#sidebar').classList.remove('open')});
  $('#table-body').addEventListener('keydown',event => {
    if ((event.key==='Enter'||event.key===' ') && event.target.matches('[data-record]')) {
      event.preventDefault();openRecord(recordById(event.target.dataset.record));
    }
  });
  $('#menu-button').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#explore-button').addEventListener('click',()=>$('#archive').scrollIntoView({behavior:'smooth'}));
  $('#drawer-close').addEventListener('click',closeRecord);
  $('#drawer-backdrop').addEventListener('click',closeRecord);
  document.addEventListener('keydown',event => {
    if (event.key==='Escape') {closeRecord();$('#sidebar').classList.remove('open')}
    if (event.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {event.preventDefault();$('#search').focus()}
  });
  $('#search').addEventListener('input',event=>{query=event.target.value;page=1;renderTable()});
  $('#sort').addEventListener('change',event=>{sort=event.target.value;page=1;renderTable()});
  $('#contract-subtab').addEventListener('change',async event=>{
    contractTab=event.target.value;page=1;
    $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract annotation…</td></tr>';
    try {await load(contractTab);renderTable()}catch{showToast('Could not fetch contract annotation')}
  });
  $('#export-button').addEventListener('click',exportCsv);
  $('#prev-page').addEventListener('click',()=>{if(page>1){page--;renderTable()}});
  $('#next-page').addEventListener('click',()=>{if(page<Math.ceil(matched.length/PAGE_SIZE)){page++;renderTable()}});
  async function init() {
    const results=await Promise.allSettled(['contracts','coins','nfts','tcos'].map(load));
    if(results.every(r=>r.status==='rejected')){
      $('#table-body').innerHTML='<tr><td colspan="6" class="empty-state">Unable to load local datasets. Check the deployment files.</td></tr>';
      $('#result-count').textContent='Data unavailable';return;
    }
    setStats();renderTimeline();renderTable();
    const first=location.hash.replace('#','');
    if (labels[first]) await activate(first,false);
    if(results.some(r=>r.status==='rejected')) showToast('Some collections could not be loaded');
  }
  init();
})();+escapeHtml(t.pair.priceUsd):'Unavailable')+'</span></div>'+
        '<div class="detail-row"><label>24h volume</label><span>'+(t.pair.volume24h!=null?'
    if (!item) return;
    selectedRecord=item;
    $('#drawer-number').textContent= item.category==='contracts' ? '#' + item.index : item.category.toUpperCase();
    const buttons=detailButton('https://etherscan.io/address/' + item.address,'ETHERSCAN') +
      detailButton(item.source,'SOURCE SHEET',true) +
      detailButton(item.fields['Website URL'],'WEBSITE',true) +
      detailButton(item.fields['Trade URL'],item.fields['Trade URL']?.includes('opensea.io')?'OPENSEA':'TRADE LINK',true) +
      detailButton((window.genesisMarkets?.nfts?.get(item.address.toLowerCase())?.openseaUrl || ''),'OPENSEA MARKET',true);
    $('#drawer-content').innerHTML =
      '<div class="drawer-kicker">' + escapeHtml(labels[item.category].toUpperCase()) + ' / HISTORICAL RECORD</div>' +
      '<h2 class="drawer-title">' + escapeHtml(item.name) + '</h2>' +
      '<p class="drawer-subtitle">' + escapeHtml(item.subtitle) + '</p>' +
      '<div class="drawer-action-row">' + buttons +
        '<button id="copy-address" class="drawer-action secondary" type="button">COPY ADDRESS ⧉</button></div>' +
      liveRecordStats(item) +
      '<div class="drawer-section-title">ORIGINAL RECORD DATA</div><div class="detail-list">' + detailRows(item) + '</div>' +
      (item.category==='contracts' ? '<div class="bytecode-controls"><button id="load-bytecode" class="bytecode-button" type="button">↘ VIEW ORIGINAL DEPLOYED BYTECODE (ON DEMAND)</button><div id="bytecode-container"></div></div>' : '') +
      '<p class="drawer-footnote">This is a historical research record. Always verify any contract through Etherscan and the linked primary spreadsheet. A listing does not imply the contract is active or safe to interact with.</p>';
    $('#drawer-backdrop').hidden=false;
    $('#record-drawer').hidden=false;
    document.body.style.overflow='hidden';
    $('#drawer-close').focus();
  }
  function closeRecord() {
    selectedRecord=null; $('#drawer-backdrop').hidden=true;$('#record-drawer').hidden=true;
    document.body.style.overflow='';
  }
  async function loadBytecode() {
    const item=selectedRecord;
    if (!item || !item.index) return;
    const i=ranges.findIndex(r=>item.index >= r[0] && item.index <= r[1]);
    const output=$('#bytecode-container');
    if (i<0) {output.textContent='Bytecode index unavailable. Open the original source sheet.';return}
    $('#load-bytecode').disabled=true;
    output.innerHTML='<div class="bytecode-output">Fetching archived bytecode…</div>';
    try {
      if (!bytecodeCache[i]) {
        const response=await fetch('/data/bytecode/' + String(i+1).padStart(2,'0') + '.json');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const obj=await response.json();
        bytecodeCache[i]=new Map(obj.rows.map(row=>[Number(row[0]),row[1]]));
      }
      if (selectedRecord !== item) return;
      const code=bytecodeCache[i].get(item.index) || '';
      output.innerHTML='<div class="bytecode-output">' + escapeHtml(code || 'No bytecode in source') + '</div>';
      $('#load-bytecode').textContent='ORIGINAL BYTECODE LOADED ✓';
    } catch(e) {
      output.innerHTML='<div class="bytecode-output">Could not load archived bytecode. Use the original spreadsheet source link instead.</div>';
      $('#load-bytecode').disabled=false;
    }
  }
  async function copyAddress() {
    if (!selectedRecord) return;
    try {
      await navigator.clipboard.writeText(selectedRecord.address);
      showToast('Contract address copied');
    } catch { showToast('Could not copy automatically'); }
  }

  document.addEventListener('click',event => {
    const nav=event.target.closest('[data-view]');
    if (nav) {activate(nav.dataset.view);return}
    const jump=event.target.closest('[data-jump]');
    if (jump) {activate(jump.dataset.jump);return}
    const tab=event.target.closest('[data-tab]');
    if (tab) {activate(tab.dataset.tab,false);return}
    const record=event.target.closest('[data-record]');
    if (record) {openRecord(recordById(record.dataset.record));return}
    if (event.target.closest('#copy-address')) {copyAddress();return}
    if (event.target.closest('#load-bytecode')) {loadBytecode();return}
  });
  $('#nav').addEventListener('keydown',event => { if (event.key==='Escape') $('#sidebar').classList.remove('open')});
  $('#table-body').addEventListener('keydown',event => {
    if ((event.key==='Enter'||event.key===' ') && event.target.matches('[data-record]')) {
      event.preventDefault();openRecord(recordById(event.target.dataset.record));
    }
  });
  $('#menu-button').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#explore-button').addEventListener('click',()=>$('#archive').scrollIntoView({behavior:'smooth'}));
  $('#drawer-close').addEventListener('click',closeRecord);
  $('#drawer-backdrop').addEventListener('click',closeRecord);
  document.addEventListener('keydown',event => {
    if (event.key==='Escape') {closeRecord();$('#sidebar').classList.remove('open')}
    if (event.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {event.preventDefault();$('#search').focus()}
  });
  $('#search').addEventListener('input',event=>{query=event.target.value;page=1;renderTable()});
  $('#sort').addEventListener('change',event=>{sort=event.target.value;page=1;renderTable()});
  $('#contract-subtab').addEventListener('change',async event=>{
    contractTab=event.target.value;page=1;
    $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract annotation…</td></tr>';
    try {await load(contractTab);renderTable()}catch{showToast('Could not fetch contract annotation')}
  });
  $('#export-button').addEventListener('click',exportCsv);
  $('#prev-page').addEventListener('click',()=>{if(page>1){page--;renderTable()}});
  $('#next-page').addEventListener('click',()=>{if(page<Math.ceil(matched.length/PAGE_SIZE)){page++;renderTable()}});
  async function init() {
    const results=await Promise.allSettled(['contracts','coins','nfts','tcos'].map(load));
    if(results.every(r=>r.status==='rejected')){
      $('#table-body').innerHTML='<tr><td colspan="6" class="empty-state">Unable to load local datasets. Check the deployment files.</td></tr>';
      $('#result-count').textContent='Data unavailable';return;
    }
    setStats();renderTimeline();renderTable();
    const first=location.hash.replace('#','');
    if (labels[first]) await activate(first,false);
    if(results.some(r=>r.status==='rejected')) showToast('Some collections could not be loaded');
  }
  init();
})();+numberCompact(n)+'</span>';
      }
    }
    if(item.category==='nfts'||item.category==='tcos') {
      const info=m.nfts?.get(item.address.toLowerCase());
      const floor=info?.market?.floorPrice;
      if(floor!=null && floor>0) return '<span class="market-stamp">FLOOR '+escapeHtml(floor)+' '+escapeHtml(info.market.floorCurrency)+'</span>';
    }
    return '';
  }
  function numberCompact(n) {
    const value=Number(n);
    if(value>=1e9)return (value/1e9).toFixed(2)+'B';
    if(value>=1e6)return (value/1e6).toFixed(2)+'M';
    if(value>=1e3)return (value/1e3).toFixed(1)+'K';
    return value.toLocaleString('en-US',{maximumFractionDigits:2});
  }
  function renderTable() {
    filterData();
    const pages = Math.max(1,Math.ceil(matched.length / PAGE_SIZE));
    page = Math.min(Math.max(1,page),pages);
    const start = (page - 1) * PAGE_SIZE;
    const chunk = matched.slice(start,start + PAGE_SIZE);
    $('#result-count').textContent = number(matched.length) + ' records found' + (query ? ' for "' + query.slice(0,65) + '"' : '');
    $('#page-summary').textContent = matched.length ? 'SHOWING ' + number(start + 1) + '–' + number(Math.min(start + PAGE_SIZE, matched.length)) + ' OF ' + number(matched.length) : 'NO MATCHING RECORDS';
    $('#page-indicator').textContent = page + ' / ' + pages;
    $('#prev-page').disabled = page <= 1;
    $('#next-page').disabled = page >= pages;
    const tbody = $('#table-body');
    if (!chunk.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No records matched. Try another address, project name, or keyword.</td></tr>';
      return;
    }
    tbody.innerHTML = chunk.map(item => '<tr tabindex="0" role="button" aria-label="Inspect ' + escapeHtml(item.name) + '" data-record="' + escapeHtml(item.id) + '">' +
      '<td><span class="table-item-name">' + escapeHtml(item.name) + '</span><span class="table-item-note">' + escapeHtml(item.subtitle) + '</span>' + marketStamp(item) + '</td>' +
      '<td><span class="mono-date">' + escapeHtml(humanDate(item.date)) + '</span></td>' +
      '<td>' + categoryBadge(item) + '</td>' +
      '<td>' + escapeHtml(item.limit.trim() || '—') + '</td>' +
      '<td><span class="mono-address">' + escapeHtml(shortAddress(item.address)) + '</span></td>' +
      '<td class="cell-more">↗</td></tr>').join('');
  }
  function setStats() {
    for (const key of ['contracts','coins','nfts','tcos']) {
      const count = number((cache[key] || []).length);
      for (const id of ['stat-' + key,'side-' + key,'tab-' + key]) {
        const node = document.getElementById(id);
        if (node) node.textContent = count;
      }
    }
    $('#tab-overview').textContent = number(['contracts','coins','nfts','tcos'].reduce((sum,key) => sum + (cache[key] || []).length,0));
  }
  function renderTimeline() {
    const contracts = cache.contracts || [];
    if (!contracts.length) { $('#timeline-bars').innerHTML='<div class="no-data">No archive data available</div>'; return; }
    const valid = contracts.filter(c => c.timestamp > 0);
    const earliest = Math.min(...valid.map(c => c.timestamp));
    const start = Math.floor(earliest / 86400000) * 86400000;
    const bins = Array.from({length:11}, (_,i) => ({date:new Date(start + i * 7 * 86400000),count:0}));
    valid.forEach(row => {
      const ix = Math.floor((row.timestamp - start) / (7 * 86400000));
      if (ix >= 0 && ix < bins.length) bins[ix].count++;
    });
    const max = Math.max(...bins.map(c => c.count),1);
    const end = new Date(Math.max(...valid.map(c=>c.timestamp)));
    $('#chart-range').textContent = new Date(start).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase() + ' – ' + end.toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase();
    $('#timeline-bars').innerHTML = bins.map((bin,i) => {
      const height = Math.max(4,Math.round(bin.count/max*91));
      return '<div class="timeline-col" title="' + escapeHtml(bin.date.toISOString().slice(0,10)) + ': ' + bin.count + ' contracts"><div class="timeline-bar" style="height:' + height + 'px"></div><span class="timeline-label">' + (i===0?'W1':i===bins.length-1?'W11':'·') + '</span></div>';
    }).join('');
  }
  async function activate(tab,scroll = true) {
    if (!labels[tab]) tab = 'overview';
    activeTab = tab; page = 1;
    $('#breadcrumb-label').textContent = tab.toUpperCase();
    $$('.nav-item').forEach(b => b.classList.toggle('active',b.dataset.view===tab));
    $$('.collection-tab').forEach(b => { const yes=b.dataset.tab===tab; b.classList.toggle('active',yes); b.setAttribute('aria-selected',String(yes)); });
    $('#contract-subtab').classList.toggle('hidden',tab !== 'contracts');
    $('#sidebar').classList.remove('open');
    if (tab === 'contracts' && !cache[contractTab]) {
      $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract classification…</td></tr>';
      try { await load(contractTab); } catch(e) { showToast('Could not load this annotation tab'); }
    }
    renderTable();
    try { history.replaceState(null,'','#' + tab); } catch {}
    if (scroll) (tab==='overview' ? $('#hero') : $('#archive')).scrollIntoView({behavior:'smooth',block:'start'});
  }
  function showToast(message) {
    const node = $('#toast'); node.textContent=message; node.classList.add('visible');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(()=>node.classList.remove('visible'),2900);
  }
  function csvValue(v) { return '"' + String(v??'').replace(/"/g,'""') + '"'; }
  function exportCsv() {
    const columns=['Collection','Name / Index','Date','Contract address','Classification','Limit','Notes','Trade URL','Website URL','Source sheet'];
    const lines=[columns, ...matched.map(r => [labels[r.category],r.name,r.date,r.address,r.kind,r.limit,r.fields.Notes || r.subtitle,r.fields['Trade URL'] || '',r.fields['Website URL'] || '',r.source])];
    const csv='\uFEFF' + lines.map(row=>row.map(csvValue).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url;a.download='genesis-atlas-' + activeTab + '-2026-10-22.csv';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast('Exported ' + number(matched.length) + ' records to CSV');
  }
  function recordById(id) {
    for (const list of Object.values(cache)) {
      const item=list.find(row=>row.id===id);
      if (item) return item;
    }
    return null;
  }
  function detailRows(item) {
    return Object.entries(item.fields)
      .filter(([key,val])=>!['Trade','Website','Trade URL','Website URL'].includes(key) && val && val !== '🔗')
      .map(([key,val])=>'<div class="detail-row"><label>' + escapeHtml(key) + '</label><span>' + escapeHtml(val) + '</span></div>').join('');
  }
  function detailButton(url,label,secondary=false) {
    const safe=safeUrl(url);
    return safe ? '<a class="drawer-action ' + (secondary?'secondary':'') + '" target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safe) + '">' + escapeHtml(label) + ' ↗</a>' : '';
  }
  function openRecord(item) {
    if (!item) return;
    selectedRecord=item;
    $('#drawer-number').textContent= item.category==='contracts' ? '#' + item.index : item.category.toUpperCase();
    const buttons=detailButton('https://etherscan.io/address/' + item.address,'ETHERSCAN') +
      detailButton(item.source,'SOURCE SHEET',true) +
      detailButton(item.fields['Website URL'],'WEBSITE',true) +
      detailButton(item.fields['Trade URL'],'TRADE LINK',true);
    $('#drawer-content').innerHTML =
      '<div class="drawer-kicker">' + escapeHtml(labels[item.category].toUpperCase()) + ' / HISTORICAL RECORD</div>' +
      '<h2 class="drawer-title">' + escapeHtml(item.name) + '</h2>' +
      '<p class="drawer-subtitle">' + escapeHtml(item.subtitle) + '</p>' +
      '<div class="drawer-action-row">' + buttons +
        '<button id="copy-address" class="drawer-action secondary" type="button">COPY ADDRESS ⧉</button></div>' +
      '<div class="drawer-section-title">ORIGINAL RECORD DATA</div><div class="detail-list">' + detailRows(item) + '</div>' +
      (item.category==='contracts' ? '<div class="bytecode-controls"><button id="load-bytecode" class="bytecode-button" type="button">↘ VIEW ORIGINAL DEPLOYED BYTECODE (ON DEMAND)</button><div id="bytecode-container"></div></div>' : '') +
      '<p class="drawer-footnote">This is a historical research record. Always verify any contract through Etherscan and the linked primary spreadsheet. A listing does not imply the contract is active or safe to interact with.</p>';
    $('#drawer-backdrop').hidden=false;
    $('#record-drawer').hidden=false;
    document.body.style.overflow='hidden';
    $('#drawer-close').focus();
  }
  function closeRecord() {
    selectedRecord=null; $('#drawer-backdrop').hidden=true;$('#record-drawer').hidden=true;
    document.body.style.overflow='';
  }
  async function loadBytecode() {
    const item=selectedRecord;
    if (!item || !item.index) return;
    const i=ranges.findIndex(r=>item.index >= r[0] && item.index <= r[1]);
    const output=$('#bytecode-container');
    if (i<0) {output.textContent='Bytecode index unavailable. Open the original source sheet.';return}
    $('#load-bytecode').disabled=true;
    output.innerHTML='<div class="bytecode-output">Fetching archived bytecode…</div>';
    try {
      if (!bytecodeCache[i]) {
        const response=await fetch('/data/bytecode/' + String(i+1).padStart(2,'0') + '.json');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const obj=await response.json();
        bytecodeCache[i]=new Map(obj.rows.map(row=>[Number(row[0]),row[1]]));
      }
      if (selectedRecord !== item) return;
      const code=bytecodeCache[i].get(item.index) || '';
      output.innerHTML='<div class="bytecode-output">' + escapeHtml(code || 'No bytecode in source') + '</div>';
      $('#load-bytecode').textContent='ORIGINAL BYTECODE LOADED ✓';
    } catch(e) {
      output.innerHTML='<div class="bytecode-output">Could not load archived bytecode. Use the original spreadsheet source link instead.</div>';
      $('#load-bytecode').disabled=false;
    }
  }
  async function copyAddress() {
    if (!selectedRecord) return;
    try {
      await navigator.clipboard.writeText(selectedRecord.address);
      showToast('Contract address copied');
    } catch { showToast('Could not copy automatically'); }
  }

  document.addEventListener('click',event => {
    const nav=event.target.closest('[data-view]');
    if (nav) {activate(nav.dataset.view);return}
    const jump=event.target.closest('[data-jump]');
    if (jump) {activate(jump.dataset.jump);return}
    const tab=event.target.closest('[data-tab]');
    if (tab) {activate(tab.dataset.tab,false);return}
    const record=event.target.closest('[data-record]');
    if (record) {openRecord(recordById(record.dataset.record));return}
    if (event.target.closest('#copy-address')) {copyAddress();return}
    if (event.target.closest('#load-bytecode')) {loadBytecode();return}
  });
  $('#nav').addEventListener('keydown',event => { if (event.key==='Escape') $('#sidebar').classList.remove('open')});
  $('#table-body').addEventListener('keydown',event => {
    if ((event.key==='Enter'||event.key===' ') && event.target.matches('[data-record]')) {
      event.preventDefault();openRecord(recordById(event.target.dataset.record));
    }
  });
  $('#menu-button').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#explore-button').addEventListener('click',()=>$('#archive').scrollIntoView({behavior:'smooth'}));
  $('#drawer-close').addEventListener('click',closeRecord);
  $('#drawer-backdrop').addEventListener('click',closeRecord);
  document.addEventListener('keydown',event => {
    if (event.key==='Escape') {closeRecord();$('#sidebar').classList.remove('open')}
    if (event.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {event.preventDefault();$('#search').focus()}
  });
  $('#search').addEventListener('input',event=>{query=event.target.value;page=1;renderTable()});
  $('#sort').addEventListener('change',event=>{sort=event.target.value;page=1;renderTable()});
  $('#contract-subtab').addEventListener('change',async event=>{
    contractTab=event.target.value;page=1;
    $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract annotation…</td></tr>';
    try {await load(contractTab);renderTable()}catch{showToast('Could not fetch contract annotation')}
  });
  $('#export-button').addEventListener('click',exportCsv);
  $('#prev-page').addEventListener('click',()=>{if(page>1){page--;renderTable()}});
  $('#next-page').addEventListener('click',()=>{if(page<Math.ceil(matched.length/PAGE_SIZE)){page++;renderTable()}});
  async function init() {
    const results=await Promise.allSettled(['contracts','coins','nfts','tcos'].map(load));
    if(results.every(r=>r.status==='rejected')){
      $('#table-body').innerHTML='<tr><td colspan="6" class="empty-state">Unable to load local datasets. Check the deployment files.</td></tr>';
      $('#result-count').textContent='Data unavailable';return;
    }
    setStats();renderTimeline();renderTable();
    const first=location.hash.replace('#','');
    if (labels[first]) await activate(first,false);
    if(results.some(r=>r.status==='rejected')) showToast('Some collections could not be loaded');
  }
  init();
})();+numberCompact(t.pair.volume24h):'Unavailable')+'</span></div></div>';
    }
    if(n?.market) return '<div class="drawer-section-title">OPENSEA · LIVE SNAPSHOT</div><div class="detail-list">'+
      '<div class="detail-row"><label>Floor</label><span>'+(n.market.floorPrice!=null?escapeHtml(n.market.floorPrice+' '+n.market.floorCurrency):'Unavailable')+'</span></div>'+
      '<div class="detail-row"><label>24h volume</label><span>'+(n.market.volume24h!=null?escapeHtml(n.market.volume24h+' '+n.market.volumeCurrency):'Unavailable')+'</span></div></div>';
    return '';
  }
  function openRecord(item) {
    if (!item) return;
    selectedRecord=item;
    $('#drawer-number').textContent= item.category==='contracts' ? '#' + item.index : item.category.toUpperCase();
    const buttons=detailButton('https://etherscan.io/address/' + item.address,'ETHERSCAN') +
      detailButton(item.source,'SOURCE SHEET',true) +
      detailButton(item.fields['Website URL'],'WEBSITE',true) +
      detailButton(item.fields['Trade URL'],item.fields['Trade URL']?.includes('opensea.io')?'OPENSEA':'TRADE LINK',true) +
      detailButton((window.genesisMarkets?.nfts?.get(item.address.toLowerCase())?.openseaUrl || ''),'OPENSEA MARKET',true);
    $('#drawer-content').innerHTML =
      '<div class="drawer-kicker">' + escapeHtml(labels[item.category].toUpperCase()) + ' / HISTORICAL RECORD</div>' +
      '<h2 class="drawer-title">' + escapeHtml(item.name) + '</h2>' +
      '<p class="drawer-subtitle">' + escapeHtml(item.subtitle) + '</p>' +
      '<div class="drawer-action-row">' + buttons +
        '<button id="copy-address" class="drawer-action secondary" type="button">COPY ADDRESS ⧉</button></div>' +
      liveRecordStats(item) +
      '<div class="drawer-section-title">ORIGINAL RECORD DATA</div><div class="detail-list">' + detailRows(item) + '</div>' +
      (item.category==='contracts' ? '<div class="bytecode-controls"><button id="load-bytecode" class="bytecode-button" type="button">↘ VIEW ORIGINAL DEPLOYED BYTECODE (ON DEMAND)</button><div id="bytecode-container"></div></div>' : '') +
      '<p class="drawer-footnote">This is a historical research record. Always verify any contract through Etherscan and the linked primary spreadsheet. A listing does not imply the contract is active or safe to interact with.</p>';
    $('#drawer-backdrop').hidden=false;
    $('#record-drawer').hidden=false;
    document.body.style.overflow='hidden';
    $('#drawer-close').focus();
  }
  function closeRecord() {
    selectedRecord=null; $('#drawer-backdrop').hidden=true;$('#record-drawer').hidden=true;
    document.body.style.overflow='';
  }
  async function loadBytecode() {
    const item=selectedRecord;
    if (!item || !item.index) return;
    const i=ranges.findIndex(r=>item.index >= r[0] && item.index <= r[1]);
    const output=$('#bytecode-container');
    if (i<0) {output.textContent='Bytecode index unavailable. Open the original source sheet.';return}
    $('#load-bytecode').disabled=true;
    output.innerHTML='<div class="bytecode-output">Fetching archived bytecode…</div>';
    try {
      if (!bytecodeCache[i]) {
        const response=await fetch('/data/bytecode/' + String(i+1).padStart(2,'0') + '.json');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const obj=await response.json();
        bytecodeCache[i]=new Map(obj.rows.map(row=>[Number(row[0]),row[1]]));
      }
      if (selectedRecord !== item) return;
      const code=bytecodeCache[i].get(item.index) || '';
      output.innerHTML='<div class="bytecode-output">' + escapeHtml(code || 'No bytecode in source') + '</div>';
      $('#load-bytecode').textContent='ORIGINAL BYTECODE LOADED ✓';
    } catch(e) {
      output.innerHTML='<div class="bytecode-output">Could not load archived bytecode. Use the original spreadsheet source link instead.</div>';
      $('#load-bytecode').disabled=false;
    }
  }
  async function copyAddress() {
    if (!selectedRecord) return;
    try {
      await navigator.clipboard.writeText(selectedRecord.address);
      showToast('Contract address copied');
    } catch { showToast('Could not copy automatically'); }
  }

  document.addEventListener('click',event => {
    const nav=event.target.closest('[data-view]');
    if (nav) {activate(nav.dataset.view);return}
    const jump=event.target.closest('[data-jump]');
    if (jump) {activate(jump.dataset.jump);return}
    const tab=event.target.closest('[data-tab]');
    if (tab) {activate(tab.dataset.tab,false);return}
    const record=event.target.closest('[data-record]');
    if (record) {openRecord(recordById(record.dataset.record));return}
    if (event.target.closest('#copy-address')) {copyAddress();return}
    if (event.target.closest('#load-bytecode')) {loadBytecode();return}
  });
  $('#nav').addEventListener('keydown',event => { if (event.key==='Escape') $('#sidebar').classList.remove('open')});
  $('#table-body').addEventListener('keydown',event => {
    if ((event.key==='Enter'||event.key===' ') && event.target.matches('[data-record]')) {
      event.preventDefault();openRecord(recordById(event.target.dataset.record));
    }
  });
  $('#menu-button').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#explore-button').addEventListener('click',()=>$('#archive').scrollIntoView({behavior:'smooth'}));
  $('#drawer-close').addEventListener('click',closeRecord);
  $('#drawer-backdrop').addEventListener('click',closeRecord);
  document.addEventListener('keydown',event => {
    if (event.key==='Escape') {closeRecord();$('#sidebar').classList.remove('open')}
    if (event.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {event.preventDefault();$('#search').focus()}
  });
  $('#search').addEventListener('input',event=>{query=event.target.value;page=1;renderTable()});
  $('#sort').addEventListener('change',event=>{sort=event.target.value;page=1;renderTable()});
  $('#contract-subtab').addEventListener('change',async event=>{
    contractTab=event.target.value;page=1;
    $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract annotation…</td></tr>';
    try {await load(contractTab);renderTable()}catch{showToast('Could not fetch contract annotation')}
  });
  $('#export-button').addEventListener('click',exportCsv);
  $('#prev-page').addEventListener('click',()=>{if(page>1){page--;renderTable()}});
  $('#next-page').addEventListener('click',()=>{if(page<Math.ceil(matched.length/PAGE_SIZE)){page++;renderTable()}});
  async function init() {
    const results=await Promise.allSettled(['contracts','coins','nfts','tcos'].map(load));
    if(results.every(r=>r.status==='rejected')){
      $('#table-body').innerHTML='<tr><td colspan="6" class="empty-state">Unable to load local datasets. Check the deployment files.</td></tr>';
      $('#result-count').textContent='Data unavailable';return;
    }
    setStats();renderTimeline();renderTable();
    const first=location.hash.replace('#','');
    if (labels[first]) await activate(first,false);
    if(results.some(r=>r.status==='rejected')) showToast('Some collections could not be loaded');
  }
  init();
})();+numberCompact(n)+'</span>';
      }
    }
    if(item.category==='nfts'||item.category==='tcos') {
      const info=m.nfts?.get(item.address.toLowerCase());
      const floor=info?.market?.floorPrice;
      if(floor!=null && floor>0) return '<span class="market-stamp">FLOOR '+escapeHtml(floor)+' '+escapeHtml(info.market.floorCurrency)+'</span>';
    }
    return '';
  }
  function numberCompact(n) {
    const value=Number(n);
    if(value>=1e9)return (value/1e9).toFixed(2)+'B';
    if(value>=1e6)return (value/1e6).toFixed(2)+'M';
    if(value>=1e3)return (value/1e3).toFixed(1)+'K';
    return value.toLocaleString('en-US',{maximumFractionDigits:2});
  }
  function renderTable() {
    filterData();
    const pages = Math.max(1,Math.ceil(matched.length / PAGE_SIZE));
    page = Math.min(Math.max(1,page),pages);
    const start = (page - 1) * PAGE_SIZE;
    const chunk = matched.slice(start,start + PAGE_SIZE);
    $('#result-count').textContent = number(matched.length) + ' records found' + (query ? ' for "' + query.slice(0,65) + '"' : '');
    $('#page-summary').textContent = matched.length ? 'SHOWING ' + number(start + 1) + '–' + number(Math.min(start + PAGE_SIZE, matched.length)) + ' OF ' + number(matched.length) : 'NO MATCHING RECORDS';
    $('#page-indicator').textContent = page + ' / ' + pages;
    $('#prev-page').disabled = page <= 1;
    $('#next-page').disabled = page >= pages;
    const tbody = $('#table-body');
    if (!chunk.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No records matched. Try another address, project name, or keyword.</td></tr>';
      return;
    }
    tbody.innerHTML = chunk.map(item => '<tr tabindex="0" role="button" aria-label="Inspect ' + escapeHtml(item.name) + '" data-record="' + escapeHtml(item.id) + '">' +
      '<td><span class="table-item-name">' + escapeHtml(item.name) + '</span><span class="table-item-note">' + escapeHtml(item.subtitle) + '</span>' + marketStamp(item) + '</td>' +
      '<td><span class="mono-date">' + escapeHtml(humanDate(item.date)) + '</span></td>' +
      '<td>' + categoryBadge(item) + '</td>' +
      '<td>' + escapeHtml(item.limit.trim() || '—') + '</td>' +
      '<td><span class="mono-address">' + escapeHtml(shortAddress(item.address)) + '</span></td>' +
      '<td class="cell-more">↗</td></tr>').join('');
  }
  function setStats() {
    for (const key of ['contracts','coins','nfts','tcos']) {
      const count = number((cache[key] || []).length);
      for (const id of ['stat-' + key,'side-' + key,'tab-' + key]) {
        const node = document.getElementById(id);
        if (node) node.textContent = count;
      }
    }
    $('#tab-overview').textContent = number(['contracts','coins','nfts','tcos'].reduce((sum,key) => sum + (cache[key] || []).length,0));
  }
  function renderTimeline() {
    const contracts = cache.contracts || [];
    if (!contracts.length) { $('#timeline-bars').innerHTML='<div class="no-data">No archive data available</div>'; return; }
    const valid = contracts.filter(c => c.timestamp > 0);
    const earliest = Math.min(...valid.map(c => c.timestamp));
    const start = Math.floor(earliest / 86400000) * 86400000;
    const bins = Array.from({length:11}, (_,i) => ({date:new Date(start + i * 7 * 86400000),count:0}));
    valid.forEach(row => {
      const ix = Math.floor((row.timestamp - start) / (7 * 86400000));
      if (ix >= 0 && ix < bins.length) bins[ix].count++;
    });
    const max = Math.max(...bins.map(c => c.count),1);
    const end = new Date(Math.max(...valid.map(c=>c.timestamp)));
    $('#chart-range').textContent = new Date(start).toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase() + ' – ' + end.toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase();
    $('#timeline-bars').innerHTML = bins.map((bin,i) => {
      const height = Math.max(4,Math.round(bin.count/max*91));
      return '<div class="timeline-col" title="' + escapeHtml(bin.date.toISOString().slice(0,10)) + ': ' + bin.count + ' contracts"><div class="timeline-bar" style="height:' + height + 'px"></div><span class="timeline-label">' + (i===0?'W1':i===bins.length-1?'W11':'·') + '</span></div>';
    }).join('');
  }
  async function activate(tab,scroll = true) {
    if (!labels[tab]) tab = 'overview';
    activeTab = tab; page = 1;
    $('#breadcrumb-label').textContent = tab.toUpperCase();
    $$('.nav-item').forEach(b => b.classList.toggle('active',b.dataset.view===tab));
    $$('.collection-tab').forEach(b => { const yes=b.dataset.tab===tab; b.classList.toggle('active',yes); b.setAttribute('aria-selected',String(yes)); });
    $('#contract-subtab').classList.toggle('hidden',tab !== 'contracts');
    $('#sidebar').classList.remove('open');
    if (tab === 'contracts' && !cache[contractTab]) {
      $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract classification…</td></tr>';
      try { await load(contractTab); } catch(e) { showToast('Could not load this annotation tab'); }
    }
    renderTable();
    try { history.replaceState(null,'','#' + tab); } catch {}
    if (scroll) (tab==='overview' ? $('#hero') : $('#archive')).scrollIntoView({behavior:'smooth',block:'start'});
  }
  function showToast(message) {
    const node = $('#toast'); node.textContent=message; node.classList.add('visible');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(()=>node.classList.remove('visible'),2900);
  }
  function csvValue(v) { return '"' + String(v??'').replace(/"/g,'""') + '"'; }
  function exportCsv() {
    const columns=['Collection','Name / Index','Date','Contract address','Classification','Limit','Notes','Trade URL','Website URL','Source sheet'];
    const lines=[columns, ...matched.map(r => [labels[r.category],r.name,r.date,r.address,r.kind,r.limit,r.fields.Notes || r.subtitle,r.fields['Trade URL'] || '',r.fields['Website URL'] || '',r.source])];
    const csv='\uFEFF' + lines.map(row=>row.map(csvValue).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url;a.download='genesis-atlas-' + activeTab + '-2026-10-22.csv';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast('Exported ' + number(matched.length) + ' records to CSV');
  }
  function recordById(id) {
    for (const list of Object.values(cache)) {
      const item=list.find(row=>row.id===id);
      if (item) return item;
    }
    return null;
  }
  function detailRows(item) {
    return Object.entries(item.fields)
      .filter(([key,val])=>!['Trade','Website','Trade URL','Website URL'].includes(key) && val && val !== '🔗')
      .map(([key,val])=>'<div class="detail-row"><label>' + escapeHtml(key) + '</label><span>' + escapeHtml(val) + '</span></div>').join('');
  }
  function detailButton(url,label,secondary=false) {
    const safe=safeUrl(url);
    return safe ? '<a class="drawer-action ' + (secondary?'secondary':'') + '" target="_blank" rel="noopener noreferrer" href="' + escapeHtml(safe) + '">' + escapeHtml(label) + ' ↗</a>' : '';
  }
  function openRecord(item) {
    if (!item) return;
    selectedRecord=item;
    $('#drawer-number').textContent= item.category==='contracts' ? '#' + item.index : item.category.toUpperCase();
    const buttons=detailButton('https://etherscan.io/address/' + item.address,'ETHERSCAN') +
      detailButton(item.source,'SOURCE SHEET',true) +
      detailButton(item.fields['Website URL'],'WEBSITE',true) +
      detailButton(item.fields['Trade URL'],'TRADE LINK',true);
    $('#drawer-content').innerHTML =
      '<div class="drawer-kicker">' + escapeHtml(labels[item.category].toUpperCase()) + ' / HISTORICAL RECORD</div>' +
      '<h2 class="drawer-title">' + escapeHtml(item.name) + '</h2>' +
      '<p class="drawer-subtitle">' + escapeHtml(item.subtitle) + '</p>' +
      '<div class="drawer-action-row">' + buttons +
        '<button id="copy-address" class="drawer-action secondary" type="button">COPY ADDRESS ⧉</button></div>' +
      '<div class="drawer-section-title">ORIGINAL RECORD DATA</div><div class="detail-list">' + detailRows(item) + '</div>' +
      (item.category==='contracts' ? '<div class="bytecode-controls"><button id="load-bytecode" class="bytecode-button" type="button">↘ VIEW ORIGINAL DEPLOYED BYTECODE (ON DEMAND)</button><div id="bytecode-container"></div></div>' : '') +
      '<p class="drawer-footnote">This is a historical research record. Always verify any contract through Etherscan and the linked primary spreadsheet. A listing does not imply the contract is active or safe to interact with.</p>';
    $('#drawer-backdrop').hidden=false;
    $('#record-drawer').hidden=false;
    document.body.style.overflow='hidden';
    $('#drawer-close').focus();
  }
  function closeRecord() {
    selectedRecord=null; $('#drawer-backdrop').hidden=true;$('#record-drawer').hidden=true;
    document.body.style.overflow='';
  }
  async function loadBytecode() {
    const item=selectedRecord;
    if (!item || !item.index) return;
    const i=ranges.findIndex(r=>item.index >= r[0] && item.index <= r[1]);
    const output=$('#bytecode-container');
    if (i<0) {output.textContent='Bytecode index unavailable. Open the original source sheet.';return}
    $('#load-bytecode').disabled=true;
    output.innerHTML='<div class="bytecode-output">Fetching archived bytecode…</div>';
    try {
      if (!bytecodeCache[i]) {
        const response=await fetch('/data/bytecode/' + String(i+1).padStart(2,'0') + '.json');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const obj=await response.json();
        bytecodeCache[i]=new Map(obj.rows.map(row=>[Number(row[0]),row[1]]));
      }
      if (selectedRecord !== item) return;
      const code=bytecodeCache[i].get(item.index) || '';
      output.innerHTML='<div class="bytecode-output">' + escapeHtml(code || 'No bytecode in source') + '</div>';
      $('#load-bytecode').textContent='ORIGINAL BYTECODE LOADED ✓';
    } catch(e) {
      output.innerHTML='<div class="bytecode-output">Could not load archived bytecode. Use the original spreadsheet source link instead.</div>';
      $('#load-bytecode').disabled=false;
    }
  }
  async function copyAddress() {
    if (!selectedRecord) return;
    try {
      await navigator.clipboard.writeText(selectedRecord.address);
      showToast('Contract address copied');
    } catch { showToast('Could not copy automatically'); }
  }

  document.addEventListener('click',event => {
    const nav=event.target.closest('[data-view]');
    if (nav) {activate(nav.dataset.view);return}
    const jump=event.target.closest('[data-jump]');
    if (jump) {activate(jump.dataset.jump);return}
    const tab=event.target.closest('[data-tab]');
    if (tab) {activate(tab.dataset.tab,false);return}
    const record=event.target.closest('[data-record]');
    if (record) {openRecord(recordById(record.dataset.record));return}
    if (event.target.closest('#copy-address')) {copyAddress();return}
    if (event.target.closest('#load-bytecode')) {loadBytecode();return}
  });
  $('#nav').addEventListener('keydown',event => { if (event.key==='Escape') $('#sidebar').classList.remove('open')});
  $('#table-body').addEventListener('keydown',event => {
    if ((event.key==='Enter'||event.key===' ') && event.target.matches('[data-record]')) {
      event.preventDefault();openRecord(recordById(event.target.dataset.record));
    }
  });
  $('#menu-button').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#explore-button').addEventListener('click',()=>$('#archive').scrollIntoView({behavior:'smooth'}));
  $('#drawer-close').addEventListener('click',closeRecord);
  $('#drawer-backdrop').addEventListener('click',closeRecord);
  document.addEventListener('keydown',event => {
    if (event.key==='Escape') {closeRecord();$('#sidebar').classList.remove('open')}
    if (event.key==='/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {event.preventDefault();$('#search').focus()}
  });
  $('#search').addEventListener('input',event=>{query=event.target.value;page=1;renderTable()});
  $('#sort').addEventListener('change',event=>{sort=event.target.value;page=1;renderTable()});
  $('#contract-subtab').addEventListener('change',async event=>{
    contractTab=event.target.value;page=1;
    $('#table-body').innerHTML='<tr><td colspan="6" class="table-loading">Loading contract annotation…</td></tr>';
    try {await load(contractTab);renderTable()}catch{showToast('Could not fetch contract annotation')}
  });
  $('#export-button').addEventListener('click',exportCsv);
  $('#prev-page').addEventListener('click',()=>{if(page>1){page--;renderTable()}});
  $('#next-page').addEventListener('click',()=>{if(page<Math.ceil(matched.length/PAGE_SIZE)){page++;renderTable()}});
  async function init() {
    const results=await Promise.allSettled(['contracts','coins','nfts','tcos'].map(load));
    if(results.every(r=>r.status==='rejected')){
      $('#table-body').innerHTML='<tr><td colspan="6" class="empty-state">Unable to load local datasets. Check the deployment files.</td></tr>';
      $('#result-count').textContent='Data unavailable';return;
    }
    setStats();renderTimeline();renderTable();
    const first=location.hash.replace('#','');
    if (labels[first]) await activate(first,false);
    if(results.some(r=>r.status==='rejected')) showToast('Some collections could not be loaded');
  }
  init();
})();