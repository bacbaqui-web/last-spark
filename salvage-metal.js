import * as THREE from 'three';

// Original, deterministic PBR surfaces. No network assets or canvas dependency.
const cache = new Map();
const fract = n => n - Math.floor(n);
const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), u = fract(x), v = fract(y);
  const a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), a), THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), a), b);
}
const palettes = {
  steel: [112, 117, 111], pale: [157, 156, 138], dark: [53, 59, 57], iron: [98, 102, 99],
  ochre: [168, 121, 53], blue: [67, 101, 105], copper: [108, 67, 43], pcb: [29, 66, 51],
};
export function salvageMetal(kind = 'steel', detail = false) {
  const key = kind + (detail ? '-' + (typeof detail==='string'?detail:'panel') : '');
  if (cache.has(key)) return cache.get(key);
  const size = detail ? 512 : 256, color = new Uint8Array(size * size * 4), surface = new Uint8Array(size * size * 4), height = new Uint8Array(size * size * 4);
  const base = palettes[kind] || palettes.steel;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, grain = hash(x, y), cloud = noise(x / 31, y / 31), pitting = noise(x / 5, y / 5);
    const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
    const chip = edge < .6 + pitting * 2 || (detail && cloud > .78 && pitting > .61);
    const rust = chip && cloud > .55;
    const scratch = (x + Math.floor(y / 25) * 19) % 103 < 1 && grain > .3;
    const dirt = .88 + cloud * .12 + (grain - .5) * .035;
    const rgb = rust ? [93 + grain * 37, 49 + grain * 17, 28 + grain * 11] : chip || scratch ? [149, 152, 142] : base;
    for (let c = 0; c < 3; c++) color[i + c] = rgb[c] * dirt;
    color[i + 3] = surface[i + 3] = height[i + 3] = 255;
    surface[i] = 255;
    surface[i + 1] = rust ? 238 : chip ? 123 : 192 + grain * 25;
    surface[i + 2] = kind==='pcb'?18:rust ? 28 : chip ? 229 : kind === 'dark' ? 115 : 161;
    const h = rust ? 75 + grain * 55 : scratch ? 80 : 157 + grain * 20;
    height[i] = height[i + 1] = height[i + 2] = h;
    if(kind==='iron') {
      // Mostly intact grey iron, with only a few faint oxide stains.
      const oxide=THREE.MathUtils.smoothstep(noise(x/19,y/19)*.5+noise(x/4,y/4)*.5,.64,.82)*.42;
      const rubbed=scratch&&grain>.68,flake=noise(x/2.7,y/2.7);
      const rustColor=[94+flake*14,65+flake*10,42+flake*9];
      for(let c=0;c<3;c++)color[i+c]=rubbed?[140,139,128][c]:THREE.MathUtils.lerp(base[c]*(.94+cloud*.10),rustColor[c],oxide)*(.96+grain*.07);
      surface[i+1]=rubbed?142:200+oxide*43;surface[i+2]=rubbed?224:177-oxide*151;
      height[i]=height[i+1]=height[i+2]=150+flake*12-oxide*(9+grain*14);
    }
  }
  if (detail) {
    // Seams, recessed service panel, screw heads, vents and labels are painted
    // into the maps. The equipment carrying them remains a single low-poly block.
    function pixel(x,y,rgb,h=140,rough=185,metal=130) {
      if(x<0||y<0||x>=size||y>=size)return;
      const i=(y*size+x)*4, wear=hash(x,y), shade=.94+noise(x/30,y/30)*.07;
      for(let c=0;c<3;c++)color[i+c]=rgb[c]*shade;
      height[i]=height[i+1]=height[i+2]=h;surface[i+1]=rough;surface[i+2]=metal;
      if(wear>.984){for(let c=0;c<3;c++)color[i+c]=[134,128,111][c];height[i]=height[i+1]=height[i+2]=135;}
    }
    function rect(x,y,w,h,rgb,z=140,rough=185,metal=130) {
      for(let py=Math.round(y*size);py<Math.round((y+h)*size);py++)for(let px=Math.round(x*size);px<Math.round((x+w)*size);px++)pixel(px,py,rgb,z,rough,metal);
    }
    const edgeColor=base.map(c=>c*.47), highlight=base.map(c=>Math.min(220,c*1.24));
    function line(a,b,rgb,width=2,h=160,metal=130){
      const steps=Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))*size);
      for(let n=0;n<=steps;n++)for(let dx=-width;dx<=width;dx++)for(let dy=-width;dy<=width;dy++){
        const f=steps?n/steps:0;pixel(Math.round((a[0]+(b[0]-a[0])*f)*size)+dx,Math.round((a[1]+(b[1]-a[1])*f)*size)+dy,rgb,h,185,metal);
      }
    }
    if(detail==='rib-door') {
      // Wide stamped ridges, mirrored by door UVs, suggest ribs without open bones.
      for(const row of [.29,.44,.60,.75]){
        for(let step=0;step<350;step++){
          const u=.06+step/350*.84,v=row+.12*Math.sin((u-.04)*1.50);
          const x=Math.round(u*size),y=Math.round(v*size);
          for(let d=-7;d<=11;d++)pixel(x,y+d,d<0?base.map(c=>c*.38):d<4?highlight:base.map(c=>c*1.09),d<0?82:d<4?205:178,185,145);
        }
      }
      rect(.015,.12,.014,.76,edgeColor,92);rect(.041,.16,.016,.70,highlight,175);
      rect(.12,.11,.16,.019,edgeColor,130);rect(.13,.116,.09,.005,[190,185,157],150);
    } else if(detail==='pcb') {
      for(let n=0;n<42;n++){
        const x=.05+hash(n,8)*.90,y=.04+hash(n,19)*.91,dx=(n%2?1:-1)*(.04+hash(n,37)*.14),dy=(n%3?1:-1)*.055;
        const rgb=n%3?[112,127,78]:[160,133,73],bend=[x+dx,y+dy];
        line([x,y],[x+dx*.45,y],rgb,1,170,185);line([x+dx*.45,y],bend,rgb,1,170,185);line(bend,[bend[0],bend[1]+dy],rgb,1,170,185);
        rect(x-.007,y-.007,.014,.014,[175,151,92],180,110,225);rect(x-.003,y-.003,.006,.006,[24,34,28],85);
      }
      for(let n=0;n<15;n++){
        const x=.08+hash(n,73)*.76,y=.08+hash(n,64)*.76,w=.035+hash(n,93)*.07,h=.025+hash(n,77)*.045;
        rect(x-.007,y-.006,w+.014,h+.012,[174,164,126],174,130,215);rect(x,y,w,h,[29,35,32],190,205,35);
        rect(x+.009,y+.009,w*.43,.006,[124,137,113],193);
      }
    } else if(detail==='module') {
      for(const x of [.06,.91])rect(x,.08,.025,.84,edgeColor,90);
      rect(.21,.29,.58,.46,[32,40,37],88);rect(.28,.37,.44,.28,base.map(c=>c*.58),140);
      for(let i=0;i<6;i++)rect(.25+i*.085,.39,.025,.24,highlight,190,105,215);
      rect(.20,.12,.59,.08,[178,175,150],151,225,25);rect(.25,.15,.21,.015,[49,58,51],138);
      for(let n=0;n<6;n++)rect(.24+n*.086,.80,.043,.09,[156,128,71],179,115,225);
      rect(.72,.17,.035,.034,[103,180,146],163);
    } else if(detail==='foot') {
      // Folded plate edges and worn seams; the foot itself stays a few wedges.
      for(const x of [.055,.945])line([x,.055],[x,.945],highlight,1,182,205);
      for(const y of [.055,.945])line([.055,y],[.945,y],highlight,1,182,205);
      line([.08,.31],[.29,.25],edgeColor,2,95);line([.29,.25],[.72,.25],edgeColor,2,95);
      line([.72,.25],[.92,.31],edgeColor,2,95);
      for(let n=0;n<70;n++){
        const x=hash(n,18)*size,y=hash(n,53)*size,l=3+hash(n,12)*19;
        for(let k=0;k<l;k++)if(hash(n,k)>.27)pixel(Math.floor(x+k),Math.floor(y+k*.18),n%3?[133,137,127]:[108,63,39],126,185,n%3?211:30);
      }
    } else if(detail==='chest') {
      // Broad rib-like service seams on the enclosing chest, rather than 3D ribs.
      for(const y of [.20,.31,.43,.56,.68])for(const side of [-1,1]) {
        for(let step=0;step<68;step++) {
          const x=Math.round((.5+side*(.33+step*.0008))*size),py=Math.round((y+step*.00038)*size);
          for(let d=0;d<3;d++)pixel(x,py+d,edgeColor,105);
        }
      }
      rect(.19,.85,.62,.009,edgeColor,100);rect(.21,.83,.58,.004,highlight,175);
      rect(.38,.08,.24,.029,[64,69,62],110);rect(.405,.086,.19,.013,[171,167,143],155);
      for(const u of [.267,.5,.733]){rect(u-.034,.79,.068,.020,[49,58,54],100);rect(u-.023,.795,.009,.01,[181,184,152],155);}
      for(const [u,v] of [[.18,.83],[.82,.83],[.25,.16],[.75,.16]]) {
        rect(u-.009,v-.009,.018,.018,edgeColor,92);rect(u-.004,v-.004,.008,.008,highlight,180);
      }
    } else {
    for(const x of [.065,.927]){rect(x,.065,.006,.87,edgeColor,95);rect(x+.007,.067,.002,.862,highlight,170);}
    for(const y of [.065,.93]){rect(.065,y,.87,.006,edgeColor,95);rect(.07,y+.007,.85,.002,highlight,170);}
    rect(.16,.32,.68,.40,edgeColor,102);rect(.167,.326,.666,.386,base.map(c=>c*.8),125);
    for(let n=0;n<6;n++){const y=.373+n*.051;rect(.235,y,.53,.018,[30,35,34],65);rect(.235,y+.019,.53,.004,highlight,155);}
    rect(.17,.16,.39,.058,[197,190,162],160,228,35);
    rect(.17,.245,.20,.016,[202,197,172],155,226,35);
    for(let n=0;n<9;n++)rect(.62+n*.019,.16,.008,.073,[40,48,45],147);
    rect(.17,.80,.66,.07,[150,121,64],149,218,60);
    for(let y=Math.floor(.80*size);y<.87*size;y++)for(let x=Math.floor(.17*size);x<.83*size;x++)if((x+y)%38<17)pixel(x,y,[56,60,52],145);
    for(const [u,v] of [[.10,.10],[.90,.10],[.10,.90],[.90,.90]]) {
      const cx=Math.round(u*size),cy=Math.round(v*size);
      for(let y=-8;y<=8;y++)for(let x=-8;x<=8;x++) {
        const r=Math.hypot(x,y);if(r>7.3)continue;
        const slot=Math.abs(y)<1.3&&Math.abs(x)<4.2;
        pixel(cx+x,cy+y,r>5.5?[40,44,41]:slot?[50,54,49]:[166,169,153],r>5.5?95:slot?115:195,110,230);
      }
    }
    // A few long rubbed edges and fine scratches break up the printed panel.
    for(let n=0;n<26;n++) {
      const x=Math.floor(hash(n,18)*size),y=Math.floor(hash(n,43)*size),length=6+Math.floor(hash(n,82)*30);
      for(let k=0;k<length;k++)if(hash(n,k)>.24)pixel(x+k,y+Math.floor(k*.13),[155,154,140],128,153,220);
    }
    }
  }
  const texture = (data, srgb = false) => {
    const t = new THREE.DataTexture(data, size, size);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.needsUpdate = true;
    return t;
  };
  const normals = new Uint8Array(height.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (a, b) => height[(((b + size) % size) * size + (a + size) % size) * 4] / 255;
    const n = new THREE.Vector3((at(x - 1, y) - at(x + 1, y)) * .8, (at(x, y - 1) - at(x, y + 1)) * .8, 1).normalize();
    const i = (y * size + x) * 4;
    normals[i] = (n.x * .5 + .5) * 255; normals[i + 1] = (n.y * .5 + .5) * 255; normals[i + 2] = (n.z * .5 + .5) * 255; normals[i + 3] = 255;
  }
  const map = texture(color, true), packed = texture(surface), normalMap = texture(normals);
  const normalStrength=detail?.8:kind==='iron'?.30:.22;
  const material = new THREE.MeshStandardMaterial({name: 'reclaimed-' + key, map, roughnessMap: packed, metalnessMap: packed, normalMap, normalScale: new THREE.Vector2(normalStrength,normalStrength), metalness: 1, roughness: 1});
  material.userData.sharedSalvageMaterial = true;
  material.userData.salvageColor = new THREE.Color(...base.map(n=>n/255)).convertSRGBToLinear();
  material.userData.textureDetail = detail;
  cache.set(key, material);
  return material;
}

export const salvageChrome = new THREE.MeshStandardMaterial({name: 'wiped-piston-steel', color: 0x969d99, metalness: .88, roughness: .29});
export const salvageRubber = new THREE.MeshStandardMaterial({name: 'old-rubber', color: 0x202a29, roughness: .94});
export const salvageOptic = new THREE.MeshStandardMaterial({name: 'live-optics', color: 0x8fd8d8, emissive: 0x41b6c5, emissiveIntensity: 1.2, roughness: .25, metalness: .35});
for (const material of [salvageChrome, salvageRubber, salvageOptic]) material.userData.sharedSalvageMaterial = true;
