import { stat, modified, ranges, freshState, itemMultiplier } from './speed.js';
import { TYPES, MEGA_DEBUTS, filterPokemon, freshFilters, toggleTypeOrMono } from './filters.js';
import { loadTeam, saveTeam, sanitizeTeam } from './team.js';
import { typeIcon } from './type-icons.js';
import { parsePokepaste, pokepastePageUrl, pokepasteHtmlToText } from './pokepaste.js';
const $ = s => document.querySelector(s);
let data;
try { const response = await fetch('./data/pokemon.json'); if (!response.ok) throw Error(); data = await response.json(); }
catch { $('#results').textContent = '資料載入失敗，請重新啟動程式或本機伺服器。'; throw Error('Cannot load roster data'); }
let filters = freshFilters(), own = freshState(), opponent = freshState(), target = data.find(p => p.id === 'froslass'), team = loadTeam(data), draft = [];
let selectedTeamIndex = 0;
let trickRoom = false;
let teamTypeFilters = freshFilters();
const signed = n => n >= 0 ? `+${n}` : n;
const genderSymbol = p => p.gender === 'male' ? '♂' : p.gender === 'female' ? '♀' : '';
const displayName = p => `${p.name}${genderSymbol(p) ? ' '+genderSymbol(p) : ''}`;
const svgName = p => `${p.name}${p.gender ? ` <tspan class="gender-${p.gender}">${genderSymbol(p)}</tspan>` : ''}`;
const itemImage = item => item === 'scarf' ? './assets/choice-scarf.png' : item === 'iron-ball' ? './assets/black-iron-ball.png' : '';
const itemLabel = item => item === 'scarf' ? '講究圍巾' : item === 'iron-ball' ? '黑色鐵球' : '';
function controls(container, state, label) {
  const isOwn = container === '#own-controls', selected = isOwn ? team[selectedTeamIndex] : null;
  const current = isOwn ? {tailwind:own.tailwind,abilitySpeedBoost:selected?.abilitySpeedBoost ?? false,paralyzed:selected?.paralyzed ?? false,stage:selected?.stage ?? 0} : state;
  const selectedName = selected ? displayName(data.find(p=>p.id===selected.id)) : '';
  $(container).innerHTML = `<div class="control-title">${label}${selectedName?' · '+selectedName:''}<button class="text-button" data-reset>重置速度</button></div><div class="toggles"><button data-toggle="tailwind" aria-pressed="${current.tailwind}">順風 <b>×2</b></button><button data-toggle="abilitySpeedBoost" aria-pressed="${current.abilitySpeedBoost}" ${isOwn&&!selected?'disabled':''}>特性加速 <b>×2</b></button><button data-toggle="paralyzed" aria-pressed="${current.paralyzed}" ${isOwn&&!selected?'disabled':''}>麻痺 <b>×½</b></button></div><div class="stage-heading"><span>速度階級${selectedName?' · '+selectedName:''}</span><strong>${signed(current.stage)}</strong></div><div class="stage-adjust"><div class="stage-ruler"><input data-stage-range type="range" min="-6" max="6" step="1" value="${current.stage}" aria-label="${label}速度階級滑桿" ${isOwn&&!selected?'disabled':''}><div class="ruler-marks" aria-label="速度階級刻度">${Array.from({length:13},(_,i)=>i-6).map(s=>`<button type="button" class="ruler-mark" data-stage-tick="${s}" aria-label="設定速度階級 ${signed(s)}" aria-current="${current.stage===s?'step':'false'}" ${isOwn&&!selected?'disabled':''}><span></span><small>${signed(s)}</small></button>`).join('')}</div></div><input data-stage-number type="number" min="-6" max="6" step="1" value="${current.stage}" aria-label="${label}速度階級數字" ${isOwn&&!selected?'disabled':''}></div>`;
  $(container).onclick = e => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.stageTick !== undefined) {if(isOwn) selected.stage=+b.dataset.stageTick;else state.stage=+b.dataset.stageTick;}
    else if (b.hasAttribute('data-reset')) {if(isOwn){own.tailwind=false;team.forEach(t=>{t.abilitySpeedBoost=false;t.paralyzed=false;t.stage=0;});}else Object.assign(state, freshState());}
    else if (b.dataset.toggle) {if(isOwn && b.dataset.toggle==='tailwind') own.tailwind=!own.tailwind;else if(isOwn) selected[b.dataset.toggle]=!selected[b.dataset.toggle];else state[b.dataset.toggle]=!state[b.dataset.toggle];}
    if(isOwn) saveTeam(team);
    renderComparison(); };
  $(container).oninput = e => { if (!e.target.matches('[data-stage-range]')) return; const value=+e.target.value; $(container).querySelector('[data-stage-number]').value=value; $(container).querySelector('.stage-heading strong').textContent=signed(value); $(container).querySelectorAll('.ruler-mark').forEach(mark=>mark.setAttribute('aria-current',+mark.dataset.stageTick===value?'step':'false')); };
  $(container).onchange = e => { if (!e.target.matches('[data-stage-range],[data-stage-number]')) return; const value=+e.target.value; if(!Number.isInteger(value)||value < -6||value > 6){renderComparison();return;}if(isOwn){selected.stage=value;saveTeam(team);}else state.stage=value;renderComparison();};
}
function ownMarkerMarkup(p, range, y) {
  const tickY = y(p.value);
  const effects = [p.abilitySpeedBoost ? '特×2' : '', p.paralyzed ? '麻痺×½' : '', p.stage ? signed(p.stage) : ''].filter(Boolean);
  const badge = (x, label, dy) => `<g class="speed-status"><circle cx="${x}" cy="${p.markerY+18}" r="14"/><text x="${x}" y="${p.markerY+dy}" text-anchor="middle">${label}</text></g>`;
  const abilityBadge = p.abilitySpeedBoost ? badge(p.markerX-27, '特×2', 21) : '';
  const stageBadge = p.stage ? badge(p.markerX+27, signed(p.stage), 22) : '';
  const overlap = p.value >= range.min && p.value <= range.max ? ' overlap' : '';
  const item = itemImage(p.item);
  return `<g class="own-marker ${selectedTeamIndex===p.index?'selected':''}" data-team-select="${p.index}" role="button" tabindex="0" aria-label="選擇隊伍第 ${p.index+1} 隻 ${displayName(p)}，速度 ${p.value}${effects.length?'，'+effects.join(' '):''}${item?'，'+itemLabel(p.item):''}"><path d="M120 ${p.markerY+51} H218 L255 ${tickY} H277" class="own-connector"/><path d="M277 ${tickY} H310" class="own-axis-tick${overlap}"/><circle cx="${p.markerX}" cy="${p.markerY}" r="29" class="own-dot"/><clipPath id="own-clip-${p.index}"><circle cx="${p.markerX}" cy="${p.markerY}" r="27"/></clipPath><image href="${p.image}" x="${p.markerX-26}" y="${p.markerY-26}" width="52" height="52" clip-path="url(#own-clip-${p.index})" transform="translate(${p.markerX*2} 0) scale(-1 1)"/><circle cx="${p.markerX}" cy="${p.markerY}" r="29" class="own-ring"/><title>${displayName(p)}：${p.value}，點擊調整速度</title>${abilityBadge}${stageBadge}${item?`<image class="own-item-icon" href="${item}" x="0" y="0" width="16" height="16"><title>${itemLabel(p.item)}</title></image>`:''}<text x="${p.markerX}" y="${p.markerY+43}" text-anchor="middle" class="own-label">${svgName(p)} ${p.value}</text></g>`;
}
function targetLabelMarkup(p, y) {
  const icon = p.label.includes('圍巾') ? itemImage('scarf') : p.label.includes('黑色鐵球') ? itemImage('iron-ball') : '';
  return `<path d="M279 ${y(p.value)} H330 L340 ${p.labelY+11} H450" class="target-line"/><text x="348" y="${p.labelY+4}" class="target-label">${p.value} <tspan class="label-small">${p.label}</tspan></text>${icon?`<image class="target-item-icon" href="${icon}" x="348" y="${p.labelY-12}" width="20" height="20"><title>${p.label}</title></image>`:''}`;
}
function windMarkup(side) {
  const curls = [
    '<path d="M39 22 C62 31 72 54 98 57 C117 58 133 48 134 39 C135 30 120 24 114 30"/><path d="M63 62 C79 82 95 94 121 92 C142 90 158 75 169 73 C185 70 192 78 190 88 C188 99 176 103 164 99"/>',
    '<path d="M28 33 C55 43 69 72 95 78 C113 83 134 73 142 61 C148 52 145 43 135 41 C125 39 118 44 119 50"/><path d="M58 101 C81 104 97 90 113 92 C129 94 143 109 157 106 C169 103 175 91 169 84 C166 80 158 79 154 82"/>',
    '<path d="M42 27 C58 37 60 54 75 58 C90 63 107 57 111 46 C115 35 106 29 98 31 C92 32 89 38 91 42"/><path d="M28 75 C53 83 67 105 101 111 C128 116 151 99 160 85 C169 70 160 58 147 60 C138 61 133 68 138 75"/>'
  ];
  const paths = [15,168,330].map((top,i)=>`<g transform="translate(${i===1?12:0} ${top})" class="wind-curl wind-curl-${i}">${curls[i]}</g>`).join('');
  return `<g class="wind-effect wind-${side}" ${side==='target'?'transform="translate(600 0) scale(-1 1)"':''} aria-hidden="true">${paths}</g>`;
}
function trickGridMarkup() {
  const depths = [338,356,380,414,462,520];
  const widths = [24,29,36,45,58,75];
  const floor = depths.slice(0,-1).map((top,row)=>Array.from({length:29},(_,index)=>{
    const column=index-14;
    const x=(edge,level)=>300+edge*widths[level];
    const points=`${x(column,row)},${top} ${x(column+1,row)},${top} ${x(column+1,row+1)},${depths[row+1]} ${x(column,row+1)},${depths[row+1]}`;
    return `<polygon points="${points}" class="trick-floor-tile${(row+index)%2?' alternate':''}"/>`;
  }).join('')).join('');
  const sparkles=[[74,115,5],[236,207,3],[520,105,5],[449,260,4],[94,313,3]].map(([x,y,r])=>`<path d="M${x-r*2} ${y} H${x+r*2} M${x} ${y-r*2} V${y+r*2}" class="trick-sparkle"/><circle cx="${x}" cy="${y}" r="${r/2}" class="trick-sparkle-core"/>`).join('');
  return `<g class="trick-room-scene" aria-hidden="true"><defs><linearGradient id="trick-wall-shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#19234f"/><stop offset=".56" stop-color="#264c8c"/><stop offset="1" stop-color="#42417e"/></linearGradient><linearGradient id="trick-floor-shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#625898"/><stop offset="1" stop-color="#25285c"/></linearGradient><pattern id="trick-wall-tiles" width="64" height="64" patternUnits="userSpaceOnUse"><rect width="64" height="64" fill="#233c77"/><rect width="32" height="32" fill="#83bdff" opacity=".48"/><rect x="32" y="32" width="32" height="32" fill="#83bdff" opacity=".43"/><rect x="32" width="32" height="32" fill="#354d91"/><rect y="32" width="32" height="32" fill="#304783"/><path d="M0 0 H64 M0 32 H64 M0 64 H64 M0 0 V64 M32 0 V64 M64 0 V64" fill="none" stroke="#9cc8ff" stroke-opacity=".26" stroke-width="1.3"/></pattern><radialGradient id="trick-room-glow"><stop stop-color="#a1c9ff" stop-opacity=".33"/><stop offset="1" stop-color="#a1c9ff" stop-opacity="0"/></radialGradient></defs><rect width="600" height="338" fill="url(#trick-wall-shade)"/><rect width="600" height="338" fill="url(#trick-wall-tiles)" opacity=".78"/><path d="M300 0 V338" stroke="#151e4b" stroke-width="13" opacity=".28"/><rect width="600" height="338" fill="url(#trick-room-glow)"/><rect y="338" width="600" height="182" fill="url(#trick-floor-shade)"/>${floor}<path d="M0 338 H600" stroke="#b9c9ff" stroke-opacity=".44" stroke-width="2"/>${sparkles}</g>`;
}
function renderComparison() {
  controls('#own-controls', own, '我方隊伍'); controls('#target-controls', opponent, '對方目標');
  $('#team-count').textContent = `${team.length}/6`;
  const range = ranges(target, opponent);
  const points = team.map((t, index) => { const p = data.find(p => p.id === t.id); return {name:p.name, gender:p.gender, image:p.image, item:t.item, index, visible:t.visible, abilitySpeedBoost:t.abilitySpeedBoost, paralyzed:t.paralyzed, stage:t.stage, value:modified(t.mode==='direct' ? t.speed : stat(p.speed,t.sp,t.nature),{tailwind:own.tailwind,abilitySpeedBoost:t.abilitySpeedBoost,paralyzed:t.paralyzed,stage:t.stage},itemMultiplier(t.item))}; }).filter(p=>p.visible);
  const shownSpeeds = [range.min, range.max, ...range.items.map(i=>i.value), ...points.map(p=>p.value)];
  const lowest = Math.min(...shownSpeeds), highest = Math.max(...shownSpeeds);
  const y = v => trickRoom ? 30+(v-lowest)/Math.max(1,highest-lowest)*458 : 488-(v-lowest)/Math.max(1,highest-lowest)*458;
  const labelPositions = items => { let last = 0; const placed = [...items].sort((a,b)=>y(a.value)-y(b.value)).map(p=>{ const labelY=Math.max(y(p.value),last+25);last=labelY;return {...p,labelY}; }); let bottom=505; for(let i=placed.length-1;i>=0;i--){placed[i].labelY=Math.min(placed[i].labelY,bottom);bottom=placed[i].labelY-25;} return placed; };
  const labels = labelPositions([
    ...range.items.filter(i=>i.label.includes('圍巾')),
    {label:'極速',value:range.max},
    {label:'滿速',value:modified(stat(target.speed,32,1),opponent)},
    {label:'底速',value:modified(stat(target.speed,0,1),opponent)},
    {label:'減速',value:range.min},
    ...range.items.filter(i=>i.label.includes('黑色鐵球'))
  ]);
  const ownMarkers = [...points].sort((a,b)=>trickRoom?a.value-b.value:b.value-a.value).map((p,i,all)=>({...p,markerX:166,markerY:all.length===1?250:52+i*405/(all.length-1)}));
  const ownMarkersHtml = ownMarkers.map(p => ownMarkerMarkup(p, range, y)).join('');
  $('#chart').classList.toggle('trick-room',trickRoom);
  $('#trick-room').setAttribute('aria-pressed',String(trickRoom));
  $('#speed-direction').textContent=trickRoom?'↓ 速度越快':'↑ 速度越快';
  const rangeTop=Math.min(y(range.min),y(range.max));
  const rangeHeight=Math.abs(y(range.min)-y(range.max));
  $('#chart').innerHTML = `<svg viewBox="0 0 600 520" role="group" aria-label="速度比較軸">${trickRoom?trickGridMarkup():''}${own.tailwind?windMarkup('own'):''}${opponent.tailwind?windMarkup('target'):''}<rect x="277" y="10" width="34" height="500" rx="17" class="axis"/><rect x="277" y="${rangeTop}" width="34" height="${rangeHeight}" class="range"/><rect x="277" y="10" width="34" height="500" rx="17" class="axis-frame"/><image href="${target.image}" x="480" y="8" width="100" height="100"><title>${displayName(target)}</title></image><text x="530" y="129" text-anchor="middle" class="target-name">${svgName(target)}</text>${labels.map(p=>targetLabelMarkup(p,y)).join('')}${ownMarkersHtml}</svg>`;
  $('#chart').querySelectorAll('.target-item-icon').forEach(icon => {
    const label = icon.previousElementSibling;
    icon.setAttribute('x', String(label.getBBox().x + label.getComputedTextLength() + 5));
  });
  $('#chart').querySelectorAll('.own-item-icon').forEach(icon => {
    const bounds = icon.nextElementSibling.getBBox();
    icon.setAttribute('x', String(bounds.x - 19));
    icon.setAttribute('y', String(bounds.y + (bounds.height - 16) / 2));
  });
  $('#chart').setAttribute('aria-label', `${target.name}速度刻度 ${lowest} 到 ${highest}，目標範圍 ${range.min} 到 ${range.max}。${labels.map(p=>`${p.label} ${p.value}`).join('，')}。${points.map(p=>`${p.name} ${p.value}`).join('，')}`);
}
function renderFilters() {
  $('#types').innerHTML = TYPES.map(t=>`<button data-type="${t}" aria-label="${t}" title="${t}" aria-pressed="${filters.types.includes(t)}">${typeIcon(t)}</button>`).join('')+`<button id="mono" data-mono aria-label="單屬性" title="單屬性" aria-pressed="${filters.mono}">單</button>`;
  $('#generations').innerHTML = Array.from({length:9},(_,i)=>`<button data-gen="${i+1}" aria-pressed="${filters.generations.includes(i+1)}">${['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ'][i]}</button>`).join('');
  $('#mega-debuts').innerHTML = `<button data-mega aria-label="只顯示 Mega" title="只顯示 Mega" aria-pressed="${filters.megaOnly}"><img src="./assets/mega-button.png" alt="" width="34" height="34"></button>`+MEGA_DEBUTS.map(era=>`<button data-era="${era}" aria-pressed="${filters.megaDebut.includes(era)}">${era}</button>`).join('');
  $('#mono').setAttribute('aria-pressed',filters.mono);
  const results = filterPokemon(data,filters);
  $('#result-count').textContent = `${results.length}`;
  $('#results').innerHTML = results.length ? results.map(p=>`<button class="pokemon ${target.id===p.id?'selected':''}" data-id="${p.id}" aria-label="${displayName(p)}${p.mega?'，Mega 初登場 '+(p.megaDebut||'待核實'):''}" title="${displayName(p)}｜圖鑑編號 ${String(p.dex).padStart(4,'0')}｜${p.types.join(' / ')}｜速度種族值 ${p.speed}${p.mega?'｜Mega 初登場 '+(p.megaDebut||'待核實'):''}" aria-pressed="${target.id===p.id}"><img class="pokemon-image" src="${p.image || './assets/pokemon/' + p.id + '.png'}" alt="" width="112" height="112" loading="lazy"><span class="image-placeholder" hidden aria-hidden="true"><span>◇</span>圖片待補</span>${p.mega?`<span class="form-badge">${p.megaDebut||'Mega'}</span>`:p.id.endsWith('-alola')?'<span class="form-badge">阿羅拉</span>':''}${p.gender?`<span class="gender-badge gender-${p.gender}" aria-hidden="true">${genderSymbol(p)}</span>`:''}<span class="selection-check" aria-hidden="true">✓</span></button>`).join('') : '<div class="empty">沒有符合條件的寶可夢。<br>試著減少條件，或按「重置篩選」。</div>';
  $('#results').querySelectorAll('img').forEach(img => { img.onerror = () => { img.hidden = true; img.nextElementSibling.hidden = false; }; });
}
$('#search').oninput=e=>{filters.query=e.target.value;renderFilters();};
$('#types').onclick=e=>{const key=e.target.closest('[data-mono]')?'單屬性':e.target.closest('[data-type]')?.dataset.type;if(!key)return;filters=toggleTypeOrMono(filters,key);renderFilters();};
$('#generations').onclick=e=>{const g=+e.target.closest('[data-gen]')?.dataset.gen;if(!g)return;filters.generations=filters.generations.includes(g)?filters.generations.filter(x=>x!==g):[...filters.generations,g];renderFilters();};
$('#mega-debuts').onclick=e=>{if(e.target.closest('[data-mega]')){filters.megaOnly=!filters.megaOnly;if(!filters.megaOnly)filters.megaDebut=[];renderFilters();return;}const era=e.target.closest('[data-era]')?.dataset.era;if(!era)return;filters.megaDebut=filters.megaDebut.includes(era)?filters.megaDebut.filter(x=>x!==era):[...filters.megaDebut,era];if(filters.megaDebut.length)filters.megaOnly=true;renderFilters();};
$('#reset-filters').onclick=()=>{filters=freshFilters();$('#search').value='';renderFilters();};
$('#results').onclick=e=>{const b=e.target.closest('[data-id]');if(!b)return;target=data.find(p=>p.id===b.dataset.id);renderFilters();renderComparison();};
$('#chart').onclick=e=>{const marker=e.target.closest('[data-team-select]');if(!marker)return;selectedTeamIndex=+marker.dataset.teamSelect;renderComparison();};
$('#chart').onkeydown=e=>{if(!['Enter',' '].includes(e.key))return;const marker=e.target.closest('[data-team-select]');if(!marker)return;e.preventDefault();selectedTeamIndex=+marker.dataset.teamSelect;renderComparison();$('#chart').querySelector(`[data-team-select="${selectedTeamIndex}"]`)?.focus();};
$('#trick-room').onclick=()=>{trickRoom=!trickRoom;renderComparison();};
function renderDraft() {
  $('#team-rows').innerHTML=draft.map((t,i)=>{
    const p=data.find(p=>p.id===t.id);
    return `<article class="team-card" data-row="${i}"><div class="team-card-head"><span>${i+1}/6</span><button type="button" data-remove="${i}" aria-label="移除 ${displayName(p)}">✕</button></div><img src="${p.image}" alt="" width="74" height="74"><strong title="${displayName(p)}">${displayName(p)}</strong><div class="team-sp-row"><label>${t.mode==='direct'?'實際速度':'速度 SP'}<input data-field="${t.mode==='direct'?'speed':'sp'}" type="number" required min="${t.mode==='direct'?1:0}" max="${t.mode==='direct'?9999:32}" step="1" value="${t.mode==='direct'?t.speed:t.sp}"></label><div class="nature-buttons"><button type="button" data-nature="1.1" aria-label="加速性格" aria-pressed="${t.nature===1.1}" ${t.mode==='direct'?'disabled':''}>＋</button><button type="button" data-nature="0.9" aria-label="減速性格" aria-pressed="${t.nature===.9}" ${t.mode==='direct'?'disabled':''}>−</button></div></div><label class="team-card-select">道具<select data-field="item" ${p.mega?'disabled':''}><option value="none">無</option><option value="scarf" ${t.item==='scarf'?'selected':''}>講究圍巾</option><option value="iron-ball" ${t.item==='iron-ball'?'selected':''}>黑色鐵球</option></select></label><label class="team-card-select">輸入方式<select data-field="mode"><option value="calc" ${t.mode==='calc'?'selected':''}>SP ＋ 性格</option><option value="direct" ${t.mode==='direct'?'selected':''}>實際速度</option></select></label><label class="team-visible"><input type="checkbox" data-field="visible" ${t.visible?'checked':''}>顯示在線上</label></article>`;
  }).join('') || '<div class="team-empty">從下方搜尋並加入寶可夢</div>';
  $('#team-picker-count').textContent=`${draft.length}/6`;
  renderTeamPool();
}
function renderTeamPool() {
  const query=$('#team-search').value.trim().toLowerCase();
  const matches=filterPokemon(data,{...teamTypeFilters,query});
  $('#team-type-filter').innerHTML=TYPES.map(t=>`<button type="button" data-team-type="${t}" aria-label="${t}" title="${t}" aria-pressed="${teamTypeFilters.types.includes(t)}">${typeIcon(t)}</button>`).join('')+`<button type="button" data-team-mono aria-label="單屬性" title="單屬性" aria-pressed="${teamTypeFilters.mono}">單</button>`;
  $('#team-pool').innerHTML=matches.map(p=>`<button type="button" role="option" data-add-pokemon="${p.id}" aria-label="加入 ${displayName(p)}" ${draft.length>=6?'disabled':''}><img src="${p.image}" alt="" width="42" height="42" loading="lazy"><span>${displayName(p)}</span><small>#${String(p.dex).padStart(4,'0')}</small></button>`).join('') || '<div class="empty">找不到符合條件的寶可夢。</div>';
}
$('#edit-team').onclick=()=>{draft=structuredClone(team);teamTypeFilters=freshFilters();renderDraft();$('#team-dialog').showModal();};
$('#close-team').onclick=()=>$('#team-dialog').close();
$('#team-search').oninput=renderTeamPool;
$('#team-type-filter').onclick=e=>{const key=e.target.closest('[data-team-mono]')?'單屬性':e.target.closest('[data-team-type]')?.dataset.teamType;if(!key)return;teamTypeFilters=toggleTypeOrMono(teamTypeFilters,key);renderTeamPool();};
$('#team-pool').onclick=e=>{const id=e.target.closest('[data-add-pokemon]')?.dataset.addPokemon;if(!id||draft.length>=6)return;const p=data.find(p=>p.id===id);draft.push({id,mode:'calc',sp:32,nature:1,speed:stat(p.speed,32,1),visible:true,abilitySpeedBoost:false,paralyzed:false,stage:0,item:'none'});renderDraft();};
$('#import-pokepaste').onclick=async()=>{
  const input=$('#pokepaste-input').value.trim(),status=$('#pokepaste-status');
  if(!input){status.textContent='請先貼上連結或隊伍文字。';return;}
  let content=input;
  const fromLink=/^https?:\/\//i.test(input);
  if(fromLink){
    const url=pokepastePageUrl(input);
    if(!url){status.textContent='目前支援 pokepast.es 連結；也可以直接貼上隊伍文字。';return;}
    try {
      const id=url.split('/').at(-1);
      if(window.__TAURI__?.core?.invoke) content=pokepasteHtmlToText(await window.__TAURI__.core.invoke('fetch_pokepaste',{id}));
      else {const response=await fetch(`/api/pokepaste/${id}`);if(!response.ok)throw Error();content=await response.text();}
      if(!content)throw Error();
    }
    catch {status.textContent='目前無法讀取連結，請在 PokePaste 複製隊伍文字後貼到這裡。';return;}
  }
  const result=parsePokepaste(content,data);
  if(!result.accepted.length){status.textContent=`${fromLink?'連結已讀取，但沒有找到':'沒有找到'}目前名單中的寶可夢${result.skipped.length?'：'+result.skipped.join('、'):''}。`;return;}
  draft=result.accepted;
  renderDraft();
  status.textContent=`已匯入 ${draft.length} 隻${result.skipped.length?'；略過 '+result.skipped.join('、'):''}。按「儲存隊伍」才會套用。`;
};
$('#team-rows').onchange=e=>{const el=e.target, row=el.closest('[data-row]');if(!row||!el.dataset.field||!el.checkValidity())return;const t=draft[+row.dataset.row];const field=el.dataset.field;
  if(field==='mode' && el.value==='direct') t.speed=stat(data.find(p=>p.id===t.id).speed,t.sp,t.nature);
  t[field]=field==='visible'?el.checked:['sp','speed'].includes(field)?+el.value:el.value;renderDraft();};
