import * as THREE from 'three';

// Shared, deterministic wear maps keep the workshop detailed without large image downloads.
export function workshopMetal(){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');let seed=93;const r=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 x.fillStyle='#65635b';x.fillRect(0,0,512,512);
 for(let i=0;i<15000;i++){const v=50+r()*95|0;x.fillStyle=`rgba(${v+15},${v+9},${v},${.1+r()*.3})`;x.fillRect(r()*512,r()*512,1+r()*5,1+r()*5);}
 for(let i=0;i<220;i++){const px=r()<.65?(r()<.5?r()*45:467+r()*45):r()*512,py=r()*512,rad=2+r()*24;const g=x.createRadialGradient(px,py,0,px,py,rad);g.addColorStop(0,'#392219bb');g.addColorStop(.55,'#85502b99');g.addColorStop(1,'#85502b00');x.fillStyle=g;x.fillRect(px-rad,py-rad,rad*2,rad*2);}
 for(let i=0;i<350;i++){x.fillStyle=i%3?'#8d949080':'#c2c4b650';x.fillRect(r()*512,r()*512,1+r()*6,1+r()*3);}
 x.strokeStyle='#242d2b';x.lineWidth=4;x.strokeRect(5,5,502,502);x.lineWidth=1;x.strokeStyle='#c1b9a34a';for(let i=0;i<100;i++){const px=r()*512,py=r()*512;x.beginPath();x.moveTo(px,py);x.lineTo(px+5+r()*38,py+r()*3);x.stroke();}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
 return new THREE.MeshStandardMaterial({map,bumpMap:map,bumpScale:.025,color:0xaaa89c,metalness:.35,roughness:.78});
}
export function addWorkshopDetails(root,box,metal,wood,dark,sun){
 const pipe=(parent,pts,r=.035,mat=metal)=>{const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),32,r,7,false),mat);parent.add(mesh);return mesh;};
 const label=(text,w,h,color='#b0a087')=>{const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,256,256);x.fillStyle='#292b27';x.textAlign='center';x.font='bold 36px sans-serif';text.split('|').forEach((s,i)=>x.fillText(s,128,65+i*48));for(let i=0;i<90;i++){x.fillStyle='#40342233';x.fillRect(i*31%256,i*73%256,5,2);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:1,side:THREE.DoubleSide}));return m;};
 // Shelving follows the left wall; the open fronts face the work area.
 for(const p of [[0,4.1,-4.2],[-3.8,3,-1],[3.8,3,-1]]){const light=new THREE.PointLight(0xffc782,45,9,2);light.position.set(...p);root.add(light);}
 const shelf=new THREE.Group();shelf.name='reclaimed-material-shelves';shelf.userData.action='stash';shelf.position.set(-4.55,0,-1.3);root.add(shelf);
 for(const z of [-2.45,2.45])for(const x of [-.32,.48])box(shelf,[.09,4.8,.09],[x,2.4,z],metal);
 for(let row=0;row<5;row++){const y=.16+row*.94;box(shelf,[.95,.09,5.05],[.05,y,0],metal);for(let i=0;i<10;i++){const p=new THREE.Group();p.position.set(.06,y+.1,-2.2+i*.48);shelf.add(p);if((i+row)%3===0){box(p,[.58,.43,.37],[0,.22,0],wood);box(p,[.018,.12,.16],[.3,.23,0],metal);for(const z of [-.13,.13])box(p,[.02,.4,.025],[.31,.22,z],metal);}else{const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.12,.13,.28+(i%3)*.16,10),metal);bottle.position.y=.23;p.add(bottle);box(p,[.12,.09,.12],[0,.5,0],dark);if(i%2===0){const coil=new THREE.Mesh(new THREE.TorusGeometry(.15,.03,6,16),metal);coil.position.set(.22,.2,.08);coil.rotation.y=Math.PI/2;p.add(coil);}}}}
 const cloth=label('GOOD|PARTS|LONGER|LIVES',.85,1.55);cloth.position.set(.56,2.2,1.5);cloth.rotation.y=Math.PI/2;shelf.add(cloth);
 // Conduits, junction boxes and warning plates dress both walls.
 for(const side of [-1,1]){for(let i=0;i<4;i++){pipe(root,[[side*4.82,.1,-4.8+i*.28],[side*4.82,1.8,-4.8+i*.28],[side*4.82,2,-4.4+i*.28],[side*4.82,5.8,-4.4+i*.28]],.035+i*.008);}
 for(let i=0;i<3;i++){const panel=box(root,[.16,.68,.43],[side*4.75,1.5+i*1.1,-3.8],metal);box(root,[.025,.22,.23],[side*4.65,1.6+i*1.1,-3.8],dark);for(let n=0;n<3;n++)box(root,[.03,.035,.035],[side*4.65,1.35+i*1.1+n*.08,-3.8],sun);}}
 for(const side of [-1,1])for(let i=0;i<8;i++){box(root,[.08,.07,.12],[side*4.87,1+i*.6,.8],metal);box(root,[.04,.54,3.5],[side*4.9,1+i*.6,1],wood);}
 const notice=label('STAY|REPAIR|REUSE|SURVIVE',1,1.75);notice.position.set(4.75,3.5,-2.9);notice.rotation.y=-Math.PI/2;root.add(notice);const uv=label('☢|UV|DANGER',.7,.9,'#b69a57');uv.position.set(4.76,3.8,.3);uv.rotation.y=-Math.PI/2;root.add(uv);
 for(const side of [-1,1])for(let i=0;i<3;i++){const can=new THREE.Mesh(new THREE.CylinderGeometry(.2,.22,1.1+i*.22,16),metal);can.position.set(side*(4.1-i*.16),.6,-4.1+i*.5);root.add(can);const cap=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),metal);cap.scale.y=.5;cap.position.copy(can.position).y+=.65;root.add(cap);}
 // Worn panel floor and bundled cables lead into the service console.
 for(let i=0;i<8;i++)for(let j=0;j<10;j++){const tile=box(root,[1.22,.035,1.08],[-4.35+i*1.24,.015,-5.4+j*1.1],metal);tile.material=metal;}
 for(const side of [-1,1])for(let i=0;i<4;i++)pipe(root,[[side*4,.08,-5],[side*3.8,.09,-2],[side*3.5,.1,1],[side*(2.5+i*.15),.13,4.2]],.025,dark);
 return {pipe};
}
export function dressConsole(group,box,metal,dark,w=1.45,h=1.9){
 for(const x of [-w/2-.045,w/2+.045])box(group,[.13,h+.22,.19],[x,0,.09],metal);
 for(const y of [-h/2-.045,h/2+.045])box(group,[w+.22,.13,.19],[0,y,.09],metal);
 for(const x of [-w/2,w/2])for(const y of [-h/2,h/2]){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.025,6),dark);bolt.rotation.x=Math.PI/2;bolt.position.set(x,y,.2);group.add(bolt);}
 for(let i=0;i<5;i++)box(group,[.08,.015,.02],[-.25+i*.12,-h/2-.05,.2],dark);
 const trim=new THREE.MeshStandardMaterial({color:0x89918c,metalness:.65,roughness:.55});
 for(const side of [-1,1]){for(const y of [-h*.38,h*.38]){const bracket=new THREE.Mesh(bevelHousing(.2,.28,.08,.035),metal);bracket.position.set(side*(w/2+.015),y,.22);bracket.rotation.z=side*.15;group.add(bracket);}for(let n=0;n<7;n++){const screw=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.025,8),trim);screw.rotation.x=Math.PI/2;screw.position.set(side*(w/2+.045),-h*.32+n*h*.105,.2);group.add(screw);box(group,[.018,.004,.005],[screw.position.x,screw.position.y,.216],dark);}const hinge=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.34,16),metal);hinge.rotation.z=Math.PI/2;hinge.position.set(side*(w/2+.15),-.1,0);group.add(hinge);for(const y of [-.25,.2])box(group,[.17,.11,.27],[side*(w/2+.1),y,-.03],dark);}
 const conduit=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-w*.32,-h/2-.1,.12),new THREE.Vector3(-w*.28,-h/2-.23,.2),new THREE.Vector3(w*.25,-h/2-.23,.2),new THREE.Vector3(w*.35,-h/2-.1,.12)]),24,.035,8,false),dark);group.add(conduit);

}

