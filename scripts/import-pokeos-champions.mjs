import {readFile,writeFile,mkdir} from 'node:fs/promises';
const rosterUrl=new URL('../src/data/pokemon.json',import.meta.url), out=new URL('../src/assets/pokemon/champions-hd/',import.meta.url),sourcesUrl=new URL('../src/assets/pokemon/sources.json',import.meta.url);
const roster=JSON.parse(await readFile(rosterUrl,'utf8'));
const response=await fetch('https://api.pokeos.com/api/poke/game/assets?versionGroupCode=champions');
if(!response.ok)throw Error(`Pokéos index HTTP ${response.status}`);
const available=new Set((await response.json()).filter(a=>!a.path.includes('/shiny/')).map(a=>a.path));
const overrides={
 'aqua-tauros-paldea':'-regional-p-aqua','blaze-tauros-paldea':'-regional-p-blaze','tauros-paldea':'-regional-p-combat',
 'eternal-flower-floette':'-eternal','female-meowstic':'-female','female-basculegion':'-female',
 'low-key-toxtricity':'-low-key','aegislash-blade':'-blade','gourgeist-super':'-super','gourgeist-large':'-large','gourgeist-small':'-small',
 'lycanroc-midnight':'-midnight','lycanroc-dusk':'-dusk','morpeko-hangry':'-hangry','palafin-hero':'-hero','indeedee-female':'-female',
 'florges-blue':'-blue','florges-orange':'-orange','florges-white':'-white','florges-yellow':'-yellow',
 'squawkabilly-blue':'-blue','squawkabilly-white':'-white','squawkabilly-yellow':'-yellow'
};
function pathFor({id,dex}){
 if(id==='pyroar-female')return `./games/champions/female/${dex}.png`;
 let suffix=overrides[id]||'';
 if(!suffix&&id.endsWith('-alola'))suffix='-regional-a';
 if(!suffix&&id.endsWith('-galar'))suffix='-regional-g';
 if(!suffix&&id.endsWith('-hisui'))suffix='-regional-h';
 if(!suffix&&id.includes('-mega'))suffix=id.slice(id.indexOf('-mega'));
 if(!suffix&&id.startsWith('rotom-'))suffix=`-${id.slice(6)}`;
 return `./games/champions/${dex}${suffix}.png`;
}
const matches=roster.map(pokemon=>({pokemon,path:pathFor(pokemon)}));
const missing=matches.filter(({path})=>!available.has(path));
console.log(`${matches.length-missing.length}/${matches.length} forms matched.`);
if(missing.length)console.log('Unmatched:\n'+missing.map(({pokemon,path})=>`${pokemon.id} → ${path}`).join('\n'));
if(!process.argv.includes('--dry-run')){
await mkdir(out,{recursive:true});
const selected=matches.filter(({path})=>available.has(path));
let cursor=0;const errors=[];
async function worker(){while(cursor<selected.length){const {pokemon,path}=selected[cursor++];const url='https://assets.pokeos.com/pokemon/'+path.slice(2);try{
 const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`HTTP ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)<128||bytes.readUInt32BE(20)<128)throw Error('Not a 128px PNG');
 await writeFile(new URL(`${pokemon.id}.png`,out),bytes);
 }catch(error){errors.push(`${pokemon.id}: ${error.message}`)}}}
await Promise.all(Array.from({length:12},worker));
if(errors.length)throw Error(`Download failed:\n${errors.join('\n')}`);
const sources=JSON.parse(await readFile(sourcesUrl,'utf8')),byId=new Map(sources.map(source=>[source.id,source]));
for(const {pokemon,path} of selected){pokemon.image=`./assets/pokemon/champions-hd/${pokemon.id}.png`;const source=byId.get(pokemon.id);if(source){source.file=`champions-hd/${pokemon.id}.png`;source.format='PNG';source.url='https://assets.pokeos.com/pokemon/'+path.slice(2)}}
await writeFile(rosterUrl,JSON.stringify(roster,null,2)+'\n');
await writeFile(sourcesUrl,JSON.stringify(sources,null,2)+'\n');
console.log(`Imported ${selected.length} images.`);

}

