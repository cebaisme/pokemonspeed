export const TYPES = ['一般','火','水','電','草','冰','格鬥','毒','地面','飛行','超能力','蟲','岩石','幽靈','龍','惡','鋼','妖精'];
export const MEGA_DEBUTS = ['XY', 'ORAS', 'ZA', 'ZA DLC'];
export const freshFilters = () => ({ query: '', types: [], mono: false, typeOrder: [], generations: [], megaOnly: false, megaDebut: [] });
export function toggleTypeSelection(selected, type) {
  if (selected.includes(type)) return selected.filter(t => t !== type);
  return [...selected.slice(-1), type];
}
export function toggleTypeOrMono(filters, key) {
  const current = filters.typeOrder || [...filters.types, ...(filters.mono ? ['單屬性'] : [])];
  const typeOrder = toggleTypeSelection(current, key);
  return {...filters, typeOrder, types: typeOrder.filter(t => t !== '單屬性'), mono: typeOrder.includes('單屬性')};
}
export function filterPokemon(data, f) {
  const q = f.query.trim().toLowerCase();
  return data.filter(p => p.available !== false &&
    (!q || `${p.name} ${p.en} ${p.dex}`.toLowerCase().includes(q)) &&
    f.types.every(t => p.types.includes(t)) && (!f.mono || p.types.length === 1) &&
    (!f.generations.length || f.generations.includes(p.generation)) &&
    (!f.megaOnly || p.mega) &&
    (!f.megaDebut?.length || (p.mega && f.megaDebut.includes(p.megaDebut))))
    .sort((a,b) => a.dex-b.dex || Number(a.id.includes('-'))-Number(b.id.includes('-')));
}
