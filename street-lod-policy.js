// Keep full detail around the player. Hysteresis prevents boundary flicker.
export const STREET_LOD_DISTANCES={middle:32,far:65,hysteresis:3};
export function streetDetailLevel(distance,previous=0){
 const {middle,far,hysteresis}=STREET_LOD_DISTANCES;
 if(previous===2&&distance>=far-hysteresis)return 2;
 if(distance>=far)return 2;
 if(previous>=1&&distance>=middle-hysteresis)return 1;
 return distance>=middle?1:0;
}
