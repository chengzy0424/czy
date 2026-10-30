import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
import * as math from '../src/weave-math.js';
import {scrollToChapter} from '../src/space-path.js';
import * as portfolio from '../src/portfolio.js';
function setup(reduced=false){
 const {window:dom,document}=parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 const listeners={},queries=[],frames=new Map();let id=0,focus=null;
 for(const [id,top,height] of [['intro',900,1300],['spatial-gallery',2200,2000],['machine',4200,1300],['lab',5500,1100]]){const e=document.querySelector('#'+id);Object.defineProperty(e,'offsetTop',{value:top});Object.defineProperty(e,'offsetHeight',{value:height});}
 const body=document.body,dialog=document.querySelector('dialog');
 dom.HTMLElement.prototype.animate=function(){return{cancel(){}};};
 dom.HTMLElement.prototype.focus=function(){focus=this;};
 dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new dom.Event('close'));};
 const works=document.querySelector('#works');Object.defineProperty(works,'offsetTop',{value:1000});Object.defineProperty(works,'offsetHeight',{value:1100});
 Object.defineProperty(document.querySelector('#home'),'offsetTop',{value:0});Object.defineProperty(document.querySelector('#contact'),'offsetTop',{value:2100});
 const context={document,Element:dom.Element,console,math,portfolio,scrollToChapter,innerHeight:900,scrollY:0,performance:{now:()=>1},location:{search:''},URLSearchParams,history:{replaceState(){}},getComputedStyle:()=>({getPropertyValue:()=>88}),requestAnimationFrame:cb=>{frames.set(++id,cb);return id;},cancelAnimationFrame:id=>frames.delete(id),setInterval(){},matchMedia:query=>{const q={matches:query.includes('reduced-motion')&&reduced,addEventListener:(_,cb)=>q.change=cb};queries.push(q);return q;}};
 context.window={addEventListener:(name,cb)=>listeners[name]=cb,scrollTo:({top})=>context.scrollY=top};
 const code=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace("import {clamp,smooth} from './weave-math.js';","const {clamp,smooth}=math;").replace("import {scrollToChapter} from './space-path.js';","").replace("import {games,films,gameDetail,gameList,filmList,startMedia,releaseMedia,prepareVideoPlayer} from './portfolio.js';","const {games,films,gameDetail,gameList,filmList,startMedia,releaseMedia,prepareVideoPlayer}=portfolio;");
 vm.runInNewContext(code,context,{filename:'main.js'});
 const click=selector=>document.querySelector(selector).dispatchEvent(new dom.Event('click',{bubbles:true,cancelable:true}));
 const key=(selector,key)=>{const e=new dom.Event('keydown',{bubbles:true,cancelable:true});e.key=key;document.querySelector(selector).dispatchEvent(e);};
 return{document,body,dialog,click,key,context,focus:()=>focus,queries};
}
test('rapid category changes leave one accessible panel; keyboard selection matches content',()=>{
 const app=setup();
 for(let i=0;i<20;i++)app.click(i%2?'#tab-unity':'#tab-software');
 assert.equal(app.document.querySelectorAll('[role=tabpanel]:not([hidden])').length,1);
 assert.equal(app.document.querySelector('#tab-unity').getAttribute('aria-selected'),'true');
 app.key('#tab-unity','ArrowRight');assert.equal(app.document.querySelector('#panel-software').hidden,false);
 assert.equal(app.document.querySelector('#panel-unity').hidden,true);assert.equal(app.focus().id,'tab-software');
 assert.equal(app.document.querySelector('#tab-unity').tabIndex,-1);
 app.key('#tab-software','Home');assert.equal(app.focus().id,'tab-unity');
});
test('details load on demand and return restores opener and scroll',()=>{
 const app=setup();assert.equal(app.document.querySelector('#detail-content').innerHTML,'');
 app.context.scrollY=944;app.click('[data-detail=tower]');assert.equal(app.dialog.open,true);
 assert.ok(app.document.querySelector('#detail-content .detail-cover img').getAttribute('src').endsWith('tower-960.webp'));
 assert.equal(app.document.querySelector('#detail-content video, #detail-content iframe'),null,'opening details must not load media');
 assert.match(app.document.querySelector('#detail-content [data-play]').textContent,/观看玩法演示[\s\S]*游戏原声/);
 assert.ok(app.body.classList.contains('dialog-open'));app.context.scrollY=0;app.click('.detail-return');
 assert.equal(app.dialog.open,false);assert.equal(app.context.scrollY,944);assert.equal(app.focus().dataset.detail,'tower');
 app.click('#tab-software');app.click('[data-detail=boe]');
 assert.ok(app.document.querySelector('#detail-content').textContent.includes('Kotlin'));
 assert.equal(app.document.querySelector('#detail-content img'),null);
});
test('reduced motion and direct-work bypass retain usable content',()=>{
 const app=setup(true);assert.equal(app.document.querySelector('#motion-toggle').getAttribute('aria-pressed'),'true');
 assert.ok(app.body.classList.contains('reduced-motion'));app.click('.primary-link');assert.equal(app.context.scrollY,890);
 app.click('#motion-toggle');assert.equal(app.body.classList.contains('reduced-motion'),false);
 app.queries[0].change({matches:true});assert.ok(app.body.classList.contains('reduced-motion'));
 app.click('#tab-software');assert.equal(app.document.querySelector('#panel-software').hidden,false);
 assert.ok(app.document.querySelector('a[href="mailto:434902760@qq.com"]'));
});
