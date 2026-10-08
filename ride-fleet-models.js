import * as T from 'three';
import definitions from './ride-fleet-data.json' with {type:'json'};
import {createRecolorableCarMaterial} from './car-paint-material.js';
export const fleet=definitions;

// Every part is merged into one geometry, but frame openings stay open in 3D.
class Builder {
  constructor(d){this.d=d;this.p=[];this.uv=[];this.c=[];}
  texture(tile,u,v){return [(tile%4+.035+u*.93)/4,1-(.5+Math.floor(tile/4)*.25+.00875+v*.2325)];}
  tri(a,b,c,tile,coords=[[0,0],[1,0],[1,1]],shade=1){for(const [i,q] of [a,b,c].entries()){this.p.push(...q);this.uv.push(...this.texture(tile,...coords[i]));this.c.push(shade,shade,shade);}}
  quad(a,b,c,d,tile,shade=1,uv=[[0,0],[1,0],[1,1],[0,1]]){this.tri(a,b,c,tile,[uv[0],uv[1],uv[2]],shade);this.tri(a,c,d,tile,[uv[0],uv[2],uv[3]],shade);}
  side(a,b,c,d){for(const q of [a,b,c,a,c,d]){this.p.push(...q);this.uv.push(.04+(.5-q[2]/this.d.length)*.92,.50+q[1]/this.d.height*.46);this.c.push(1,1,1);}}
  tube(a,b,r,tile=1,n=8,r2=r){const av=new T.Vector3(...a),bv=new T.Vector3(...b),axis=bv.clone().sub(av).normalize();const u=new T.Vector3(Math.abs(axis.y)<.9?0:1,Math.abs(axis.y)<.9?1:0,0).cross(axis).normalize(),v=axis.clone().cross(u);const rings=[av,bv].map((p,j)=>Array.from({length:n},(_,i)=>p.clone().addScaledVector(u,Math.cos(i/n*Math.PI*2)*(j?r2:r)).addScaledVector(v,Math.sin(i/n*Math.PI*2)*(j?r2:r)).toArray()));for(let i=0;i<n;i++){const j=(i+1)%n;this.quad(rings[0][i],rings[0][j],rings[1][j],rings[1][i],tile,1,[[i/n,0],[(i+1)/n,0],[(i+1)/n,1],[i/n,1]]);this.tri(a,rings[0][j],rings[0][i],tile);this.tri(b,rings[1][i],rings[1][j],tile);}}
  box(center,size,tile=0){const [x,y,z]=center,[w,h,l]=size;const q=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(p=>[x+p[0]*w/2,y+p[1]*h/2,z+p[2]*l/2]);for(const face of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]])this.quad(...face.map(i=>q[i]),tile);}
  // Eight sided cross sections bevel edges without curved/subdivision surfaces.
  loft(stations,tile=0){const rings=stations.map(([z,y,w,h])=>[[-.72,-1],[.72,-1],[1,-.65],[1,.65],[.72,1],[-.72,1],[-1,.65],[-1,-.65]].map(([a,b])=>[a*w,y+b*h,z]));for(let s=0;s<rings.length-1;s++)for(let i=0;i<8;i++){const q=[rings[s][i],rings[s][(i+1)%8],rings[s+1][(i+1)%8],rings[s+1][i]];if(tile===0&&(i===2||i===6))this.side(...q);else this.quad(...q,tile);}for(const s of [0,rings.length-1]){const center=[0,stations[s][1],stations[s][0]];for(let i=0;i<8;i++)this.tri(center,rings[s][i],rings[s][(i+1)%8],tile);}}
  ring(y,z,r,minor,width,tile,segments=24){const rows=Array.from({length:segments},(_,i)=>Array.from({length:6},(_,j)=>{const a=i/segments*Math.PI*2,b=j/6*Math.PI*2;return [Math.sin(b)*width/2,y+Math.cos(a)*(r+Math.cos(b)*minor),z+Math.sin(a)*(r+Math.cos(b)*minor)];}));for(let i=0;i<segments;i++)for(let j=0;j<6;j++){const n=(i+1)%segments,k=(j+1)%6;this.quad(rows[i][j],rows[n][j],rows[n][k],rows[i][k],tile,1,[[i/segments,j/6],[(i+1)/segments,j/6],[(i+1)/segments,(j+1)/6],[i/segments,(j+1)/6]]);}}
  wheel(z,r,w,spokes=12){const m=w*.30;this.ring(r,z,r-m,m,w,5);this.ring(r,z,r-w*.65,w*.09,w*.70,4);this.tube([-w*.55,r,z],[w*.55,r,z],w*.35,1);for(let i=0;i<spokes;i++){const a=i/spokes*Math.PI*2;for(const sign of [-1,1])this.tube([sign*w*.32,r,z],[sign*w*.27,r+Math.cos(a)*(r-w*.65),z+Math.sin(a)*(r-w*.65)],spokes<=6?w*.065:.0035,4,4);}}
  fender(z,r,w,tile=0,start=-1.18,end=1.18){for(let i=0;i<9;i++){const a=start+(end-start)*i/9,b=start+(end-start)*(i+1)/9,R=r+.032;this.quad([-w/2,r+Math.cos(a)*R,z+Math.sin(a)*R],[w/2,r+Math.cos(a)*R,z+Math.sin(a)*R],[w/2,r+Math.cos(b)*R,z+Math.sin(b)*R],[-w/2,r+Math.cos(b)*R,z+Math.sin(b)*R],tile);}}
  finish(d){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(this.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));g.computeVertexNormals();g.computeBoundingSphere();const mesh=new T.Mesh(g,createRecolorableCarMaterial(d.color,'rides/'+d.id+'.jpg'));mesh.name=d.name;return mesh;}
}

