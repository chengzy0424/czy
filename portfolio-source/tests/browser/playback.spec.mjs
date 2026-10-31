import {test,expect} from '@playwright/test';
import catalog from '../../src/stream-catalog.json' with {type:'json'};

const ids=['tower','ash','csol','mines','murphy','hyrum','familiar','town','arc'];
const mediaURL=url=>/\.(m3u8|m4s|mp4)(?:\?|$)/.test(url);
const tap=async(page,locator)=>(await page.evaluate(()=>navigator.maxTouchPoints>0))?locator.tap():locator.click();

test.beforeEach(async({page},info)=>{
 if(info.project.name==='edge-native-branch'){
  // Exercise the existing native decoder, not a spoofed Safari UA or codec.
  await page.addInitScript(()=>{Object.defineProperty(window,'MediaSource',{value:undefined});});
 }
 await page.addInitScript(()=>{
  window.__mediaAudit={peak:0,events:[],audioError:null};
  let audioContext,analyser;
  document.addEventListener('click',()=>{
   if(!audioContext){try{audioContext=new AudioContext();}catch(e){window.__mediaAudit.audioError=e.message;}}
   audioContext?.resume().catch(e=>{window.__mediaAudit.audioError=e.message;});
  },true);
  new MutationObserver(()=>{
   const video=document.querySelector('video');if(!video||video.dataset.audit)return;
   video.dataset.audit='true';window.__lastVideo=video;
   for(const event of ['playing','waiting','pause','seeking','seeked','error'])video.addEventListener(event,()=>window.__mediaAudit.events.push({event,time:video.currentTime,at:performance.now()}));
   try{
    // Routing native HLS into Web Audio is not portable and can itself silence
    // playback (WebKit bug 180696). Do not alter the native audio path to test it.
    if(audioContext&&video.dataset.playbackMode!=='native'&&!('webkitAudioDecodedByteCount' in video)){
     analyser=audioContext.createAnalyser();audioContext.createMediaElementSource(video).connect(analyser);analyser.connect(audioContext.destination);
    }
   }catch(e){window.__mediaAudit.audioError=e.message;}
  }).observe(document,{childList:true,subtree:true});
  setInterval(()=>{
   if(!analyser)return;const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);
   for(const value of samples)window.__mediaAudit.peak=Math.max(window.__mediaAudit.peak,Math.abs(value));
  },40);
 });
});

test.afterEach(async({page},info)=>{
 if(page.isClosed())return;
 const state=await page.evaluate(()=>{
  const v=window.__lastVideo;return {audit:window.__mediaAudit,status:document.querySelector('.player-status')?.textContent,
   video:v?{time:v.currentTime,paused:v.paused,readyState:v.readyState,mode:v.dataset.playbackMode,src:v.currentSrc,
    muted:v.muted,volume:v.volume,width:v.videoWidth,height:v.videoHeight,error:v.error?.code,
    decodedAudio:v.webkitAudioDecodedByteCount??null,audioTracks:v.audioTracks?.length??null,
    buffered:Array.from({length:v.buffered.length},(_,i)=>[v.buffered.start(i),v.buffered.end(i)])}:null};
 }).catch(()=>null);
 await info.attach('final-state',{body:JSON.stringify(state,null,2),contentType:'application/json'});
});

