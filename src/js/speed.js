// Champions stat points (0..32). Battle modifier edge cases remain provisional.
export const RULES = { level: 50, offset: 20, maxSP: 32, abilityMultiplier: 2 };
export const freshState = () => ({ tailwind: false, abilitySpeedBoost: false, paralyzed: false, stage: 0 });
export const itemMultiplier = item => item === 'scarf' ? 1.5 : item === 'iron-ball' ? .5 : 1;
export function stat(base, sp = 0, nature = 1) {
  if (!Number.isInteger(sp) || sp < 0 || sp > RULES.maxSP) throw new RangeError('速度努力值 SP 必須為 0–32 的整數');
  return Math.floor((base + RULES.offset + sp) * Math.round(nature * 10) / 10);
}
export function modified(speed, state, item = 1) {
  const s = state.stage;
  const staged = Math.floor(speed * (s >= 0 ? (2 + s) / 2 : 2 / (2 - s)));
  return Math.max(1, Math.floor(staged * item * (state.tailwind ? 2 : 1) * (state.abilitySpeedBoost ? RULES.abilityMultiplier : 1) * (state.paralyzed ? .5 : 1)));
}
export function ranges(p, state) {
  return { min: modified(stat(p.speed, 0, .9), state), max: modified(stat(p.speed, 32, 1.1), state),
    items: p.mega ? [] : [
      { label: '圍巾極速', value: modified(stat(p.speed, 32, 1.1), state, 1.5) },
      { label: '圍巾滿速', value: modified(stat(p.speed, 32, 1), state, 1.5) },
      { label: '黑色鐵球 0 速', value: modified(stat(p.speed, 0, .9), state, .5) }
    ] };
}