function grips(b,y,z,width){b.tube([0,y-.12,z],[0,y,z],.016,1);b.tube([-width/2,y,z],[width/2,y,z],.012,1);for(const s of [-1,1])b.tube([s*(width/2-.105),y,z],[s*width/2,y,z],.019,3);}
function stand(b,y,z){b.tube([-.08,y,z],[-.23,.025,z-.10],.011,1);}
function bicycle(b,d){const r=d.radius,back=-d.wheelbase/2,front=d.wheelbase/2,fold=d.kind==='folding',bmx=d.kind==='bmx',road=d.kind==='road';const tyre=road?.031:bmx?.065:fold?.047:.065;
  b.wheel(back,r,tyre,16);b.wheel(front,r,tyre,16);
  const bb=[0,fold?.27:.31,-.13],seat=[0,bmx?.63:fold?.42:.82,-.23],head=[0,bmx?.72:fold?.47:.85,front-.16];
  const tubeR=road?.019:.025;
  if(fold){const curve=[seat,[0,.43,-.08],[0,.48,.13],head];for(let i=0;i<curve.length-1;i++)b.tube(curve[i],curve[i+1],.031,0);b.box([0,.46,.04],[.082,.075,.075],1);b.tube(bb,seat,.024,0);}
  else{b.tube(seat,head,tubeR,0);b.tube(bb,head,tubeR*1.25,0);b.tube(bb,seat,tubeR,0);}
  for(const s of [-1,1]){const rear=[s*.052,r,back];b.tube(rear,[s*.028,...seat.slice(1)],.011,0);b.tube(rear,[s*.035,...bb.slice(1)],.013,0);b.tube([s*.042,r,front],[s*.042,head[1],head[2]],d.kind==='mtb'?.020:.012,1);if(d.kind==='mtb')b.tube([s*.042,.57,front-.08],[s*.042,.78,front-.14],.025,0);}
  const sy=bmx?.78:fold?.97:.98; b.tube(seat,[0,sy,-.27],.016,1);b.loft([[-.40,sy,.06,.025],[-.30,sy+.015,.075,.025],[-.12,sy,.025,.015]],2);
  const hy=bmx?1:fold?1.05:road?.98:1.02,hz=front-.17;b.tube(head,[0,bmx?hy-.19:hy,hz],.018,1);
  if(road){b.tube([-.19,hy,hz],[.19,hy,hz],.012,1);for(const s of [-1,1]){const p=[[s*.19,hy,hz],[s*.19,hy+.025,hz+.08],[s*.19,hy-.055,hz+.14],[s*.19,hy-.14,hz+.11],[s*.19,hy-.14,hz+.01]];for(let i=0;i<p.length-1;i++)b.tube(p[i],p[i+1],.017,3);}}
  else if(bmx){const p=[[-.31,hy,hz],[-.17,hy-.025,hz],[-.095,hy-.19,hz],[.095,hy-.19,hz],[.17,hy-.025,hz],[.31,hy,hz]];for(let i=0;i<p.length-1;i++)b.tube(p[i],p[i+1],.014,1);b.tube([-.17,hy-.07,hz],[.17,hy-.07,hz],.008,1);for(const s of [-1,1])b.tube([s*.20,hy,hz],[s*.31,hy,hz],.02,3);}
  else grips(b,hy,hz,d.width);
  // Actual chainring, crank, pedals and chain rather than painted solid discs.
  b.ring(bb[1],bb[2],.09,.006,.018,1,16);for(const s of [-1,1]){b.tube([s*.065,bb[1],bb[2]],[s*.065,bb[1]+s*.12,bb[2]+s*.05],.008,1);b.box([s*.12,bb[1]+s*.12,bb[2]+s*.05],[.11,.022,.075],3);}
  for(const y of [bb[1]-.07,bb[1]+.07])b.tube([.064,y,bb[2]],[.064,r,back],.004,1,4);
  if(bmx)for(const z of [back,front])b.tube([-.14,r,z],[.14,r,z],.014,1);
  if(fold){b.fender(back,r,.06,1);b.fender(front,r,.06,1);b.box([0,r*2+.055,back-.04],[.20,.018,.26],1);}
  stand(b,.26,-.2);
}

