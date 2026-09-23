import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';

const wiki = JSON.parse(await readFile('scripts/roster-sources/52poke-2026-09-23.json', 'utf8'));
const stats = JSON.parse(await readFile('scripts/roster-sources/rotompicks-m-c-2026-09-23.json', 'utf8'));
const legacy = JSON.parse(await readFile('scripts/roster-sources/demo-34.json', 'utf8'));
const dryRun = process.argv.includes('--dry-run');
const slug = value => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const typeMap = {一般:'一般',火:'火',水:'水',電:'電',草:'草',冰:'冰',格鬥:'格鬥',毒:'毒',地面:'地面',飛行:'飛行',超能力:'超能力',蟲:'蟲',岩石:'岩石',幽靈:'幽靈',龍:'龍',惡:'惡',鋼:'鋼',妖精:'妖精'};
const englishForms = {
  351:['Castform','Castform Rainy','Castform Sunny','Castform Snowy'],
  666:['Vivillon Meadow','Vivillon Archipelago','Vivillon Continental','Vivillon Elegant','Vivillon Fancy','Vivillon Garden','Vivillon High Plains','Vivillon Icy Snow','Vivillon Jungle','Vivillon Marine','Vivillon Modern','Vivillon Monsoon','Vivillon Ocean','Vivillon Poke Ball','Vivillon Polar','Vivillon River','Vivillon Sandstorm','Vivillon Savanna','Vivillon Sun','Vivillon Tundra'],
  671:['Florges Red','Florges Blue','Florges Orange','Florges White','Florges Yellow'],
  676:['Furfrou Natural','Furfrou Dandy','Furfrou Debonair','Furfrou Diamond','Furfrou Heart','Furfrou Kabuki','Furfrou La Reine','Furfrou Matron','Furfrou Pharaoh','Furfrou Star'],
  681:['Aegislash Shield','Aegislash Blade'],
  711:['Gourgeist Average','Gourgeist Super','Gourgeist Large','Gourgeist Small'],
  745:['Lycanroc Midday','Lycanroc Midnight','Lycanroc Dusk'],
  855:['Polteageist Phony','Polteageist Antique'],
  869:['Alcremie Vanilla Cream','Alcremie Caramel Swirl','Alcremie Lemon Cream','Alcremie Matcha Cream','Alcremie Mint Cream','Alcremie Rainbow Swirl','Alcremie Ruby Cream','Alcremie Ruby Swirl','Alcremie Salted Cream'],
  877:['Morpeko Full Belly','Morpeko Hangry'],
  925:['Maushold Family of Four','Maushold Family of Three'],
  964:['Palafin Zero','Palafin Hero'],
  1013:['Sinistcha Unremarkable','Sinistcha Masterpiece'],
  668:['Pyroar Male','Pyroar Female','Mega Pyroar'],
  931:['Squawkabilly Green','Squawkabilly Blue','Squawkabilly Yellow','Squawkabilly White']
};
const speedOverrides = { 'Gourgeist Average':54,'Gourgeist Super':44,'Gourgeist Large':49,'Gourgeist Small':59,'Lycanroc Midday':112,'Lycanroc Midnight':82,'Lycanroc Dusk':110 };
const xyMegas = new Set('venusaur charizard-x charizard-y blastoise alakazam gengar kangaskhan pinsir gyarados aerodactyl mewtwo-x mewtwo-y ampharos scizor heracross houndoom tyranitar blaziken gardevoir mawile aggron medicham manectric banette absol garchomp lucario abomasnow'.split(' '));
const orasMegas = new Set('beedrill pidgeot slowbro steelix sceptile swampert sableye sharpedo camerupt altaria glalie salamence metagross latias latios rayquaza lopunny gallade audino diancie'.split(' '));
const dlcMegas = new Set('raichu-x raichu-y chimecho absol-z staraptor garchomp-z lucario-z heatran darkrai golurk meowstic crabominable golisopod magearna zeraora scovillain glimmora tatsugiri baxcalibur'.split(' '));
const generation = dex => dex<=151?1:dex<=251?2:dex<=386?3:dex<=493?4:dex<=649?5:dex<=721?6:dex<=809?7:dex<=905?8:9;
const formGeneration = (id, dex) => id.endsWith('-alola') ? 7 : id.endsWith('-galar') || id.endsWith('-hisui') ? 8 : id.endsWith('-paldea') ? 9 : generation(dex);
const byDex = list => Map.groupBy(list, row => row.dex);
const wikiByDex = byDex(wiki), statsByDex = byDex(stats);
const usedIds = new Set(), preservedIds = new Set(), imageSources = new Map();

