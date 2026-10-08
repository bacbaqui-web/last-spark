import * as THREE from 'three';

const cache=new Map();
const names=['field','swift','halo','bulwark','kite','lamella','patch','barrel','rail','carapace'];
const fract=x=>x-Math.floor(x),hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
export const EQUIPMENT_PAINTS={
  steel:{name:'철회색',color:'#858e8a'},teal:{name:'청록',color:'#477c83'},orange:{name:'안전 주황',color:'#b4753d'},
  red:{name:'적갈색',color:'#934e43'},olive:{name:'올리브',color:'#77805a'},ivory:{name:'아이보리',color:'#c7c4ad'},
};
const noise=(x,y)=>{const a=Math.floor(x),b=Math.floor(y),u=fract(x),v=fract(y),sx=u*u*(3-2*u),sy=v*v*(3-2*v);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(a,b),hash(a+1,b),sx),THREE.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),sx),sy);};
// Shared grey paint for all variants; service details live in color, normal and roughness maps.
export function exoskeletonSurface(id,{paint=null,wear=.15,mark=0}={}){
  const key=paint?`${id}-${paint}-${wear}-${mark}`:id;
  if(cache.has(key))return cache.get(key);
  const seed=names.indexOf(id)+1,size=paint?256:512,pixels=size*size,color=new Uint8Array(pixels*4),orm=new Uint8Array(pixels*4),height=new Uint8Array(pixels);
  const rgb=paint?new THREE.Color(EQUIPMENT_PAINTS[paint]?.color||EQUIPMENT_PAINTS.steel.color).convertLinearToSRGB():null;
  const base=rgb?rgb.toArray().map(v=>v*255):[121,126,122],ink=[42,50,48],edge=[162,167,158],label=[204,198,173];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,n=hash(x+seed,y),cloud=Math.sin(x*.04+seed)*Math.sin(y*.027)*.013;
    for(let c=0;c<3;c++)color[i*4+c]=base[c]*(.95+n*.07+cloud);
    color[i*4+3]=orm[i*4+3]=255;orm[i*4]=255;orm[i*4+1]=187+n*22;orm[i*4+2]=170; height[i]=150+n*6;
  }
  const pixel=(x,y,rgb,h=147,rough=192,metal=145)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=size||y>=size)return;const i=y*size+x;for(let c=0;c<3;c++)color[i*4+c]=rgb[c];height[i]=h;orm[i*4+1]=rough;orm[i*4+2]=metal;};
  function line(a,b,rgb=ink,width=1,h=104){const steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*size);for(let i=0;i<=steps;i++){const t=steps?i/steps:0;for(let dy=-width;dy<=width;dy++)for(let dx=-width;dx<=width;dx++)pixel((a[0]+(b[0]-a[0])*t)*size+dx,(a[1]+(b[1]-a[1])*t)*size+dy,rgb,h);}}
  function path(points,rgb=ink,width=1,h=104){for(let i=1;i<points.length;i++)line(points[i-1],points[i],rgb,width,h);}
  function rect(x,y,w,h,rgb,z=150){for(let py=y*size;py<(y+h)*size;py++)for(let px=x*size;px<(x+w)*size;px++)pixel(px,py,rgb,z);}
  function screw(u,v){for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++){const r=Math.hypot(x,y);if(r>6)continue;pixel(u*size+x,v*size+y,r>4.3?ink:Math.abs(y)<1&&Math.abs(x)<3?ink:edge,r>4.3?95:181,128,215);}}
  path([[.09,.10],[.19,.045],[.81,.045],[.91,.10],[.91,.84],[.79,.955],[.21,.955],[.09,.84],[.09,.10]]);
  path([[.105,.14],[.105,.82],[.23,.935],[.77,.935],[.895,.82]],edge,0,166);
  if(['halo','swift','kite','carapace'].includes(id)){
    for(const side of[-1,1]){const pts=[];for(let n=0;n<=30;n++){const t=n/30;pts.push([.5+side*(.13+.20*Math.sin(t*Math.PI*.82)),.16+t*.65]);}path(pts);}
    path([[.3,.78],[.43,.84],[.57,.84],[.70,.78]]);
  }else if(['lamella','barrel'].includes(id)){
    for(const y of[.24,.45,.67])path([[.13,y+.04],[.27,y],[.73,y],[.87,y+.04]]);
  }else{
    path([[.19,.24],[.27,.17],[.74,.17],[.81,.24],[.81,.65],[.73,.74],[.27,.74],[.19,.65],[.19,.24]]);
    path([[.21,.25],[.21,.64],[.29,.716],[.71,.716]],edge,0,161);
  }
  for(const [u,v]of[[.15,.13],[.85,.13],[.17,.84],[.83,.84]])screw(u,v);
  const ventY=id==='halo'?.64:.52;
  for(let i=0;i<(id==='swift'?3:5);i++){
    const y=ventY+i*.025;line([.34,y],[.66,y],ink,2,87);line([.34,y+.009],[.66,y+.009],edge,0,174);
  }
  rect(.28,.29,.24,.049,label);rect(.30,.312,.08,.005,ink);
  // Small stencil ID and calibration marks, still just pixels on a broad shell.
  const digits=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111'];
  const serial=mark||seed;
  for(const [offset,digit]of[[0,Math.floor(serial/10)%10],[.033,serial%10]])for(let y=0;y<5;y++)for(let x=0;x<3;x++)if(digits[digit][y*3+x]==='1')rect(.58+offset+x*.009,.296+y*.009,.006,.006,ink);
  for(let i=0;i<12;i++)rect(.29+i*.016,.40,.005,i%3===0?.038:.022,ink,131);
  for(let i=0;i<70;i++){
    const x=.11+hash(i,seed)*.78,y=.09+hash(i,seed+20)*.80,len=.006+hash(i,33)*.026;
    line([x,y],[Math.min(.90,x+len),y+.008],i%5?edge:[93,86,72],0,139);
  }
  if(id==='patch'){
    path([[.56,.07],[.63,.21],[.57,.26],[.62,.41]],edge,2,172);
    rect(.19,.775,.29,.045,[75,82,77]);for(let i=0;i<6;i++)line([.21+i*.043,.78],[.23+i*.043,.811],label,1,149);
  }
  if(id==='bulwark'||id==='field')for(let i=0;i<6;i++)line([.30+i*.067,.85],[.33+i*.067,.89],[67,76,70],2,146);
  if(paint)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,u=x/size,v=y/size,n=noise(x/19+seed*3,y/19+mark),grain=hash(x+mark,y);
    const seam=Math.min(Math.abs(u-.09),Math.abs(u-.91),Math.abs(v-.045),Math.abs(v-.955));
    // Broken edge chips and sparse clustered corrosion, with intact paint between them.
    const exposed=(seam<.012+n*.018&&n>.42)||(n>.76-wear*.12&&noise(x/5,y/5)>.48);
    if(!exposed)continue;
    const rusty=grain>.26,rust=[100+grain*39,49+grain*24,27+grain*16];
    for(let c=0;c<3;c++)color[i*4+c]=rusty?rust[c]:[135,140,134][c]+grain*20;
    height[i]=rusty?137+grain*9:131;orm[i*4+1]=rusty?234:158;orm[i*4+2]=rusty?57:230;
  }
  const normals=new Uint8Array(pixels*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,at=(a,b)=>height[Math.max(0,Math.min(size-1,b))*size+Math.max(0,Math.min(size-1,a))]/255;
    const n=new THREE.Vector3((at(x-1,y)-at(x+1,y))*.8,(at(x,y-1)-at(x,y+1))*.8,1).normalize();
    normals[i*4]=(n.x*.5+.5)*255;normals[i*4+1]=(n.y*.5+.5)*255;normals[i*4+2]=(n.z*.5+.5)*255;normals[i*4+3]=255;
  }
  function texture(data,srgb=false){const t=new THREE.DataTexture(data,size,size);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;}
  const packed=texture(orm),material=new THREE.MeshStandardMaterial({name:'exo-'+key,map:texture(color,true),normalMap:texture(normals),roughnessMap:packed,metalnessMap:packed,metalness:1,roughness:1,normalScale:new THREE.Vector2(.55,.55)});
  material.userData.sharedSalvageMaterial=true;material.userData.textureDetail='exoskeleton';material.userData.paint=paint;material.userData.salvageColor=new THREE.Color(...base.map(n=>n/255)).convertSRGBToLinear();cache.set(key,material);return material;
}
