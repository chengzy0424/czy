import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreamPlayer} from '../src/stream-player.js';

// State-machine tests only. This media double does not prove Safari decoding.
class Media extends EventTarget {
 readyState=0; currentTime=0; duration=60; paused=true; ended=false; error=null;
 volume=.45; muted=false; src=''; loads=0; plays=0;
 canPlayType(){return 'probably';}
 load(){this.loads++;this.readyState=0;this.currentTime=0;this.paused=true;}
 play(){this.plays++;this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
 removeAttribute(name){if(name==='src')this.src='';}
 metadata(){this.readyState=1;this.dispatchEvent(new Event('loadedmetadata'));}
}
function setup(t){
 const previous=globalThis.window,previousLocation=globalThis.location;globalThis.window={};
 globalThis.location={href:'https://example.test/'};
 t.after(()=>{globalThis.window=previous;globalThis.location=previousLocation;});
 const video=new Media(),status=[],modes=[];
 const player=createStreamPlayer({video,path:'https://example.test/media/master.m3u8',
  levels:[{key:'low',label:'480p'},{key:'720',label:'720p'}],fallback:'https://example.test/media/fallback.mp4',
  onStatus:text=>status.push(text),onQuality:()=>{},onFailure:text=>assert.fail(text),onMode:mode=>modes.push(mode)});
 t.after(()=>player.destroy());return {video,player,status,modes};
}
test('native start calls play synchronously in the user action',t=>{
 const {video,player}=setup(t);player.start();assert.equal(video.plays,1);assert.match(video.src,/master.m3u8$/);
});
test('native retry retains the explicitly selected rendition',t=>{
 const {video,player}=setup(t);player.start();video.metadata();video.currentTime=17;
 player.quality(1);video.metadata();player.retry();assert.match(video.src,/720\/index.m3u8$/);
 video.metadata();assert.equal(video.currentTime,17);
});
test('paused rapid quality changes and MP4 recovery retain position and intent',t=>{
 const {video,player}=setup(t);player.start();video.metadata();video.currentTime=21;video.pause();
 const plays=video.plays;player.quality(1);player.quality(0);player.compatibility();video.metadata();
 assert.equal(video.currentTime,21);assert.equal(video.paused,true);assert.equal(video.plays,plays);
 assert.equal(video.volume,.45);assert.equal(video.muted,false);
});
test('source-replacement pause events do not override a newer play request',t=>{
 const {video,player,status}=setup(t);player.start();video.metadata();video.currentTime=13;player.quality(1);
 video.readyState=1;video.dispatchEvent(new Event('pause'));video.metadata();
 assert.equal(video.currentTime,13);assert.equal(video.paused,false);
 assert.notEqual(status.at(-1),'已暂停');
});
test('destroy cancels native media and makes late actions inert',t=>{
 const {video,player}=setup(t);player.start();video.metadata();player.destroy();
 assert.equal(video.src,'');assert.equal(video.paused,true);assert.equal(video.readyState,0);
 const loads=video.loads;player.retry();player.quality(0);player.compatibility();player.start();
 assert.equal(video.loads,loads);
});
test('late autoplay rejection cannot overwrite a new source status',async t=>{
 const {video,player,status}=setup(t);let reject;
 video.play=()=>new Promise((_,r)=>{reject=r;});player.start();
 const oldReject=reject;player.compatibility();const last=status.at(-1);
 oldReject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));await Promise.resolve();
 assert.equal(status.at(-1),last);
});
test('native and fallback modes notify the quality control',t=>{
 const {player,modes}=setup(t);player.start();player.compatibility();
 assert.ok(modes.includes('native'));assert.equal(modes.at(-1),'fallback');
});
