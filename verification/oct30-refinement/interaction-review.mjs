import fs from 'node:fs';
const [base='http://127.0.0.1:4181/',label='local']=process.argv.slice(2),dir='work/refine-oct30/'+label;fs.mkdirSync(dir,{recursive:true});
const socket=new WebSocket('ws://127.0.0.1:54769/devtools/browser/ba89f01f-468e-472c-ba4d-848df4648f3e');await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
let seq=0,sid;const pending=new Map(),errors=[];socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId:sid}));});
const target=(await send('Target.getTargets')).targetInfos.find(t=>t.type==='page'&&(t.url.includes('4181')||t.url.includes('chengzy0424.github.io')));if(!target)throw Error('Own QA page missing');sid=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId;await send('Page.enable');await send('Runtime.enable');
const wait=ms=>new Promise(r=>setTimeout(r,ms));async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function until(expression){for(let i=0;i<150;i++){if(await evaluate(expression))return;await wait(150);}throw Error('Timed out: '+expression);}
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(dir+'/'+name+'.png',Buffer.from(r.data,'base64'));}
const metric=()=>evaluate('JSON.parse(document.getElementById("prototype-metrics").textContent)');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:base+'?inspect=1'});await until('document.body?.classList.contains("webgl-ready")');await wait(800);await evaluate('document.getElementById("prototype-metrics").style.visibility="hidden"');
const report={at:new Date().toISOString(),base,errors,down:[],up:[]};
const end=await evaluate('document.getElementById("lab").offsetTop');
for(let i=0;i<32;i++){await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:1320,y:790,deltaY:end/32,deltaX:0});await wait(100);report.down.push((await metric()).chapter);}
await wait(1200);report.atEnd=await metric();
for(let i=0;i<32;i++){await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:1320,y:790,deltaY:-end/32,deltaX:0});await wait(100);report.up.push((await metric()).chapter);}
await wait(1200);report.returnHome=await metric();
if(report.down.some((p,i)=>i&&p<report.down[i-1]-.02)||report.up.some((p,i)=>i&&p>report.up[i-1]+.02))throw Error('Scroll camera reversed unexpectedly');
if(report.atEnd.chapter<4.95||report.returnHome.chapter>.05)throw Error('Did not reach endpoints');
await evaluate('scrollTo({top:document.getElementById("spatial-gallery").offsetTop,behavior:"instant"})');await wait(1400);await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:850,y:450});await until('document.body.classList.contains("over-spatial-card")');await wait(400);await shot('gallery-hover');
const savedY=await evaluate('scrollY');await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:850,y:450});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:850,y:450});await until('document.querySelector("dialog").open');report.cardTitle=await evaluate('document.getElementById("detail-title").textContent');
report.collectionGames=await evaluate('[...document.querySelectorAll("#detail-content [data-detail]")].map(e=>e.dataset.detail)');
if(!['tower','ash','csol','mines'].every(id=>report.collectionGames.includes(id)))throw Error('Spatial Unity card did not open the game collection');
await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until('!document.querySelector("dialog").open');await wait(400);report.cardReturn={savedY,actualY:await evaluate('scrollY')};if(Math.abs(savedY-report.cardReturn.actualY)>1)throw Error('Spatial return changed scroll');
await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:25,y:60});await wait(600);report.hoverRestored=await evaluate('!document.body.classList.contains("over-spatial-card")');
await evaluate('document.getElementById("motion-toggle").click()');await until('JSON.parse(document.getElementById("prototype-metrics").textContent).reduced');const a=await metric();await wait(1200);const b=await metric();report.reduced={stopped:a.frames===b.frames,frames:b.frames,enabled:b.reduced};if(!report.reduced.stopped||!b.reduced)throw Error('Reduced mode keeps drawing');
await evaluate('document.getElementById("motion-toggle").click()');await until(`JSON.parse(document.getElementById("prototype-metrics").textContent).frames>${b.frames}`);report.resumed=true;
fs.writeFileSync(dir+'/interaction-review.json',JSON.stringify(report,null,2));console.log(JSON.stringify({cardTitle:report.cardTitle,cardReturn:report.cardReturn,hoverRestored:report.hoverRestored,reduced:report.reduced,resumed:report.resumed,errors}));socket.close();