function matchingStat(row, index, group, candidates, assigned) {
  const isMega = row.form.startsWith('超級');
  const rowTypes = row.types.map(type => typeMap[type]);
  if (rowTypes.some(type => !type)) throw Error(`Unknown type ${row.dex} ${row.types}`);
  let options = candidates.filter(candidate => candidate.mega === isMega && candidate.types.map(type => ({normal:'一般',fire:'火',water:'水',electric:'電',grass:'草',ice:'冰',fighting:'格鬥',poison:'毒',ground:'地面',flying:'飛行',psychic:'超能力',bug:'蟲',rock:'岩石',ghost:'幽靈',dragon:'龍',dark:'惡',steel:'鋼',fairy:'妖精'})[type]).join(',') === rowTypes.join(','));
  if (!options.length && group.length !== candidates.length && !isMega) options=candidates.filter(candidate=>!candidate.mega);
  if (isMega && /[ＸＹＺXYZ]$/.test(row.form)) options = options.filter(candidate => candidate.display.endsWith(row.form.at(-1).normalize('NFKC')));
  if (row.dex === 670 && !isMega) options = options.filter(candidate => candidate.display.includes('Eternal'));
  if (row.form.includes('雌性') && candidates.some(candidate => candidate.display.includes('Female'))) options = options.filter(candidate => candidate.display.includes('Female'));
  if (row.form.includes('雄性')) options = options.filter(candidate => !candidate.display.includes('Female'));
  if (group.length === candidates.length) options = options.filter(candidate => !assigned.has(candidate));
  const result = options[0];
  if (!result) throw Error(`No speed match: #${row.dex} ${row.base} ${row.form} ${row.types.join('/')}`);
  assigned.add(result);
  return result;
}

function englishId(english, row) {
  if (english.startsWith('Mega ')) {
    const form=english.slice(5),suffix=form.match(/ ([XYZ])$/)?.[1];
    return `${slug(form.replace(/ [XYZ]$/,''))}-mega${suffix?'-'+suffix.toLowerCase():''}`;
  }
  for (const [prefix, suffix] of [['Alolan ','alola'],['Galarian ','galar'],['Hisuian ','hisui'],['Paldean ','paldea']]) {
    if (english.startsWith(prefix)) return `${slug(english.slice(prefix.length))}-${suffix}`;
  }
  if (row.dex === 876) return row.form.includes('雌性') ? 'indeedee-female' : 'indeedee-male';
  if (row.dex === 668 && !row.form.startsWith('超級')) return row.form.includes('雌性') ? 'pyroar-female' : 'pyroar-male';
  if (english.includes(' Rotom')) return `rotom-${slug(english.split(' ')[0])}`;
  return slug(english);
}

function chineseName(row) {
  if (!row.form || row.form === '飄浮泡泡的樣子' || row.form === '洛托姆的樣子') return row.base;
  if (row.form.startsWith('超級') || row.form.endsWith('洛托姆')) return row.form.replace(/\n/g,'');
  if ((row.dex===876 || row.dex===668) && /雄性|雌性/.test(row.form)) return row.base;
  return `${row.base}（${row.form.replace(/\n/g,'')}）`;
}

function megaDebut(english) {
  const base = slug(english.replace(/^Mega /,'')).replace(/-(x|y|z)$/,'-$1');
  if (xyMegas.has(base)) return 'XY';
  if (orasMegas.has(base)) return 'ORAS';
  if (dlcMegas.has(base)) return 'ZA DLC';
  return 'ZA';
}