function kick(b,d){const electric=d.kind==='electric',r=d.radius,back=-d.wheelbase/2,front=d.wheelbase/2,w=electric?.065:.032;b.wheel(back,r,w,electric?6:5);b.wheel(front,r,w,electric?6:5);b.loft([[back+.02,.135,electric?.085:.052,.025],[back+.12,.135,electric?.085:.052,electric?.047:.02],[front-.17,.135,electric?.085:.052,electric?.047:.02],[front-.1,.17,.05,.035]],electric?7:1);b.box([0,electric?.185:.159,-.07],[electric?.155:.095,.007,d.wheelbase-.25],3);
  const head=[0,.25,front-.035],top=[0,d.height-.025,front-.22];b.tube(head,top,electric?.028:.016,electric?0:1);b.tube([0,.16,front-.17],head,.025,1);for(const s of [-1,1])b.tube([s*.046,r,front],[s*.046,.31,front-.04],.014,1);grips(b,top[1],top[2],d.width);b.box([0,top[1]-.005,top[2]],[.07,.018,.065],7);b.fender(back,r,w*1.4,electric?7:1,-1.1,1.5);if(electric){b.box([0,top[1]-.07,top[2]+.03],[.06,.037,.026],6);b.tube([.025,.90,front-.19],[.045,.35,front-.055],.005,3,4);b.tube([-.025,r,back],[.025,r,back],.082,7,12);}stand(b,.14,-.12);
}

