import {games, startMedia, releaseMedia, prepareVideoPlayer} from './portfolio.js';

// Keep previously shared links to spatial chapters on the retained exhibition.
const legacyChapters=new Set(['intro','spatial-gallery','machine','lab','confluence']);
const legacyScenes=new Set(['emblem','intro','gallery','machine','lab']);
function routeLegacy(){
  if(legacyChapters.has(location.hash.slice(1))||legacyScenes.has(new URLSearchParams(location.search).get('scene'))){
    location.replace('./exhibition.html'+location.search+location.hash);
  }
}
routeLegacy();window.addEventListener('hashchange',routeLegacy);

const dialog=document.querySelector('#video-dialog');
const slot=document.querySelector('#player-slot');
const title=document.querySelector('#video-dialog-title');
let opener=null, savedScroll=0, warmTimer=0;

function setPreview(id,focus=false){
  const tabs=[...document.querySelectorAll('[data-preview]')];
  for(const tab of tabs){
    const selected=tab.dataset.preview===id;
    tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;
    if(selected&&focus)tab.focus();
  }
}
const previewTabs=[...document.querySelectorAll('[data-preview]')];
previewTabs.forEach((tab,i)=>{
  tab.addEventListener('click',()=>setPreview(tab.dataset.preview));
  tab.addEventListener('keydown',event=>{
    let index=i;
    if(event.key==='ArrowRight')index=(i+1)%previewTabs.length;
    else if(event.key==='ArrowLeft')index=(i+previewTabs.length-1)%previewTabs.length;
    else if(event.key==='Home')index=0;
    else if(event.key==='End')index=previewTabs.length-1;
    else return;
    event.preventDefault();setPreview(previewTabs[index].dataset.preview,true);
  });
});

function playGame(id,button){
  if(!games[id])return;
  clearTimeout(warmTimer);
  opener=button;savedScroll=window.scrollY;
  title.textContent=games[id].title+' · '+games[id].subtitle;
  dialog.showModal();document.documentElement.classList.add('dialog-open');
  startMedia('game',id,slot);
  if(id==='ash'||id==='echo')slot.querySelector('video').poster='./art/recruit/'+id+'-960.webp';
}
document.addEventListener('click',event=>{
  const play=event.target.closest('[data-play]');
  if(play){playGame(play.dataset.play,play);return;}
  const jump=event.target.closest('[data-open-case]');
  if(jump){const target=document.getElementById(jump.dataset.openCase);if(target)target.open=true;}
});
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const box=dialog.getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();
});
dialog.addEventListener('close',()=>{
  releaseMedia(slot);slot.replaceChildren();
  document.querySelector('#detail-content').classList.remove('is-playing');
  document.documentElement.classList.remove('dialog-open');
  window.scrollTo({top:savedScroll,behavior:'instant'});opener?.focus({preventScroll:true});
});
// Intent warms the existing player; merely browsing requests no video fragments.
for(const type of ['pointerover','focusin','pointerdown'])document.addEventListener(type,event=>{
  const button=event.target.closest('[data-play]');if(!button||!games[button.dataset.play])return;
  clearTimeout(warmTimer);
  if(type==='pointerover'&&event.pointerType==='touch')return;
  warmTimer=setTimeout(()=>prepareVideoPlayer(button.dataset.play).catch(()=>{}),type==='pointerover'?100:0);
});
document.addEventListener('pointerout',event=>{
  const button=event.target.closest('[data-play]');
  if(button&&!button.contains(event.relatedTarget))clearTimeout(warmTimer);
});
window.addEventListener('pagehide',()=>{clearTimeout(warmTimer);releaseMedia(slot);});

function openHashCase(){
  const hash=location.hash.slice(1);
  if(hash==='ash-case'||hash==='echo-case')document.getElementById(hash).open=true;
}
openHashCase();window.addEventListener('hashchange',openHashCase);

// All reading content is present before JavaScript. Enhance entrances only when
// motion is welcome; keep the final state if a browser lacks the observer API.
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
if(!reduce.matches&&'IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add(entry.target.matches('img')?'enter-image':'enter');observer.unobserve(entry.target);}
  },{threshold:.08});
  document.querySelectorAll('main section h2,.featured-project,.case-study,.archive-grid article,.internship,.film-pair a').forEach(element=>observer.observe(element));
}