let output = [];
for (const [dex, group] of wikiByDex) {
  const candidates = statsByDex.get(dex);
  if (!candidates?.length) throw Error(`No speed source for #${dex}`);
  const assigned = new Set();
  for (const [index, row] of group.entries()) {
    const source = matchingStat(row,index,group,candidates,assigned);
    const english = englishForms[dex]?.[index] || source.display;
    const gender = /雄性/.test(row.form) && (dex===876||dex===668) ? 'male' : /雌性/.test(row.form) && (dex===876||dex===668) ? 'female' : undefined;
    const legacyRow = legacy.find(old => old.dex===dex && (old.en.toLowerCase()===english.toLowerCase() || (dex===876 && old.gender===gender)));
    if (legacyRow) preservedIds.add(legacyRow.id);
    let id = legacyRow?.id || englishId(english,row);
    if (usedIds.has(id)) id = `${id}-${index+1}`;
    if (usedIds.has(id)) throw Error(`Duplicate ID ${id}`);
    usedIds.add(id);
    const mega = row.form.startsWith('超級');
    const speed = speedOverrides[english] || source.speed;
    const entry = {id,dex,name:legacyRow?.name || chineseName(row),en:english,types:row.types.map(type=>typeMap[type]),generation:formGeneration(id,dex),speed,fullyEvolved:![25,670].includes(dex),available:true,mega,image:legacyRow?.image || `./assets/pokemon/roster/${id}.webp`};
    if (mega) entry.megaDebut=legacyRow?.megaDebut || megaDebut(english);
    if (gender) entry.gender=gender;
    imageSources.set(id,row.image);
    output.push(entry);
  }
}
if (output.length!==395) throw Error(`Expected 395 source forms, got ${output.length}`);
// Display one representative for these multi-appearance species. Castform's weather forms
// change type, but share the same speed used by this tool.
// Keep the first listed appearance as the representative and retain its ID for saved teams.
const cosmeticDex = new Set([351,666,671,676,855,869,877,925,931,1013]);
const seenCosmetic = new Set();
output = output.filter(row => {
  if (!cosmeticDex.has(row.dex)) return true;
  if (seenCosmetic.has(row.dex)) return false;
  seenCosmetic.add(row.dex);
  row.name = row.name.split('（')[0];
  row.en = row.en.split(' ').slice(0,1).join(' ');
  return true;
});
if (output.length!==345) throw Error(`Expected 345 displayed forms, got ${output.length}`);
if (preservedIds.size!==legacy.length) throw Error(`Legacy IDs not preserved: ${legacy.filter(row=>!preservedIds.has(row.id)).map(row=>row.id)}`);
console.log(JSON.stringify({count:output.length,uniqueDex:new Set(output.map(row=>row.dex)).size,megas:output.filter(row=>row.mega).length,imagesNeeded:output.filter(row=>row.image.includes('/roster/')).length,megaDebuts:Object.fromEntries(['XY','ORAS','ZA','ZA DLC'].map(era=>[era,output.filter(row=>row.megaDebut===era).length]))}));
if (dryRun) process.exit(0);

const images = output.filter(row=>row.image.includes('/roster/'));
await mkdir('src/assets/pokemon/roster',{recursive:true});
const errors=[];
let next=0;
async function downloadWorker() {
  while (next<images.length) {
    const row=images[next++];
    const source=imageSources.get(row.id);
    if (!source) {errors.push(`${row.id}: source image missing`);continue;}
    try {
      try { await access(join('src',row.image.slice(2))); continue; } catch {}
      const response=await fetch(`https:${source}`,{signal:AbortSignal.timeout(15000),headers:{Accept:'image/webp'}});
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw Error(`HTTP ${response.status}`);
      const body=Buffer.from(await response.arrayBuffer());
      if (body.length<100) throw Error('Empty image');
      if (response.headers.get('content-type')?.includes('png')) row.image=row.image.replace(/\.webp$/,'.png');
      await writeFile(join('src',row.image.slice(2)),body);
    } catch(error) { errors.push(`${row.id}: ${error.message}`); }
  }
}
await Promise.all(Array.from({length:8},downloadWorker));
if (errors.length) throw Error(`Image download failures (${errors.length}): ${errors.slice(0,20).join(', ')}`);
await writeFile('src/data/pokemon.json',JSON.stringify(output,null,2)+'\n');
await writeFile('src/data/roster-meta.json',JSON.stringify({asOf:'2026-09-23',gameVersion:'1.2.0',forms:output.length,sourceForms:395,collapsedAppearanceDex:[351,666,671,676,855,869,877,925,931,1013],source:'https://wiki.52poke.com/wiki/寶可夢列表（Champions）',speedSource:'https://rotompicks.com/en/pokemon/',note:'Ten requested multi-appearance species are shown once each; Castform uses its normal type and shared base speed.'},null,2)+'\n');
