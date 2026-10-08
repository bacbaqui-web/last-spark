import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {salvageMetal, salvageRubber, salvageChrome, salvageOptic} from './salvage-metal.js';

// Socket and cartridge transforms are shared, independent of inventory ordering.
export const CHEST_SLOTS = [
  {index:0,position:[-.046,.070,.019],size:[.063,.060,.038],angle:.09},
  {index:1,position:[.047,.005,.024],size:[.063,.065,.038],angle:-.075},
  {index:2,position:[-.029,-.073,.018],size:[.067,.055,.036],angle:.07},
];
const wireMaterials=Object.fromEntries(Object.entries({red:0x914c38,ochre:0xbaa475,blue:0x4e8f94,black:0x252e2b}).map(([name,color])=>{
  const material=new THREE.MeshStandardMaterial({name:'insulated-wire-'+name,color,roughness:.68,metalness:.15});
  material.userData.sharedSalvageMaterial=true;return [name,material];
}));
export function chestArmorGeometry(){
  const g=new THREE.SphereGeometry(1,12,8,Math.PI,Math.PI,.25,Math.PI-.5);g.scale(.133,.156,.092);return g;
}
// Broad curved rib plates leave narrow slits into the closed chest.
function doorGeometry(side){
  const strips=[];
  function strip(rows,columns,surface){
    const positions=[],uv=[],indices=[];
    for(let layer=0;layer<2;layer++)for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
      const [theta,phi]=surface(row/rows,col/columns);
      const x=side*(.0025+(.123-layer*.004)*Math.sin(theta)*Math.sin(phi));
      const y=(.151-layer*.004)*Math.cos(theta),z=(.096-layer*.006)*Math.sin(theta)*Math.cos(phi);
      positions.push(x,y,z);uv.push(.12+Math.abs(x)/.17,.10+(y+.151)/.38);
    }
    const span=(rows+1)*(columns+1);
    for(let layer=0;layer<2;layer++)for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const a=layer*span+row*(columns+1)+col,b=a+1,c=a+columns+1,d=c+1;
      if((side===1)===(layer===0))indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
    }
    const edge=(a,b)=>{if(side===1)indices.push(a,a+span,b,b,a+span,b+span);else indices.push(a,b,a+span,b,b+span,a+span);};
    for(let col=0;col<columns;col++){edge(col+1,col);edge(rows*(columns+1)+col,rows*(columns+1)+col+1);}
    for(let row=0;row<rows;row++){edge(row*(columns+1),(row+1)*(columns+1));edge((row+1)*(columns+1)+columns,row*(columns+1)+columns);}
    for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();strips.push(g);
  }
  // Filled ends and wider borders keep the electronics only partly exposed.
  strip(14,1,(v,u)=>[.08+(Math.PI-.16)*v,.10*u]);
  strip(14,1,(v,u)=>[.08+(Math.PI-.16)*v,1.355+.160*u]);
  strip(2,8,(v,u)=>{
    const phi=1.515*u,end=Math.acos((.116+.024*Math.sin(phi))/.151);
    return [.08+(end-.08)*v,phi];
  });
  strip(4,8,(v,u)=>{
    const phi=1.515*u,start=Math.acos((-.110+.024*Math.sin(phi))/.151);
    return [start+(Math.PI-.08-start)*v,phi];
  });
  for(const height of [.096,.035,-.030,-.090]){
    strip(1,10,(v,u)=>{
      const phi=1.515*u,y=height+.024*Math.sin(phi)+(.5-v)*.040;
      return [Math.acos(y/.151),phi];
    });
  }
  const merged=mergeGeometries(strips);strips.forEach(g=>g.dispose());return merged;
}
export function createChestMechanism(chest){
  const doors=[],pale=salvageMetal('iron'),dark=salvageMetal('dark'),steel=salvageMetal('iron');
  function add(parent,geometry,material,position=[0,0,0],rotation){
    const m=new THREE.Mesh(geometry,material);m.position.fromArray(position);if(rotation)m.rotation.set(...rotation);
    m.castShadow=m.receiveShadow=true;m.userData.cosmetic=true;m.userData.salvageFrame=true;parent.add(m);return m;
  }
  const box=(parent,size,pos,mat=dark)=>add(parent,new THREE.BoxGeometry(...size),mat,pos);
  function cable(points,color='black',radius=.0023){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return add(chest,new THREE.TubeGeometry(curve,14,radius,5,false),wireMaterials[color]);
  }
  const back=new THREE.SphereGeometry(1,20,12,Math.PI,Math.PI);back.scale(.125,.151,.083);add(chest,back,pale);
  const liner=new THREE.SphereGeometry(1,20,12,Math.PI,Math.PI);liner.scale(.12,.145,.077);
  const reversed=liner.index.array;for(let i=0;i<reversed.length;i+=3)[reversed[i+1],reversed[i+2]]=[reversed[i+2],reversed[i+1]];
  liner.computeVertexNormals();add(chest,liner,salvageRubber);
  const rim=new THREE.TorusGeometry(1,.025,5,36);rim.scale(.125,.151,.16);add(chest,rim,steel,[0,0,.002]);
  const outline=new THREE.Shape();outline.moveTo(-.047,.124);outline.lineTo(.053,.121);outline.lineTo(.093,.058);
  outline.lineTo(.088,-.052);outline.lineTo(.042,-.126);outline.lineTo(-.045,-.12);outline.lineTo(-.091,-.041);outline.lineTo(-.094,.062);outline.closePath();
  const board=new THREE.ExtrudeGeometry(outline,{depth:.006,bevelEnabled:false});board.translate(0,0,-.028);
  for(let i=0;i<board.attributes.position.count;i++)board.attributes.uv.setXY(i,board.attributes.position.getX(i)/.2+.5,board.attributes.position.getY(i)/.27+.5);
  add(chest,board,salvageMetal('pcb','pcb'));
  box(chest,[.039,.038,.014],[.003,.006,-.012],salvageRubber);
  for(const x of [-.011,-.005,.001,.007,.013])box(chest,[.002,.032,.005],[x,.006,-.001],steel);
  for(const y of [-.037,-.050,-.063])box(chest,[.021,.008,.009],[.071,y,-.010],salvageChrome);
  for(const x of [.045,.063,.081])add(chest,new THREE.CylinderGeometry(.006,.006,.02,8),steel,[x,.085,-.008],[Math.PI/2,0,0]);
  for(const y of [.060,.050])add(chest,new THREE.CircleGeometry(.0028,8),salvageOptic,[.075,y,.001]);
  for(const [x,y] of [[-.089,.037],[-.086,-.025],[.074,.042],[-.012,-.119]]){
    box(chest,[.020,.011,.012],[x,y,-.008],salvageRubber);
    for(const dx of [-.006,0,.006])box(chest,[.002,.007,.002],[x+dx,y,0],salvageChrome);
  }
  for(const slot of CHEST_SLOTS){
    const [x,y,z]=slot.position,[w,h]=slot.size,transform=new THREE.Matrix4().makeRotationZ(slot.angle);transform.setPosition(x,y,z-.016);
    const put=(size,offset,mat)=>{const g=new THREE.BoxGeometry(...size);g.translate(...offset);g.applyMatrix4(transform);return add(chest,g,mat);};
    put([w+.008,h+.008,.011],[0,0,0],salvageRubber);
    for(const sign of [-1,1])put([.004,h+.013,.021],[sign*(w/2+.004),0,.007],steel);
    for(const sign of [-1,1])put([w+.009,.004,.015],[0,sign*(h/2+.003),.004],dark);
    for(let pin=0;pin<5;pin++)put([.003,.009,.003],[-.012+pin*.006,-h*.34,.009],salvageChrome);
  }
  // Harnesses route around and between modules to visible board connectors.
  cable([[-.063,.108,.004],[-.070,.106,.023],[-.108,.052,.020],[-.10,-.02,.032],[-.083,-.083,.02],[-.053,-.101,.014]],'ochre');
  cable([[-.044,.107,.009],[-.083,.119,.028],[-.104,.06,.034],[-.093,-.016,.037],[-.075,-.077,.023],[-.047,-.10,.020]],'black',.003);
  cable([[.02,.035,.022],[.019,.074,.035],[.067,.116,.018],[.104,.06,.026],[.100,-.005,.022],[.084,-.035,.017]],'red');
  cable([[.080,-.031,.02],[.099,-.065,.033],[.061,-.114,.036],[.002,-.121,.028],[-.013,-.101,.02]],'blue');
  cable([[-.03,.032,.03],[-.033,.012,.043],[-.052,-.003,.039],[-.058,-.027,.028]],'red',.0025);
  cable([[-.008,.069,.026],[.011,.051,.044],[.025,.033,.038]],'blue');
  cable([[-.059,-.048,.026],[-.081,-.028,.031],[-.074,.002,.029],[-.008,.004,.017]],'ochre');
  cable([[.014,-.076,.024],[.040,-.071,.031],[.044,-.047,.028],[.028,-.035,.018]],'black',.0032);
  for(const [x,y,z] of [[-.104,.05,.031],[.098,.04,.03],[.055,-.113,.034]])box(chest,[.014,.006,.01],[x,y,z],steel);
  for(const side of [-1,1]){
    const hinge=new THREE.Group();hinge.name=side===-1?'chest-door-left':'chest-door-right';hinge.position.set(side*.123,0,.006);
    hinge.userData.chestDoor=true;chest.add(hinge);
    const geometry=doorGeometry(side);geometry.translate(-side*.123,0,-.006);add(hinge,geometry,pale);
    add(chest,new THREE.CylinderGeometry(.0055,.0055,.12,8),steel,[side*.123,0,.006]).name='chest-door-hinge';
    for(const y of [-.05,.05])add(chest,new THREE.CylinderGeometry(.009,.009,.013,8),dark,[side*.123,y,.006]);
    box(hinge,[.008,.025,.008],[-side*.114,-.026,.087],steel);doors.push({group:hinge,side});
  }
  return {doors,openAmount:0,setOpen(amount){this.openAmount=THREE.MathUtils.clamp(amount,0,1);for(const {group,side} of doors)group.rotation.y=side*this.openAmount*1.92;}};
}