export function bevelHousing(w,h,d,r=.08){
 const s=new THREE.Shape(),x=-w/2,y=-h/2;r=Math.min(r,w/4,h/4);s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
 const g=new THREE.ExtrudeGeometry(s,{depth:d-.04,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.02,bevelThickness:.02,curveSegments:5});g.translate(0,0,-d/2+.02);return g;
}
export function refineWorkshop(root,box,metal,wood,dark){
 const boltGeometry=new THREE.CylinderGeometry(.024,.024,.018,6),boltMatrices=[];const dummy=new THREE.Object3D();
 function bolt(x,y,z,axis='z'){dummy.position.set(x,y,z);dummy.rotation.set(axis==='z'?Math.PI/2:0,0,axis==='x'?Math.PI/2:0);dummy.updateMatrix();boltMatrices.push(dummy.matrix.clone());}
 const tube=(p,points,r,mat=metal)=>{const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(a=>new THREE.Vector3(...a))),20,r,8,false),mat);p.add(mesh);return mesh;};
 const cylinder=(p,r,h,pos,mat=metal)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),mat);mesh.position.set(...pos);p.add(mesh);return mesh;};
 const shelf=root.getObjectByName('reclaimed-material-shelves');
 for(const z of [-2.45,2.45]){box(shelf,[.05,4.8,.22],[.49,2.4,z],metal);for(let y=.25;y<4.7;y+=.25)bolt(-4.02,y,z-1.3,'x');}
 for(let row=0;row<5;row++){const y=.16+row*.94;box(shelf,[.07,.16,5.1],[.55,y-.03,0],metal);for(let i=0;i<5;i++){const q=new THREE.Group();q.position.set(.18,y+.12,-2+i*.9);shelf.add(q);if((i+row)%2){const chassis=new THREE.Mesh(bevelHousing(.45,.3,.3,.035),metal);chassis.rotation.y=Math.PI/2;chassis.position.y=.17;q.add(chassis);for(let k=0;k<4;k++)box(q,[.02,.012,.19],[.17,.11+k*.035,0],dark);tube(q,[[.18,.23,-.12],[.25,.36,-.12],[.25,.36,.12],[.18,.23,.12]],.014);for(const z of [-.09,.09])box(q,[.03,.055,.035],[.18,.06,z],wood);}else{const cell=cylinder(q,.095,.4,[0,.2,0]);for(const yy of [.05,.32,.4])cylinder(q,.11,.025,[0,yy,0],dark);cylinder(q,.035,.07,[0,.45,0]);for(let n=0;n<4;n++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.08,.013,5,16),metal);ring.rotation.y=Math.PI/2;ring.position.set(.18,.08+n*.05,.1);q.add(ring);}}}}
 // Rear workbench drawers, vise, bottle caps and assorted repair parts.
 const table=root.getObjectByName('assembly-workbench');
 box(table,[4.5,.18,.12],[0,1.88,.76],metal);
 for(let i=0;i<4;i++){const x=-1.65+i*1.1;box(table,[1,.85,1.2],[x,1.12,-.05],metal);for(let row=0;row<3;row++){box(table,[.93,.23,.05],[x,.85+row*.27,.58],dark);tube(table,[[x-.12,.92+row*.27,.63],[x-.12,.92+row*.27,.69],[x+.12,.92+row*.27,.69],[x+.12,.92+row*.27,.63]],.018);}}
 const vise=new THREE.Group();vise.position.set(.85,2.08,.5);table.add(vise);box(vise,[.42,.08,.35],[0,0,0],metal);box(vise,[.24,.2,.22],[0,.12,0],dark);for(const x of [-.15,.14])box(vise,[.08,.12,.32],[x,.27,0],metal);const spindle=cylinder(vise,.025,.7,[0,.15,0]);spindle.rotation.z=Math.PI/2;const crank=cylinder(vise,.016,.28,[.4,.15,0]);
 for(let i=0;i<9;i++){const x=-.75+(i%5)*.33,z=-.45+Math.floor(i/5)*.4;const can=cylinder(table,.06+(i%2)*.03,.16+(i%3)*.12,[x,2.18+(i%3)*.06,z],i%2?wood:metal);cylinder(table,.045,.035,[x,can.position.y+.1+(i%3)*.06,z],dark);}
 // Different actual tools: open spanners, screwdrivers, pliers and a hammer.
 const board=new THREE.Group();board.position.set(0,0,-5.53);root.add(board);
 for(let i=0;i<13;i++){const tool=new THREE.Group();tool.position.set(-1.52+i*.25,3.35-(i%3)*.12,0);tool.rotation.z=(i%3-1)*.08;board.add(tool);if(i%4===0){box(tool,[.045,.38,.035],[0,-.2,0],metal);for(const y of [0,-.4]){const jaw=new THREE.Mesh(new THREE.TorusGeometry(.07,.025,6,14,Math.PI*1.55),metal);jaw.position.y=y;jaw.rotation.z=y?-.7:2.4;tool.add(jaw);}}else if(i%4===1){cylinder(tool,.035,.22,[0,-.32,0],wood);box(tool,[.018,.28,.018],[0,-.09,0],metal);}else if(i%4===2){for(const side of [-1,1]){const arm=box(tool,[.035,.35,.035],[side*.055,-.2,0],dark);arm.rotation.z=side*.19;const jaw=box(tool,[.025,.14,.04],[side*.025,.025,0],metal);jaw.rotation.z=-side*.2;}}else{box(tool,[.045,.4,.04],[0,-.23,0],wood);box(tool,[.19,.075,.08],[0,0,0],metal);}}
 // Flanged plumbing and cable clamps are visible at the room edges.
 for(const side of [-1,1])for(let i=0;i<3;i++){const x=side*(4.4-i*.15),z=-3.6+i*.45;cylinder(root,.09,3.7,[x,1.85,z]);for(const y of [.3,1.8,3.5]){cylinder(root,.135,.1,[x,y,z]);for(let n=0;n<4;n++){const a=n*Math.PI/2;bolt(x+Math.sin(a)*.1,y+.06,z+Math.cos(a)*.1,'y');}}const wheel=new THREE.Mesh(new THREE.TorusGeometry(.18,.024,6,20),wood);wheel.position.set(x,1.2,z+.15);root.add(wheel);for(let n=0;n<3;n++){const spoke=box(root,[.025,.32,.025],[x,1.2,z+.15],metal);spoke.rotation.z=n*Math.PI/3;}}
 const bolts=new THREE.InstancedMesh(boltGeometry,dark,boltMatrices.length);boltMatrices.forEach((m,i)=>bolts.setMatrixAt(i,m));root.add(bolts);
}
export function dressCarousel(wheel,box,metal,dark){
 for(const radius of [3.93,4.12,4.45]){const track=new THREE.Mesh(new THREE.TorusGeometry(radius,.035,6,96),metal);track.rotation.x=Math.PI/2;track.position.y=.025;wheel.add(track);}
 const bolts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.045,.045,.025,6),dark,64),dummy=new THREE.Object3D();
 for(let i=0;i<64;i++){const t=i*Math.PI*2/64;dummy.position.set(Math.sin(t)*4.25,.035,Math.cos(t)*4.25);dummy.rotation.set(0,t,0);dummy.updateMatrix();bolts.setMatrixAt(i,dummy.matrix);if(i%8===0){const p=box(wheel,[.32,.09,.5],[Math.sin(t)*4.2,.06,Math.cos(t)*4.2],metal);p.rotation.y=t;}}
 wheel.add(bolts);
}
