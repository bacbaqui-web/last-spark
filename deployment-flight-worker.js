import * as T from 'three';
import {createFlightScene} from './deployment-flight-scene.js';

let renderer,flight,timer,started,hidden=false,frames=0,lastReport=0,bitmap;
function render(){
 if(hidden)return;
 const now=performance.now();flight.update((now-started)/1000);renderer.render(flight.scene,flight.camera);frames++;
 if(frames===1)postMessage({type:'ready'});
 if(now-lastReport>500){lastReport=now;postMessage({type:'stats',frames,seconds:(now-started)/1000});}
}
self.onmessage=({data})=>{
 try{
  if(data.type==='start'){
   renderer=new T.WebGLRenderer({canvas:data.canvas,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.setSize(data.width,data.height,false);renderer.toneMapping=T.ACESFilmicToneMapping;
   flight=createFlightScene(data.cargo);flight.resize(data.width,data.height);started=performance.now();render();timer=setInterval(render,1000/30);
   fetch(data.paintURL).then(r=>{if(!r.ok)throw Error('flight texture');return r.blob();}).then(blob=>createImageBitmap(blob,{imageOrientation:'flipY'})).then(image=>{bitmap=image;flight.setPaint(image);}).catch(()=>{});
  }else if(data.type==='resize'){renderer.setSize(data.width,data.height,false);flight.resize(data.width,data.height);}
  else if(data.type==='visibility')hidden=data.hidden;
 }catch(error){clearInterval(timer);postMessage({type:'error',message:error.message});}
};
