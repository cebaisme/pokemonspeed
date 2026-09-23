// Original SVG assets supplied by the user in poke.zip, in type1..type18 order.
import { TYPES } from './filters.js';
export function typeIcon(type) {
  if (!TYPES.includes(type)) throw new Error('Unknown Pokemon type');
  return `<img class="type-icon-image" src="./assets/types/${type}.svg" width="36" height="36" alt="" aria-hidden="true"><span class="type-check" aria-hidden="true">✓</span>`;
}
