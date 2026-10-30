import fs from 'node:fs';
const [base='http://127.0.0.1:4181/',label='local']=process.argv.slice(2),dir='work/refine-oct30/'+label;fs.mkdirSync(dir,{recursive:true});
const socket=new WebSocket('ws://127.0.0.1:54769/devtools/browser/ba89f01f-468e-472c-ba4d-848df4648f3e');await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
let seq=0,sid;const pending=new Map(),errors=[];socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+(m.params.exceptionDetails.exception?.description||''));};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId:sid}));});
const {targetInfos}=await send('Target.getTargets');const target=targetInfos.find(t=>t.type==='page'&&((t.url.includes('4181')||t.url.includes('4180'))||t.url.includes('chengzy0424.github.io')));if(!target)throw Error('Own audit tab missing');sid=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId;
await send('Page.enable');await send('Runtime.enable');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function until(expression,timeout=30000){const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(expression))return;await wait(150);}throw Error('Timed out: '+expression);}
async function click(selector){await wait(100);const rect=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...rect});await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...rect});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...rect});}
async function screenshot(name){await evaluate('if(document.getElementById("prototype-metrics"))document.getElementById("prototype-metrics").style.visibility="hidden"');const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(dir+'/'+name+'.png',Buffer.from(r.data,'base64'));}
async function load(width=1440,height=900,query='?inspect=1'){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:base+query});await until('document.body?.classList.contains("webgl-ready")||document.body?.classList.contains("webgl-failed")');await wait(1100);}
const report={base,label,at:new Date().toISOString(),media:[],screens:[],errors};
await load();report.initial=await evaluate('({webgl:document.body.classList.contains("webgl-ready"),videos:document.querySelectorAll("video,iframe").length,mediaRequests:performance.getEntriesByType("resource").filter(e=>/\\.mp4|\\.wasm|\\.data/.test(e.name)).length,metrics:document.getElementById("prototype-metrics")?.textContent})');
await screenshot('home');
await click('#motion-toggle');
for(const scene of ['intro','spatial-gallery','machine','lab']){await evaluate(`window.scrollTo({top:document.getElementById('${scene}').offsetTop,behavior:'instant'})`);await wait(600);await screenshot(scene);}
await click('a.primary-link[href="#works"]');
report.directBypass=await evaluate('scrollY>=document.getElementById("works").offsetTop-150');
for(const [kind,id,group] of [['game','tower'],['game','ash'],['game','csol'],['game','mines'],['film','murphy','films'],['film','hyrum','films'],['film','familiar','films'],['film','town','lab'],['film','arc','lab']]){
 if(kind==='game')await click(`#panel-unity [data-detail="${id}"]`);else{await click('#tab-'+group);await wait(100);await click(`#panel-${group} [data-film="${id}"]`);}
 await until('document.querySelector("dialog").open');await wait(330);const start=Date.now();
 if(kind==='game')await click(`[data-play="${id}"]`);
 await until('document.querySelector("video")?.currentTime>.2&&!document.querySelector("video").paused',45000);
 await wait(1200);
 const first=await evaluate('({time:document.querySelector("video").currentTime,duration:document.querySelector("video").duration,src:document.querySelector("video").currentSrc,error:document.querySelector("video").error,ready:document.querySelector("video").readyState,frames:JSON.parse(document.getElementById("prototype-metrics").textContent).frames})');
 await wait(1400);
 const after=await evaluate('({time:document.querySelector("video").currentTime,frames:JSON.parse(document.getElementById("prototype-metrics").textContent).frames,quality:document.querySelector("video").getVideoPlaybackQuality?.()})');
 if(after.time<=first.time||first.error)throw Error('Playback did not progress: '+id);
 if(first.frames!==after.frames)throw Error('Background continued rendering during media: '+id);
 if(id==='arc'){
  await evaluate('document.querySelector("video").currentTime=5');await wait(300);
  await evaluate('(()=>{const s=document.querySelector("select[aria-label=影片画质]");s.value="1080";s.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await until('document.querySelector("video").currentSrc.includes("1080")&&document.querySelector("video").currentTime>=5&&!document.querySelector("video").paused');report.qualitySwitch=await evaluate('({src:document.querySelector("video").currentSrc,time:document.querySelector("video").currentTime})');
 }
 if(['tower','familiar','arc'].includes(id))await screenshot('playing-'+id);
 const item={kind,id,observedPlayingWithinMs:Date.now()-start-2600,first,after};report.media.push(item);console.log(JSON.stringify({id,time:after.time,duration:first.duration,backgroundPaused:true}));
 await click('.dialog-close');await until('!document.querySelector("dialog").open');await until('!document.querySelector("video")');
}
fs.writeFileSync(dir+'/browser-review.json',JSON.stringify(report,null,2));
for(const width of [768,414,390,375,320]){
 await load(width,width===768?1024:844);await screenshot('home-'+width);
 const metric=await evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,webgl:document.body.classList.contains("webgl-ready"),name:document.querySelector("h1").textContent,phone:document.querySelector(".phone-link").textContent})');
 if(metric.scrollWidth>width)throw Error('Overflow '+width);report.screens.push(metric);
 await click('a.primary-link[href="#works"]');await wait(100);await screenshot('works-'+width);
 if(width===390){await click('#tab-films');await wait(1100);await click('#panel-films [data-film="familiar"]');await until('document.querySelector("video")?.currentTime>.2');await screenshot('mobile-video');report.mobileVideo=await evaluate('({time:document.querySelector("video").currentTime,width:document.querySelector("video").getBoundingClientRect().width,error:document.querySelector("video").error})');await click('.dialog-close');}
}
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await load(390,844);report.reduced=await evaluate('({pressed:document.querySelector("#motion-toggle").getAttribute("aria-pressed"),class:document.body.classList.contains("reduced-motion")})');await screenshot('reduced-motion');await send('Emulation.setEmulatedMedia',{features:[]});
fs.writeFileSync(dir+'/browser-review.json',JSON.stringify(report,null,2));console.log(JSON.stringify({complete:true,media:report.media.length,screens:report.screens,errors}));socket.close();
