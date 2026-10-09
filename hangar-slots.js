export const HANGAR_SLOT_COUNT=5;
// Old saves fill free berths in order; explicit berths survive new builds and losses.
export function hangarSlots(frames){const slots=Array(HANGAR_SLOT_COUNT).fill(null),pending=[];for(const f of frames){if(Number.isInteger(f.hangarSlot)&&f.hangarSlot>=0&&f.hangarSlot<HANGAR_SLOT_COUNT&&!slots[f.hangarSlot])slots[f.hangarSlot]=f;else pending.push(f);}for(const f of pending){const i=slots.indexOf(null);if(i<0)break;slots[i]=f;}return slots;}
