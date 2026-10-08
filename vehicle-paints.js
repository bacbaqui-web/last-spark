// Neutral paints are deliberately more frequent; these are art weights, not sales statistics.
export const VEHICLE_PAINTS = Object.freeze([
  {id:'white', name:'화이트', color:'#e4e2d9', weight:28},
  {id:'black', name:'블랙', color:'#292c30', weight:20},
  {id:'silver', name:'실버', color:'#adb3b8', weight:18},
  {id:'gray', name:'그레이', color:'#656b70', weight:14},
  {id:'red', name:'레드', color:'#a83831', weight:7},
  {id:'blue', name:'딥 블루', color:'#315b83', weight:7},
  {id:'beige', name:'베이지', color:'#bdac8c', weight:4},
  {id:'olive', name:'올리브', color:'#657052', weight:2},
].map(Object.freeze));

export function vehiclePaint(id) {
  const paint = VEHICLE_PAINTS.find(p => p.id === id);
  if (!paint) throw new RangeError(`Unknown vehicle paint: ${id}`);
  return paint;
}

export function pickVehiclePaint(seed) {
  // A separate hash leaves the existing street layout's random sequence untouched.
  let hash = 2166136261;
  for (const char of String(seed)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = (hash ^ (hash >>> 16)) >>> 0;
  let choice = hash / 4294967296 * VEHICLE_PAINTS.reduce((sum, p) => sum + p.weight, 0);
  return VEHICLE_PAINTS.find(p => (choice -= p.weight) < 0) || VEHICLE_PAINTS.at(-1);
}

export function resolveVehiclePaint(vehicle, {paintId, color, seed} = {}) {
  if (color) return {id:'custom', name:'직접 선택', color};
  if (paintId) return vehiclePaint(paintId);
  if (seed !== undefined) return pickVehiclePaint(`${vehicle.id}:${seed}`);
  return vehicle.paintId ? vehiclePaint(vehicle.paintId) : {id:'custom', name:'기본 도장', color:vehicle.color};
}