async function visit(page,info){
 await page.goto('/?inspect=1');
 const caps=await page.evaluate(()=>{
  const v=document.createElement('video');return {ua:navigator.userAgent,platform:navigator.platform,
   nativeHls:v.canPlayType('application/vnd.apple.mpegurl'),mp4:v.canPlayType('video/mp4; codecs="avc1.64001f, mp4a.40.2"'),
   mse:!!window.MediaSource,touch:navigator.maxTouchPoints};
 });
 await info.attach('environment',{body:JSON.stringify({project:info.project.name,mediaOrigin:process.env.TEST_MEDIA_ORIGIN||(process.env.TEST_MEDIA_ROOT?'verified local media copy':'repository'),...caps},null,2),contentType:'application/json'});
 return caps;
}
async function openVideo(page,id){
 await tap(page,page.getByRole('link',{name:'直接查看作品',exact:true}));
 if(['tower','ash','csol','mines'].includes(id)){
  await tap(page,page.locator(`[data-detail="${id}"]`).first());await tap(page,page.locator(`[data-play="${id}"]`));
 }else{
  await tap(page,page.locator(id==='town'||id==='arc'?'#tab-lab':'#tab-films'));
  await tap(page,page.locator(`#works [data-film="${id}"]`));
 }
 return page.locator('video');
}
async function hasStarted(video){await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>.2&&v.readyState>=2),{timeout:40000}).toBe(true);}
async function mediaState(video){return video.evaluate(v=>({time:v.currentTime,paused:v.paused,volume:v.volume,muted:v.muted,src:v.currentSrc,readyState:v.readyState,width:v.videoWidth,height:v.videoHeight,error:v.error?.code||null,decodedAudio:v.webkitAudioDecodedByteCount??null,frames:v.getVideoPlaybackQuality?.().totalVideoFrames??null}));}
async function checkAudio(page,video,info){
 const mode=await video.getAttribute('data-playback-mode');
 if(info.project.use.browserName==='webkit'&&process.platform==='win32'){
  info.annotations.push({type:'audio-unverified',description:'Windows Playwright WebKit has no AudioContext, reports zero decoded audio bytes and no audio tracks. This run cannot verify audio.'});
  return {method:'unverified on Windows WebKit; not an audio pass'};
 }
 if(mode==='native'){
  info.annotations.push({type:'audio-boundary',description:'Native HLS audio is not routed into Web Audio. Decoder counter is recorded when exposed; physical audibility is unverified.'});
  return {method:'native-counter-only; physical audibility unverified',decodedBytes:await video.evaluate(v=>v.webkitAudioDecodedByteCount??null)};
 }
 const counter=await video.evaluate(v=>typeof v.webkitAudioDecodedByteCount==='number');
 if(counter){await expect.poll(()=>video.evaluate(v=>v.webkitAudioDecodedByteCount)).toBeGreaterThan(0);return {method:'browser audio decoder byte counter'};}
 await expect.poll(()=>page.evaluate(()=>window.__mediaAudit.peak),{timeout:18000}).toBeGreaterThan(.00001);
 return {method:'nonzero Web Audio PCM signal; not a speaker test'};
}
async function closeAndCheck(page,requests){
 await tap(page,page.getByRole('button',{name:'关闭项目详情',exact:true}));await expect(page.locator('video')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>{const v=window.__lastVideo;return v.paused&&!v.getAttribute('src')&&v.readyState===0;})).toBe(true);
 // Settle cancellation, then require a quiet window with no newly issued media.
 await page.waitForTimeout(300);const after= requests.length;await page.waitForTimeout(1200);expect(requests.length).toBe(after);
}