$('#team-rows').onclick=e=>{const remove=e.target.closest('[data-remove]');if(remove){draft.splice(+remove.dataset.remove,1);renderDraft();return;}const nature=e.target.closest('[data-nature]');if(nature){const t=draft[+nature.closest('[data-row]').dataset.row];const next=+nature.dataset.nature;t.nature=t.nature===next?1:next;renderDraft();}};
$('#team-form').onsubmit=e=>{e.preventDefault();team=sanitizeTeam(draft,data);selectedTeamIndex=Math.min(selectedTeamIndex,Math.max(0,team.length-1));const saved=saveTeam(team);$('#team-dialog').close();renderComparison();$('#toast').textContent=saved?'隊伍已儲存在此裝置':'無法寫入本機儲存；隊伍僅保留於本次使用。';setTimeout(()=>$('#toast').textContent='',4000);};
renderFilters();renderComparison();

const workspace = $('#workspace');
const mobilePageButtons = [...document.querySelectorAll('.mobile-pages button')];
function setPage(page) {
  if (workspace.dataset.activePage && workspace.dataset.activePage !== page) workspace.dataset.transition='true';
  workspace.dataset.activePage=page;
  mobilePageButtons.forEach(button=>button.setAttribute('aria-current',button.dataset.page===page?'page':'false'));
  workspace.querySelectorAll('[data-deck]').forEach(button=>button.disabled=button.dataset.deck===page);
}
setPage('speed');
mobilePageButtons.forEach(button=>button.onclick=()=>setPage(button.dataset.page));
workspace.querySelectorAll('[data-deck]').forEach(button=>button.onclick=()=>setPage(button.dataset.deck));
let touchStart=null;
workspace.addEventListener('touchstart',e=>{touchStart={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};},{passive:true});
workspace.addEventListener('touchend',e=>{if(!touchStart)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.4)setPage(dx<0?'search':'speed');},{passive:true});

