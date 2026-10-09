import * as T from 'three';
import {createRobot,disposeRobot} from './robot.js';
import {applyFrameVisual} from './frame-preview.js';
import {frameStats} from './salvage-campaign.js';
import {createThirdPersonView} from './third-person.js';

export function createOperationFrameStage(host,frame){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;host.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.05,50);scene.add(new T.HemisphereLight(0xc9eaff,0x24323b,2.4));
 const key=new T.DirectionalLight(0xffffff,3.5);key.position.set(-3,5,4);scene.add(key);const rim=new T.DirectionalLight(0x48bfff,3);rim.position.set(3,2,-3);scene.add(rim);
 const robot=createRobot(false,'player',.82),weapon=frame.weaponSlots.find(Boolean)?.type||'pistol';applyFrameVisual(robot,frameStats(frame));const view=createThirdPersonView(robot,[weapon]);scene.add(robot.root);
 const pad=new T.Mesh(new T.CylinderGeometry(1.65,1.8,.1,48),new T.MeshStandardMaterial({color:0x1c333f,metalness:.8,roughness:.45}));pad.position.y=-.08;scene.add(pad);
 const circle=new T.Mesh(new T.TorusGeometry(1.5,.015,6,64),new T.MeshBasicMaterial({color:0x77dfff}));circle.rotation.x=-Math.PI/2;circle.position.y=.01;scene.add(circle);
 const rig=new T.Group(),metal=new T.MeshStandardMaterial({color:0x9aa7ad,metalness:.9,roughness:.28});rig.visible=false;scene.add(rig);
 for(const x of[-.3,.3]){const link=new T.Mesh(new T.TorusGeometry(.12,.028,8,20),metal);link.position.set(x,1.65,0);rig.add(link);const cable=new T.Mesh(new T.CylinderGeometry(.018,.018,7,8),metal);cable.position.set(x,5.25,0);rig.add(cable);}
 let closed=false,raf,previous=performance.now(),elapsed=0,transition=null;
 const origin=new T.Vector3(3.3,2.3,5.7),focus=new T.Vector3(0,1.05,0),head=new T.Vector3();
 function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function draw(now){if(closed)return;raf=requestAnimationFrame(draw);const dt=Math.min(.05,(now-previous)/1000);previous=now;if(document.hidden)return;elapsed+=dt;
  view.pose({position:new T.Vector3(0,1.7,0),yaw:Math.PI-.45,pitch:0,weapon,speed:0,grounded:true,dt,time:elapsed});camera.position.copy(origin);camera.lookAt(focus);
  if(transition){const t=Math.min(1,(now-transition.start)/transition.duration),ease=t*t*(3-2*t);
   if(transition.mode==='recovery'){rig.visible=true;rig.position.y=(1-Math.min(1,t/.4))*3;const lift=Math.max(0,(t-.4)/.6)**2*7;robot.root.position.y+=lift;rig.position.y+=lift;}
   else{robot.head.getWorldPosition(head);camera.position.lerpVectors(origin,head.clone().add(new T.Vector3(0,.03,.04)),ease);camera.lookAt(head);}
   if(t===1&&transition.done){const done=transition.done;transition.done=null;done();}
  }renderer.render(scene,camera);
 }
 raf=requestAnimationFrame(draw);
 return {depart(mode){return new Promise(done=>{transition={mode,start:performance.now(),duration:mode==='recovery'?1800:850,done};});},reset(){transition?.done?.();transition=null;rig.visible=false;rig.position.y=0;},dispose(){if(closed)return;closed=true;transition?.done?.();cancelAnimationFrame(raf);observer.disconnect();disposeRobot(robot);pad.geometry.dispose();pad.material.dispose();circle.geometry.dispose();circle.material.dispose();rig.traverse(o=>o.geometry?.dispose());metal.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