function motorcycle(b,d){const k=d.kind,r=d.radius,back=-d.wheelbase/2,front=d.wheelbase/2,cr=k==='cruiser',dirt=k==='dirt',scoot=k==='scooter',sport=k==='sport';const w=scoot?.095:dirt?.085:.145;
  b.wheel(back,r,w,dirt?16:scoot?5:6);b.wheel(front,r,w*.80,dirt?16:scoot?5:6);
  const hy=sport?1.01:cr?1.10:dirt?1.17:1.08,hz=front-.23;
  for(const s of [-1,1]){b.tube([s*.075,r,front],[s*.075,hy-.12,hz],dirt?.025:.029,4);b.tube([s*.075,r+.10,front-.025],[s*.075,.63,front-.11],.041,1);b.tube([s*.09,r,back],[s*.09,.48,-.06],.035,1);b.tube([s*.11,r,back],[s*.12,dirt?.84:cr?.70:.83,-.44],.023,4);b.tube([s*.12,.46,-.08],[s*.12,.85,.24],.026,1);b.tube([s*.12,.46,-.08],[s*.12,.70,-.47],.026,1);}
  if(scoot){b.loft([[back-.16,.61,.10,.09],[back,.64,.24,.14],[-.25,.61,.24,.16],[-.13,.47,.16,.085]],0);b.loft([[-.12,.34,.18,.025],[.30,.34,.18,.025],[.44,.40,.19,.05]],0);b.loft([[.34,.41,.19,.03],[.37,.66,.25,.04],[.40,.88,.25,.055],[.44,.96,.18,.06]],0);b.loft([[back-.06,.84,.15,.045],[-.22,.84,.15,.045]],2);b.fender(front,r,.16,0);b.tube([-.11,hy,hz],[.11,hy,hz],.065,0,8);b.box([0,hy,hz+.065],[.12,.07,.014],6);}
  else{
    b.loft([[.36,.80,.095,.09],[.23,.91,.20,.13],[-.02,.91,.195,.14],[-.19,.82,.12,.07]],0);
    const sy=dirt?.87:cr?.73:.85;b.loft([[-.68,sy+.04,.11,.035],[-.40,sy+.025,.14,.04],[-.18,sy,.12,.025]],2);
    if(sport){b.loft([[-.67,.76,.085,.065],[-.44,.69,.13,.15],[-.12,.68,.18,.24],[.20,.70,.215,.27],[.42,.81,.19,.17]],0);b.loft([[-.85,.91,.05,.05],[-.62,.93,.13,.075],[-.41,.87,.12,.05]],0);b.loft([[.14,.59,.17,.12],[.37,.68,.23,.19],[.49,.93,.19,.11],[.38,1.035,.14,.07]],0);b.loft([[.27,1.04,.12,.045],[.42,1.11,.105,.05],[.47,1.17,.085,.018]],6);for(const s of [-1,1])b.box([s*.13,.985,.475],[.07,.022,.024],6);}
    else if(dirt){b.loft([[-.61,.77,.08,.08],[-.38,.74,.105,.14],[-.12,.75,.115,.12],[.16,.80,.12,.09]],0);b.loft([[-.90,.87,.07,.018],[-.62,.91,.115,.03],[-.25,.85,.12,.04]],0);b.loft([[.25,.77,.17,.13],[.38,.88,.16,.05],[.12,.89,.15,.075]],0);b.loft([[front-.20,.81,.08,.016],[front+.10,.78,.08,.016],[front+.31,.76,.05,.008]],0);b.box([0,hy-.075,hz+.035],[.13,.19,.065],0);b.box([0,hy-.07,hz+.072],[.088,.075,.01],6);}
    else{b.loft([[-.57,.61,.13,.10],[-.35,.63,.16,.12],[-.18,.62,.12,.09]],0);b.fender(back,r,.20,0);b.fender(front,r,.16,0);b.tube([0,.91,hz],[0,.91,hz+.14],.085,4,12);b.box([0,.91,hz+.145],[.13,.12,.008],6);for(const s of [-1,1])b.box([s*.25,.58,back+.08],[.12,.25,.32],2);}
    // Engine volumes follow the lower frame, with shallow cooling fins.
    b.box([0,.48,-.02],[.24,.20,.27],7);for(const s of [-1,1]){b.tube([s*.07,.48,-.03],[s*.07,.71,.02],.07,7);for(let j=0;j<4;j++)b.box([s*.07,.54+j*.037,0],[.15,.012,.16],1);}
    const exX=.19,exY=cr?.30:dirt?.76:.39;const pipe=[[exX,.50,.15],[exX,.28,.06],[exX,.27,-.34],[exX,exY,-.64]];for(let i=0;i<pipe.length-1;i++)b.tube(pipe[i],pipe[i+1],.022,1);b.tube([exX,exY,-.38],[exX,exY,-.82],.055,4,8,.04);b.fender(front,r,w*1.2,0,-.75,.75);
  }
  grips(b,hy,hz,Math.min(d.width,.75));for(const s of [-1,1]){b.tube([s*.27,hy,hz],[s*.32,hy+.12,hz-.03],.007,1,4);b.box([s*.32,hy+.12,hz-.03],[.065,.035,.018],4);b.box([s*.19,.36,-.14],[.10,.025,.06],3);}stand(b,.35,-.18);
}

export function createFleetVehicle(d){const b=new Builder(d);if(['road','mtb','bmx','folding'].includes(d.kind))bicycle(b,d);else if(['kick','electric'].includes(d.kind))kick(b,d);else motorcycle(b,d);return b.finish(d);}
