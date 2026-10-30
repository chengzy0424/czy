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

await load(390,844,'?inspect=1');
await click('a.primary-link[href="#works"]');await click('#tab-films');await wait(1100);
await click('#panel-films [data-film="familiar"]');await until('document.querySelector("video")?.currentTime>.3');
await click('.playback-back');await until('!document.querySelector("video")&&!document.querySelector("#detail-content").classList.contains("is-playing")');
const restored=await evaluate('document.activeElement.dataset.film==="familiar"');if(!restored)throw Error('List focus not restored');
await click('#detail-content [data-film="murphy"]');await until('document.querySelector("video")?.currentTime>.3');
await click('.dialog-close');await until('!document.querySelector("video")');
await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
const point=await evaluate('(()=>{const e=document.querySelector("#panel-films [data-film=familiar]");e.scrollIntoView({block:"center",behavior:"instant"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,radiusX:2,radiusY:2,force:1,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await until('document.querySelector("video")?.currentTime>.3');
const touch=await evaluate('({title:document.querySelector(".player-title").textContent,time:document.querySelector("video").currentTime})');
await click('.dialog-close');await send('Emulation.setTouchEmulationEnabled',{enabled:false});
fs.writeFileSync(dir+'/return-touch.json',JSON.stringify({restored,touch,errors},null,2));console.log(JSON.stringify({restored,touch,errors}));socket.close();
