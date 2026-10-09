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
 return new THREE.MeshStandardMaterial({map,color:0xaaa89c,metalness:.22,roughness:.9});
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
}
