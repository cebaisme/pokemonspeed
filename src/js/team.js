const KEY = 'champions-speed-team-v2';
const cosmeticRepresentatives = Object.freeze({castform:'castform',vivillon:'vivillon-meadow',florges:'florges-red',furfrou:'furfrou-natural',polteageist:'polteageist-phony',alcremie:'alcremie-vanilla-cream',morpeko:'morpeko-full-belly',maushold:'maushold-family-of-four',squawkabilly:'squawkabilly-green',sinistcha:'sinistcha-unremarkable'});
const rosterId = (id, data) => data.some(p => p.id === id) ? id : cosmeticRepresentatives[id?.split('-')[0]] || id;
export function sanitizeTeam(value, data) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).filter(x => x && data.some(p => p.id === rosterId(x.id, data))).map(x => ({
    id: rosterId(x.id, data), mode: x.mode === 'direct' ? 'direct' : 'calc', sp: Number.isFinite(+x.sp) ? Math.max(0, Math.min(32, Math.trunc(+x.sp))) : 0,
    nature: [.9, 1, 1.1].includes(+x.nature) ? +x.nature : 1,
    speed: Number.isFinite(+x.speed) ? Math.max(1, Math.min(9999, Math.trunc(+x.speed))) : 100, visible: x.visible !== false,
    abilitySpeedBoost: x.abilitySpeedBoost === true,
    paralyzed: x.paralyzed === true,
    stage: Number.isInteger(+x.stage) ? Math.max(-6, Math.min(6, +x.stage)) : 0,
    item: ['scarf', 'iron-ball'].includes(x.item) && !data.find(p => p.id === x.id)?.mega ? x.item : 'none'
  }));
}
export function loadTeam(data) {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved !== null) return sanitizeTeam(JSON.parse(saved), data);
    const legacy = JSON.parse(localStorage.getItem('champions-speed-team-v1'));
    // Convert the earlier EV demo to equivalent stat investment; preserve direct speeds.
    return sanitizeTeam(Array.isArray(legacy) ? legacy.map(t => ({ ...t, sp: Math.floor((31 + Math.floor(Math.max(0, Math.min(252, Number(t.ev) || 0)) / 4)) / 2) - 15 })) : [], data);
  } catch { return []; }
}
export function saveTeam(team) { try { localStorage.setItem(KEY, JSON.stringify(team)); return true; } catch { return false; } }
