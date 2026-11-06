import test from 'node:test';
import assert from 'node:assert/strict';
import {playbackPolicy} from '../src/stream-policy.js';
import {createStreamPlayer} from '../src/stream-player.js';
const levels=[{key:'saving',height:240,fps:24},{key:'mobile',height:360,fps:30},{key:'balanced',height:720,fps:30},{key:'hd',height:1080,fps:60,playlist:'../../stream-v2-20261106/ash/hd/index.m3u8'}];

test('start within mobile bandwidth and keep 60 fps HD opt-in on phones',()=>{
 assert.deepEqual(playbackPolicy(levels,{mobile:true}),{start:1,autoMax:2,estimate:500000});
 assert.deepEqual(playbackPolicy(levels,{mobile:false}),{start:1,autoMax:3,estimate:500000});
 for(const connection of [{saveData:true},{effectiveType:'2g'},{downlink:.4}]){
  assert.deepEqual(playbackPolicy(levels,connection),{start:0,autoMax:1,estimate:220000});
 }
 assert.equal(playbackPolicy(levels,{downlink:0}).start,1);
});

test('native Safari uses the mobile playlist, resolves original HD, and cleans up',async()=>{
 const previous={navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator'),location:globalThis.location,matchMedia:globalThis.matchMedia};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{vendor:'Apple Computer, Inc.'}});
 globalThis.location={href:'https://chengzy0424.github.io/czy/'};
 globalThis.matchMedia=()=>({matches:true});
 class Video extends EventTarget{
  currentTime=0;duration=180;readyState=0;paused=true;buffered={length:0};plays=0;loads=0;
  canPlayType(){return 'probably';}
  set src(value){this._src=new URL(value,location.href).href;}get src(){return this._src;}
  load(){this.loads++;}play(){this.plays++;return Promise.resolve();}
 }
 const video=new Video();let failures=0;
 const controller=createStreamPlayer({video,path:'./media/stream-v3-20261106/ash/master.m3u8',levels,fallback:'./fallback.mp4',onStatus:()=>{},onQuality:()=>{},onFailure:()=>failures++});
 try{
  await controller.start();assert.match(video.src,/stream-v3-20261106\/ash\/mobile.m3u8$/);assert.equal(video.plays,1);
  video.currentTime=20;video.readyState=3;video.paused=false;
  controller.quality(3);assert.equal(video.src,'https://chengzy0424.github.io/czy/media/stream-v2-20261106/ash/hd/index.m3u8');
  video.dispatchEvent(new Event('loadedmetadata'));assert.equal(video.currentTime,20);
  controller.quality(-1);assert.match(video.src,/mobile.m3u8$/);
  video.dispatchEvent(new Event('error'));assert.match(video.src,/raw.githubusercontent.com/);assert.equal(failures,0);
  video.dispatchEvent(new Event('error'));assert.equal(failures,1);
  controller.destroy();const loads=video.loads;video.dispatchEvent(new Event('error'));assert.equal(video.loads,loads);
 }finally{
  controller.destroy();Object.defineProperty(globalThis,'navigator',previous.navigator);globalThis.location=previous.location;globalThis.matchMedia=previous.matchMedia;
 }
});
