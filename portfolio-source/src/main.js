import {clamp,smooth} from './weave-math.js';
import {scrollToChapter} from './space-path.js';
import {games,films,gameDetail,gameList,filmList,startMedia,releaseMedia,prepareVideoPlayer} from './portfolio.js';
const $=selector=>document.querySelector(selector);
const reducedQuery=matchMedia('(prefers-reduced-motion:reduce)');
const state={progress:0,chapter:0,category:'unity',reduced:reducedQuery.matches,modal:false,offscreen:false};
const tabs=[...document.querySelectorAll('[role=tab]')], panels=[...document.querySelectorAll('[role=tabpanel]')];
const motionButton=$('#motion-toggle'),dialog=$('#project-dialog'),works=$('#works');
const journeyLinks=[...document.querySelectorAll('[data-journey]')];
let engine,scrollFrame=0,lastOpener,savedScroll=0,animations=[],exploreAnimation=0;
let initRequested=false;
function syncProgress(){
 scrollFrame=0;
 const gallery=$('#spatial-gallery');
 const anchors=[0,$('#intro').offsetTop,gallery.offsetTop,gallery.offsetTop+Math.max(1,gallery.offsetHeight-innerHeight),$('#machine').offsetTop,$('#lab').offsetTop,$('#confluence').offsetTop];
 state.chapter=scrollToChapter(scrollY,anchors);state.progress=state.chapter/6;
 state.offscreen=scrollY>works.offsetTop-innerHeight*.45;
 document.documentElement.style.setProperty('--journey-progress',state.progress);
 document.body.classList.toggle('after-journey',state.offscreen);
 const currentChapter=state.chapter<.65?0:state.chapter<1.6?1:state.chapter<3.55?2:state.chapter<4.6?4:state.chapter<5.6?5:6;
 for(const link of journeyLinks){if(Number(link.dataset.journey)===currentChapter)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');link.tabIndex=state.offscreen?-1:0;}
 engine?.wake();
}
function onScroll(){if(!scrollFrame)scrollFrame=requestAnimationFrame(syncProgress);}
window.addEventListener('scroll',onScroll,{passive:true});
window.addEventListener('resize',onScroll,{passive:true});
function reflectMotion(){
 document.body.classList.toggle('reduced-motion',state.reduced);
 motionButton.setAttribute('aria-pressed',String(state.reduced));
 motionButton.querySelector('.motion-label').textContent=state.reduced?'动态已减少':'减少动态';
 motionButton.querySelector('.motion-icon').textContent=state.reduced?'▷':'Ⅱ';
 $('#interaction-hint').textContent=state.reduced?'静态构图 · 自由浏览':matchMedia('(pointer:coarse)').matches?'轻触装置，唤起粒子':'移动鼠标，轻拨形态';
 for(const a of animations)a.cancel();animations=[];
 engine?.wake();
}
function setReduced(value){state.reduced=value;cancelAnimationFrame(exploreAnimation);reflectMotion();}
motionButton.addEventListener('click',()=>setReduced(!state.reduced));
reducedQuery.addEventListener('change',event=>setReduced(event.matches));
reflectMotion();syncProgress();

function selectCategory(id,focus=false){
 if(!['unity','software','films','lab'].includes(id))return;
 if(id!=='software')prepareVideoPlayer().catch(()=>{});
 state.category=id;
 for(const a of animations)a.cancel();animations=[];
 tabs.forEach(tab=>{const selected=tab.dataset.category===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;if(selected&&focus)tab.focus();});
 panels.forEach(panel=>panel.hidden=panel.id!=='panel-'+id);
 const panel=$('#panel-'+id);
 if(!state.reduced){
  if(id==='software'){
   animations.push(panel.querySelector('.software-intro').animate([{opacity:0,transform:'translateX(46px)'},{opacity:1,transform:'translateX(0)'}],{duration:600,easing:'cubic-bezier(.16,1,.3,1)'}));
   panel.querySelectorAll('.process-list li,.device-list').forEach((item,i)=>animations.push(item.animate([{opacity:0,transform:'translateX(40px)',clipPath:'inset(0 0 0 65%)'},{opacity:1,transform:'translateX(0)',clipPath:'inset(0)'}],{duration:650,delay:i*45,fill:'backwards',easing:'cubic-bezier(.16,1,.3,1)'})));
  }else if(id==='unity'){
   animations.push(panel.querySelector('.cover-button').animate([{opacity:.2,transform:'perspective(1000px) rotateY(9deg) translateX(-45px)'},{opacity:1,transform:'perspective(1000px) rotateY(0) translateX(0)'}],{duration:700,easing:'cubic-bezier(.16,1,.3,1)'}));
   animations.push(panel.querySelector('.project-copy').animate([{opacity:0,transform:'translateX(-20px)'},{opacity:1,transform:'translateX(0)'}],{duration:480,delay:90,fill:'backwards',easing:'ease-out'}));
  }else {panel.querySelectorAll('article,.planned-work').forEach((item,i)=>animations.push(item.animate([{opacity:.2,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0)'}],{duration:520,delay:i*70,fill:'backwards',easing:'ease-out'})));}
 }
 $('#panel-announcement').textContent='已切换到'+({unity:'Unity 游戏：四款项目实机演示',software:'软件开发：BOE 实习经历',films:'AE 影像：三部个人影片',lab:'AIGC：两部视觉短片'}[id])+'。';
 syncProgress();
}
tabs.forEach((tab,i)=>{
 tab.addEventListener('click',()=>selectCategory(tab.dataset.category));
 tab.addEventListener('keydown',event=>{
  let index=i;
  if(event.key==='ArrowRight')index=(i+1)%tabs.length;
  else if(event.key==='ArrowLeft')index=(i+tabs.length-1)%tabs.length;
  else if(event.key==='Home')index=0;
  else if(event.key==='End')index=tabs.length-1;
  else return;
  event.preventDefault();selectCategory(tabs[index].dataset.category,true);
 });
});

const details={
 boe:'<p class="project-type">ANDROID / KOTLIN / HMI</p><h2 class="detail-heading" id="detail-title">BOE · 智能设备交互 Demo</h2><div class="detail-copy"><p><strong>京东方（BOE）精电显示技术有限公司</strong><br/>PSV 开发部产品开发科 · 电子设计岗</p><p>参与咖啡机、工业 CNC、3D 打印机、洗衣机四款设备的 HMI 界面开发。根据需求梳理操作流程和页面结构，完成高保真 UI、控件与状态设计。</p><p>在 Android Studio 中使用 XML、ConstraintLayout 与 Material Design 组件搭建页面；使用 Kotlin 实现页面跳转、参数设置、状态切换、进度动画、报警弹窗和模式切换。</p><p>通过模拟数据验证操作流程，参与项目评审并根据反馈迭代。最终交付四款可操作 Demo，用于内部验证和演示。</p><p><strong>公开说明：</strong>当前展示经历与职责，界面与视频待确认公开范围后补充。</p></div>'
};
// Prepare the small shared player before a film click, including touch and deep links.
// Actual video segments remain click-to-load; the first-screen scene has priority.
const mediaWarmObserver=new IntersectionObserver(entries=>{
 if(entries.some(entry=>entry.isIntersecting)){
  prepareVideoPlayer().catch(()=>{});mediaWarmObserver.disconnect();
 }
},{rootMargin:'100% 0px'});
mediaWarmObserver.observe(works);
for(const eventName of ['pointerover','focusin','pointerdown'])document.addEventListener(eventName,event=>{
 if(event.target.closest('a[href="#works"],[role="tab"],[data-detail],[data-play],[data-film]'))prepareVideoPlayer().catch(()=>{});
},{passive:true});
function openDetail(id,opener){
 const html=id==='games'?gameList():games[id]?gameDetail(id):id==='ae'?filmList('ae'):id==='lab'?filmList('aigc'):details[id];
 if(!html)return;
 if(!dialog.open){lastOpener=opener;savedScroll=scrollY;}state.modal=true;engine?.pause();
 releaseMedia($('#detail-content'));$('#detail-content').classList.remove('is-playing');$('#detail-content').innerHTML=html;
 document.documentElement.classList.add('dialog-open');document.body.classList.add('dialog-open');
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;$('.dialog-close').focus({preventScroll:true});
 if(!state.reduced)dialog.animate([{opacity:0,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});
}
document.addEventListener('click',event=>{
 const detail=event.target.closest('[data-detail]');if(detail){openDetail(detail.dataset.detail,detail);return;}
 const play=event.target.closest('[data-play]');if(play){startMedia('game',play.dataset.play,$('#player-slot'));return;}
 const film=event.target.closest('[data-film]');if(film){
  if(!dialog.open)openDetail(films[film.dataset.film]?.group==='aigc'?'lab':'ae',film);
  startMedia('film',film.dataset.film,$('#player-slot'));
 }
});
$('.dialog-close').addEventListener('click',()=>dialog.close());
$('.detail-return').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
dialog.addEventListener('close',()=>{releaseMedia($('#detail-content'));$('#detail-content').replaceChildren();document.documentElement.classList.remove('dialog-open');document.body.classList.remove('dialog-open');state.modal=false;window.scrollTo({top:savedScroll,behavior:'instant'});lastOpener?.focus({preventScroll:true});syncProgress();engine?.wake();});

function cancelExplore(){cancelAnimationFrame(exploreAnimation);exploreAnimation=0;}
window.addEventListener('wheel',cancelExplore,{passive:true});window.addEventListener('touchstart',cancelExplore,{passive:true});window.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End','Escape',' '].includes(event.key))cancelExplore();});
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
 const target=$(link.getAttribute('href'));if(!target)return;
 event.preventDefault();cancelExplore();
 const inset=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'))||88;
 const top=target.id==='home'?0:link.hasAttribute('data-journey')?target.offsetTop:target.offsetTop-inset-22;
 const direct=!link.hasAttribute('data-explore')||state.reduced;
 history.replaceState(null,'','#'+target.id);
 if(direct){window.scrollTo({top,behavior:'instant'});syncProgress();return;}
 const from=scrollY,start=performance.now(),duration=1250;
 function step(now){const p=clamp((now-start)/duration),e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;window.scrollTo({top:from+(top-from)*e,behavior:'instant'});if(p<1)exploreAnimation=requestAnimationFrame(step);else exploreAnimation=0;}
 exploreAnimation=requestAnimationFrame(step);
}));
async function loadEngine(){
 if(initRequested)return;initRequested=true;
 try{
  const {createSpace}=await import('./space.js');
  engine=await createSpace({container:$('#visual'),state,onFailure:()=>{document.body.classList.add('webgl-failed');syncProgress();},onSelect:id=>openDetail(id==='tower'?'games':id,document.querySelector('.spatial-menu [data-detail="'+(id==='tower'?'games':id)+'"]'))});
  if(new URLSearchParams(location.search).has('inspect')){
   const output=document.createElement('output');output.id='prototype-metrics';output.style.cssText='position:fixed;bottom:8px;left:8px;z-index:70;max-width:90vw;background:#102522;color:#e8f0eb;font:11px monospace;padding:8px;pointer-events:none';
   document.body.append(output);setInterval(()=>{const m=engine.metrics(),s=m.frameTimesMs.sort((a,b)=>a-b);output.textContent=JSON.stringify({...m,frameTimesMs:undefined,frameP50:s.length?s[Math.floor(s.length*.5)].toFixed(1):null,frameP95:s.length?s[Math.floor(s.length*.95)].toFixed(1):null});},1000);
  }
 }catch(error){document.body.classList.add('webgl-failed');$('#interaction-hint').textContent='静态构图 · 作品可正常浏览';console.error('Particle scene unavailable; static portfolio retained.',error);}
}
requestAnimationFrame(()=>{if('requestIdleCallback' in window)requestIdleCallback(loadEngine,{timeout:1200});else setTimeout(loadEngine,180);});
window.addEventListener('pagehide',event=>{if(!event.persisted)engine?.dispose();else engine?.pause();});
window.addEventListener('pageshow',()=>engine?.wake());

// Review links select a real scroll position; they do not substitute a rendered mock-up.
const previewParams=new URLSearchParams(location.search),previewScene=previewParams.get('scene');
const reviewTargets={emblem:'home',intro:'intro',gallery:'spatial-gallery',machine:'machine',lab:'lab'};
if(reviewTargets[previewScene])requestAnimationFrame(()=>{
 if(previewParams.get('still')==='1')setReduced(true);
 const target=$('#'+reviewTargets[previewScene]);window.scrollTo({top:target.offsetTop,behavior:'instant'});syncProgress();
});
else if(location.hash)requestAnimationFrame(()=>requestAnimationFrame(()=>{
 const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));
 if(target){const inset=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'))||88;window.scrollTo({top:Math.max(0,target.offsetTop-inset-22),behavior:'instant'});syncProgress();}
}));
