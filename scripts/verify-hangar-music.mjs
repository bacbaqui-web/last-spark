import assert from 'node:assert/strict';
import {createHangarMusic} from '../hangar-music.js';
const listeners=new Map();globalThis.document={baseURI:'https://example.test/last-spark/',hidden:false,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
let audio;globalThis.Audio=class{constructor(src){audio=this;this.src=src;this.paused=true;this.plays=0;}play(){this.paused=false;this.plays++;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){this.src='';}load(){}};
const music=createHangarMusic();assert.equal(audio.loop,true);assert.match(audio.src,/last-spark\/audio\/hangar-chanson-dans-la-nuit.ogg$/);
music.setActive(true);assert.equal(audio.paused,false);document.hidden=true;listeners.get('visibilitychange')();assert.equal(audio.paused,true);document.hidden=false;listeners.get('visibilitychange')();assert.equal(audio.paused,false);music.setActive(false);listeners.get('pointerdown')();assert.equal(audio.paused,true);music.setActive(true);music.dispose();assert.equal(audio.paused,true);assert.equal(listeners.size,0);console.log('PASS hangar BGM looping, base-path asset, hidden-tab pause, gesture retry, exit and cleanup');