test('first screen and browsing never fetch video; narrow touch layout and dialog return',async({page},info)=>{
 const requests=[];page.on('request',r=>{if(mediaURL(r.url()))requests.push(r.url());});
 await visit(page,info);await page.waitForTimeout(1000);expect(requests).toEqual([]);await expect(page.locator('video')).toHaveCount(0);
 await tap(page,page.getByRole('link',{name:'直接查看作品',exact:true}));
 await tap(page,page.locator('[data-detail="csol"]').first());await expect(page.locator('dialog')).toBeVisible();
 await page.waitForTimeout(500);expect(requests).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await tap(page,page.getByRole('button',{name:'关闭项目详情',exact:true}));
 await expect(page.locator('[data-detail="csol"]').first()).toBeFocused();
 await page.setViewportSize({width:320,height:720});
 await tap(page,page.locator('[data-detail="csol"]').first());
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

for(const id of ids)test(`${id}: start, audio evidence, seek, pause, quality and release`,async({page,browser},info)=>{
 const requests=[],errors=[];page.on('request',r=>{if(mediaURL(r.url()))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 const caps=await visit(page,info);
 test.skip(!caps.mp4,'Engine/OS exposes no H.264 + AAC decoder; UI tests still run. This is not a playback pass.');
 test.skip(info.project.name==='edge-native-branch'&&!caps.nativeHls,'Edge exposes no native HLS decoder.');
 const clicked=Date.now(),video=await openVideo(page,id);await hasStarted(video);const flowToPlayingMs=Date.now()-clicked;
 const audio=await checkAudio(page,video,info);
 const start=await mediaState(video);expect(start.muted).toBe(false);expect(start.width).toBeGreaterThan(0);
 await page.waitForTimeout(3000);const continuous=await mediaState(video);expect(continuous.time-start.time).toBeGreaterThan(2);
 // Media API seek is portable; native scrub-bar touch gestures remain device QA.
 const target=await video.evaluate(v=>{v.pause();v.volume=.45;v.currentTime=v.duration*.6;return v.currentTime;});
 await expect.poll(()=>video.evaluate(v=>!v.seeking&&Math.abs(v.currentTime-v.duration*.6)<.8)).toBe(true);
 const select=page.getByLabel('影片画质'),fallback=await video.getAttribute('data-playback-mode')==='fallback';
 if(fallback)await expect(select).toBeDisabled();
 else {await select.selectOption('0');await select.selectOption(String(catalog[id].levels.length-1));}
 await expect.poll(()=>video.evaluate((v,t)=>v.readyState>=2&&Math.abs(v.currentTime-t)<.8,target)).toBe(true);
 expect((await mediaState(video)).paused).toBe(true);
 await page.waitForTimeout(500);expect((await mediaState(video)).paused).toBe(true);
 await video.evaluate(v=>v.play());await hasStarted(video);
 await expect.poll(()=>video.evaluate((v,t)=>v.currentTime-t,target)).toBeGreaterThan(.3);
 if(!fallback){
  const last=catalog[id].levels.at(-1);
  await expect.poll(()=>video.evaluate(v=>v.videoHeight),{timeout:20000}).toBe(last.height);
  await select.selectOption('-1');await hasStarted(video);
 }
 expect((await mediaState(video)).volume).toBeCloseTo(.45,2);
 await info.attach('playback-evidence',{body:JSON.stringify({id,browser:browser.version(),flowToPlayingMs,audio,start,continuous,final:await mediaState(video),audit:await page.evaluate(()=>window.__mediaAudit),requestCount:requests.length,seekInput:'HTMLMediaElement.currentTime; not a physical scrub gesture'},null,2),contentType:'application/json'});
 await closeAndCheck(page,requests);expect(errors).toEqual([]);
});

test('failed segments expose MP4 recovery and release it on close',async({page},info)=>{
 const caps=await visit(page,info);test.skip(!caps.mp4,'No H.264/AAC decoder in this engine/OS.');
 test.skip(!caps.nativeHls&&!caps.mse,'This engine has only MP4; segment recovery is not available.');
 const requests=[];page.on('request',r=>{if(mediaURL(r.url()))requests.push(r.url());});
 await page.route(/\.(m3u8|m4s)(?:\?|$)/,route=>route.abort('failed'));
 await openVideo(page,'csol');await expect(page.getByRole('button',{name:'切换兼容播放'})).toBeVisible({timeout:40000});
 await tap(page,page.getByRole('button',{name:'切换兼容播放'}));const video=page.locator('video');
 await hasStarted(video);await expect(page.getByLabel('影片画质')).toBeDisabled();
 expect((await mediaState(video)).src).toMatch(/csol-demo-low\.mp4/);
 // The MP4 uses the same element; after native HLS no Web Audio graph is added.
 if(info.project.name!=='edge-native-branch'&&!info.project.name.startsWith('webkit'))await checkAudio(page,video,info);
 await closeAndCheck(page,requests);
});

test('audio decoder or PCM evidence is available',async({page},info)=>{
 test.skip(info.project.use.browserName==='webkit'&&process.platform==='win32','Windows WebKit does not expose usable audio evidence; audio is unverified.');
 const caps=await visit(page,info);test.skip(!caps.mp4,'No H.264/AAC decoder.');
 const video=await openVideo(page,'csol');await hasStarted(video);
 if(await video.getAttribute('data-playback-mode')==='native'){
  const measurable=await video.evaluate(v=>typeof v.webkitAudioDecodedByteCount==='number');
  test.skip(!measurable,'Native audio requires physical listening on this engine.');
  await expect.poll(()=>video.evaluate(v=>v.webkitAudioDecodedByteCount)).toBeGreaterThan(0);
 }else await checkAudio(page,video,info);
});

test('no streaming capability selects MP4 and disables unavailable quality choices',async({page},info)=>{
 await page.addInitScript(()=>{
  Object.defineProperty(window,'MediaSource',{value:undefined});Object.defineProperty(window,'ManagedMediaSource',{value:undefined});
  const canPlay=HTMLMediaElement.prototype.canPlayType;
  HTMLMediaElement.prototype.canPlayType=function(type){return /mpegurl/i.test(type)?'':canPlay.call(this,type);};
 });
 const caps=await visit(page,info);test.skip(!caps.mp4,'No MP4 decoder.');
 const video=await openVideo(page,'tower');await hasStarted(video);
 await expect(page.getByLabel('影片画质')).toBeDisabled();expect((await mediaState(video)).src).toMatch(/tower-demo-audio\.mp4/);
});

test('close during startup and return-to-list both release the current video',async({page},info)=>{
 await visit(page,info);const requests=[];page.on('request',r=>{if(mediaURL(r.url()))requests.push(r.url());});
 await openVideo(page,'csol');await closeAndCheck(page,requests);
 await tap(page,page.locator('[data-detail="csol"]').first());await tap(page,page.locator('[data-play="csol"]'));
 await tap(page,page.locator('.playback-back'));await expect(page.locator('video')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>window.__lastVideo.paused&&!window.__lastVideo.getAttribute('src'))).toBe(true);
 await expect(page.locator('[data-play="csol"]')).toBeFocused();
});

test('3D scene pauses behind the dialog and resumes after closing',async({page},info)=>{
 await visit(page,info);
 await expect.poll(()=>page.evaluate(()=>document.body.classList.contains('webgl-ready')||document.body.classList.contains('webgl-failed')),{timeout:30000}).toBe(true);
 test.skip(await page.evaluate(()=>document.body.classList.contains('webgl-failed')),'This engine/driver uses the site static fallback; no 3D rendering claim.');
 await tap(page,page.locator('[data-journey="2"]'));
 const metrics=page.locator('#prototype-metrics');await expect(metrics).toContainText('frames');
 await tap(page,page.locator('#spatial-gallery [data-detail="games"]'));
 await page.waitForTimeout(1200);const paused=JSON.parse(await metrics.textContent()).frames;
 await page.waitForTimeout(1200);expect(JSON.parse(await metrics.textContent()).frames).toBe(paused);
 await tap(page,page.getByRole('button',{name:'关闭项目详情',exact:true}));
 await expect.poll(async()=>JSON.parse(await metrics.textContent()).frames).toBeGreaterThan(paused);
});
