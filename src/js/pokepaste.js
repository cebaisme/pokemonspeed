import { stat } from './speed.js';

const FAST_NATURES = new Set(['jolly', 'timid', 'hasty', 'naive']);
const SLOW_NATURES = new Set(['brave', 'relaxed', 'quiet', 'sassy']);
const normalize = name => name.toLowerCase().normalize('NFKC').replace(/[^a-z0-9\p{Script=Han}]+/gu, ' ').trim();
const MEGA_STONES = new Map(Object.entries({
  golisopite:'golisopod-mega', 'raichunite x':'raichu-mega-x', 'raichunite y':'raichu-mega-y',
  blastoisinite:'blastoise-mega', sceptilite:'sceptile-mega', aggronite:'aggron-mega',
  garchompite:'garchomp-mega', 'garchompite z':'garchomp-mega-z',
  froslassite:'froslass-mega', hawluchite:'hawlucha-mega'
}));

function findPokemon(name, data) {
  const key = normalize(name);
  const aliases = new Map();
  for (const p of data) {
    aliases.set(normalize(p.en), p);
    aliases.set(normalize(p.name), p);
    aliases.set(normalize(p.id), p);
    if (p.en.startsWith('Mega ')) {
      const rest = p.en.slice(5);
      aliases.set(normalize(`${rest}-Mega`), p);
      aliases.set(normalize(`${rest.replace(/ [XYZ]$/, '')}-Mega-${rest.match(/ [XYZ]$/)?.[0].trim()||''}`), p);
    }
    if (p.en.startsWith('Alolan ')) aliases.set(normalize(`${p.en.slice(7)}-Alola`), p);
  }
  aliases.set('indeedee f', data.find(p=>p.id==='indeedee-female'));
  aliases.set('indeedee m', data.find(p=>p.id==='indeedee-male'));
  return aliases.get(key);
}

export function parsePokepaste(text, data) {
  const accepted=[], skipped=[];
  for (const block of text.replace(/\\\r?\n/g,'\n').trim().split(/\r?\n\s*\r?\n/)) {
    const lines=block.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    if (!lines.length) continue;
    const first=lines[0].split(/\s+@\s+/);
    const held=first[1]?.trim().toLowerCase()||'';
    let species=first[0].replace(/\s+\((?:M|F)\)$/i,'').trim();
    if (/^indeedee$/i.test(species)) species=/\(F\)$/i.test(first[0])?'Indeedee Female':'Indeedee Male';
    const named=species.match(/^.+\(([^()]*)\)$/);
    if (named && findPokemon(named[1],data)) species=named[1];
    const megaId=MEGA_STONES.get(normalize(held));
    const pokemon=(megaId&&data.find(p=>p.id===megaId))||findPokemon(species,data);
    if (!pokemon) {skipped.push(species);continue;}
    if (accepted.length>=6) {skipped.push(species);continue;}
    const evLine=lines.find(line=>/^EVs:/i.test(line))||'';
    const ivLine=lines.find(line=>/^IVs:/i.test(line))||'';
    const allEvs=[...evLine.matchAll(/(\d+)\s+(?:HP|Atk|Def|SpA|SpD|Spe)\b/gi)].map(match=>Number(match[1]));
    const championsInvestment=allEvs.every(value=>value<=32);
    const ev=Math.min(championsInvestment?32:252,Math.max(0,Number(evLine.match(/(\d+)\s+Spe\b/i)?.[1]||0)));
    const iv=Math.min(31,Math.max(0,Number(ivLine.match(/(\d+)\s+Spe\b/i)?.[1]||31)));
    const natureName=(lines.find(line=>/^[A-Za-z]+ Nature$/i.test(line))||'').split(' ')[0].toLowerCase();
    const nature=FAST_NATURES.has(natureName)?1.1:SLOW_NATURES.has(natureName)?.9:1;
    const sp=championsInvestment?ev:Math.max(0,Math.min(32,Math.floor((31+Math.floor(ev/4))/2)-15));
    const neutralSpeed=championsInvestment?pokemon.speed+20+sp:Math.floor((2*pokemon.speed+iv+Math.floor(ev/4))/2)+5;
    const actualSpeed=Math.floor(neutralSpeed*nature);
    const mode=championsInvestment||iv===31&&actualSpeed===stat(pokemon.speed,sp,nature)?'calc':'direct';
    const item=held==='choice scarf'&&!pokemon.mega?'scarf':held==='iron ball'&&!pokemon.mega?'iron-ball':'none';
    accepted.push({id:pokemon.id,mode,sp,nature,speed:actualSpeed,visible:true,abilitySpeedBoost:false,stage:0,item});
  }
  return {accepted,skipped};
}

export function pokepastePageUrl(value) {
  let url;
  try {url=new URL(value.trim());} catch {return null;}
  if (url.protocol!=='https:' || !['pokepast.es','www.pokepast.es'].includes(url.hostname)) return null;
  const id=url.pathname.match(/^\/(?:raw\/)?([a-zA-Z0-9]+)\/?$/)?.[1];
  return id?`https://pokepast.es/${id}`:null;
}

export function pokepasteHtmlToText(html) {
  const decode = text => text.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,value)=>String.fromCodePoint(value[0].toLowerCase()==='x'?parseInt(value.slice(1),16):Number(value)))
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/gi,entity=>({ '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[entity.toLowerCase()]);
  const blocks = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<pre\b[^>]*>([\s\S]*?)<\/pre>[\s\S]*?<\/article>/gi)];
  return blocks.map(([,block])=>decode(block.replace(/<[^>]*>/g,'')).trim()).filter(Boolean).join('\n\n');
}
