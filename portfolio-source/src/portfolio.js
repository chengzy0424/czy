import catalog from './stream-catalog.json' with {type:'json'};
import {createStreamPlayer,prepareVideoPlayer} from './stream-player.js';
export {prepareVideoPlayer};
// Real project recordings and personal films; no game engine is shipped with this site.
export const games={
 tower:{title:'Tower Defense',subtitle:'烽誓 · 守望',genre:'策略塔防',imageNote:'原创概念封面',summary:'把战术，放进每一次选择。',description:'沿道路与地形部署防线，在敌人波次之间调整布局，让英雄与援军共同守住战线。',focus:'防御塔部署 · 敌人波次 · 英雄支援',demo:'建造防御塔、推进波次与战场支援。'},
 ash:{title:'far cry',subtitle:'Ash Exodus',genre:'第一人称射击',imageNote:'项目封面',summary:'从探索，到交火。',description:'第一人称射击方向的 Unity 项目，围绕场景探索、移动与射击反馈构建操作体验。',focus:'第一人称视角 · 场景探索 · 射击反馈',demo:'场景移动、视角控制与射击操作。'},
 csol:{title:'Csol far',subtitle:'Cs Oline Monster',genre:'第一人称射击',imageNote:'原创概念封面',summary:'让每次瞄准，都有明确的回应。',description:'Unity 射击项目，围绕第一人称视角、武器操作和战斗交互构建游戏流程。',focus:'移动瞄准 · 武器射击 · 换弹反馈',demo:'移动、瞄准、射击与换弹。'},
 mines:{title:'saolei',subtitle:'扫雷',genre:'经典益智',imageNote:'原创概念封面',summary:'在有限线索中，找到下一步。',description:'保留经典扫雷的推理规则，提供清晰的棋盘状态、翻格与标记反馈，以及适合触屏的操作方式。',focus:'邻格推理 · 翻格反馈 · 标记操作',demo:'翻开棋格、查看数字线索与标记。'}
};

// Keep delivery and the player on one explicit media manifest.
export const gameMedia={
 tower:{duration:'00:29',levels:[['720','720p · 原声','tower-demo-audio.mp4']]},
 ash:{duration:'01:02',levels:[['low','流畅 · 30帧','ash-demo-low.mp4'],['720','720p · 60帧','ash-demo-audio.mp4'],['hd','高清 · 60帧','ash-demo-hd.mp4']]},
 csol:{duration:'00:42',levels:[['low','流畅 · 30帧','csol-demo-low.mp4'],['720','720p · 60帧','csol-demo-audio.mp4'],['hd','高清 · 60帧','csol-demo-hd.mp4']]},
 mines:{duration:'00:22',levels:[['720','720p · 原声','mines-demo-audio.mp4']]}
};
const implementation={
 tower:['防线部署与波次推进','围绕道路布置防御塔，结合英雄移动与技能支援组织战斗。','建造 → 开波 → 支援战线'],
 ash:['第一人称探索与战斗交互','通过移动、视角控制、瞄准射击与武器切换，串联场景中的行动过程。','探索 → 武器操作 → 交火'],
 csol:['武器操作与反馈','将移动瞄准、连续射击和换弹串成完整的第一人称操作循环。','移动 → 瞄准射击 → 换弹'],
 mines:['棋盘规则与交互反馈','围绕数字线索、展开与标记组织经典扫雷流程，保留清晰的棋格状态。','翻格 → 读取线索 → 标记']
};

export const films={
 murphy:{title:'墨菲定律',group:'ae',duration:'02:04',description:'用动态图像组织概念，让文字与画面共同推进叙事。'},
 hyrum:{title:'海勒姆定律',group:'ae',duration:'02:30',description:'围绕“看不见的约定”，用视觉叙事表达抽象想法。'},
 familiar:{title:'熟悉的陷阱',group:'ae',duration:'03:04',description:'从熟悉的日常线索出发，观察记忆与判断中的偏差。'},
 town:{title:'空格里的小镇',group:'aigc',duration:'01:04',description:'把键盘想象成一座小镇，在微缩场景中展开一段短篇。'},
 arc:{title:'一弧之间',group:'aigc',duration:'00:20',description:'以曲线、材质与节奏为线索，探索生成影像的视觉表达。'}
};
export function cover(id,alt,{lazy=true,sizes='(max-width:760px) 90vw, 48vw'}={}){return `<img src="./art/${id}-960.webp" srcset="./art/${id}-480.webp 480w, ./art/${id}-960.webp 960w, ./art/${id}-1440.webp 1440w" sizes="${sizes}" alt="${alt}" width="1600" height="900" decoding="async"${lazy?' loading="lazy"':''}/>`;}
export function gameDetail(id){
 const g=games[id];if(!g)return '';const [practice,implementationText,watch]=implementation[id],m=gameMedia[id];
 return `<p class="project-type">UNITY / C# / ${g.genre}</p><h2 class="detail-heading" id="detail-title">${g.title}<small>${g.subtitle}</small></h2><div class="detail-layout"><figure class="detail-cover">${cover(id,g.subtitle+' · '+g.imageNote,{lazy:false})}<figcaption>${g.imageNote} <span>${m.duration} · 演示含游戏原声</span></figcaption><button class="primary-link play-button" data-play="${id}"><span>观看玩法演示 <small>${m.duration} · 游戏原声</small></span><span aria-hidden="true">▷</span></button></figure><div class="detail-copy"><h3>${g.summary}</h3><p>${g.description}</p><dl class="project-facts"><div><dt>开发实践</dt><dd>${practice}</dd></div><div><dt>核心实现</dt><dd>${implementationText}</dd></div><div><dt>演示看点</dt><dd>${watch}</dd></div></dl></div></div><div id="player-slot"></div>`;
}
export function filmCards(group='ae'){return Object.entries(films).filter(([,f])=>f.group===group).map(([id,f])=>`<article><button class="film-cover" data-film="${id}" aria-label="观看${f.title}">${cover(id,f.title+'的实际影片画面')}<span class="film-play">观看影片 <span aria-hidden="true">▷</span></span></button><p class="film-meta">${group==='ae'?'AE / 个人影像':'AIGC / 视觉创作'}<span>${f.duration}</span></p><h3>${f.title}</h3><p>${f.description}</p></article>`).join('');}
export function filmList(group='ae'){return `<p class="project-type">${group==='ae'?'AE / PERSONAL FILMS':'AIGC / VISUAL EXPLORATIONS'}</p><h2 class="detail-heading" id="detail-title">${group==='ae'?'让想法，变成画面。':'想象，有了新的形状。'}</h2><div class="film-detail-grid">${filmCards(group)}</div><div id="player-slot"></div>`;}
export function gameList(){return `<p class="project-type">UNITY / SELECTED PROJECTS</p><h2 class="detail-heading" id="detail-title">四个世界，四种体验。</h2><div class="game-picker">${Object.entries(games).map(([id,g])=>`<button data-detail="${id}">${cover(id,g.subtitle+' · '+g.imageNote)}<span>${g.title}<small>${g.genre} / ${gameMedia[id].duration} · 原声演示</small></span><b aria-hidden="true">↗</b></button>`).join('')}</div><p class="disclosure">ARPG 处于计划阶段，后续记录开发进展。</p>`;}
// Attach sources only after a play action. Closing aborts all segment requests.
export function startMedia(kind,id,slot){
 const item=kind==='game'?games[id]:films[id],stream=catalog[id];if(!slot||!item||!stream)return;
 releaseMedia(slot);slot.replaceChildren();const content=slot.closest('#detail-content');content?.classList.add('is-playing');
 const back=document.createElement('button');back.className='playback-back';back.type='button';back.textContent=kind==='game'?'← 返回项目介绍':'← 返回影片列表';
 back.addEventListener('click',()=>{releaseMedia(slot);slot.replaceChildren();content?.classList.remove('is-playing');document.querySelector('dialog').scrollTop=0;content?.querySelector(kind==='game'?'[data-play]':'[data-film="'+id+'"]')?.focus({preventScroll:true});});slot.append(back);
 const heading=document.createElement('h3');heading.className='player-title';heading.textContent=item.title+(kind==='game'?' · 玩法演示':'');slot.append(heading);
 const bar=document.createElement('div');bar.className='player-toolbar';const status=document.createElement('p');status.className='player-status';status.setAttribute('role','status');status.textContent='正在准备影片…';bar.append(status);
 const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='auto';video.muted=false;video.volume=.8;video.poster='./art/'+id+'-960.webp';video.className='film-player';video.setAttribute('aria-label',heading.textContent);
 const levels=stream.levels.map(l=>({key:l.level,label:l.level.startsWith('low')?'流畅 · 480p':l.level==='hd'?(kind==='game'?'高清 · 60帧':'1080p · 高清'):'720p'+(l.fps===60?' · 60帧':'')}));
 const select=document.createElement('select');select.setAttribute('aria-label','影片画质');
 const label=document.createElement('label');label.textContent='画质 ';
 for(const [value,text] of [['-1','自动 · 优先流畅'],...levels.map((l,i)=>[String(i),l.label])]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}label.append(select);bar.append(label);
 const recovery=document.createElement('div');recovery.className='media-recovery';recovery.hidden=true;
 const retry=document.createElement('button');retry.type='button';retry.textContent='重新连接';retry.className='media-retry';
 const fallbackButton=document.createElement('button');fallbackButton.type='button';fallbackButton.textContent='切换兼容播放';fallbackButton.className='media-retry';recovery.append(retry,fallbackButton);slot.append(bar,recovery,video);
 let timer=0,disposed=false;
 const clearWait=()=>{clearTimeout(timer);timer=0;};
 const offerRecovery=()=>{if(!timer)timer=setTimeout(()=>{timer=0;if(!disposed&&video.readyState<3){recovery.hidden=false;status.textContent='当前连接较慢，可重新连接或切换兼容播放。';}},12000);};
 const controller=createStreamPlayer({video,path:'./'+stream.path,levels,
  fallback:'./media/'+(kind==='game'?gameMedia[id].levels[0][2]:id+'-720.mp4'),
  onStatus:text=>{status.textContent=text;},onQuality:index=>{video.dataset.quality=levels[index]?.key||'auto';},
  onMode:mode=>{video.dataset.playbackMode=mode;select.disabled=mode==='fallback';},
  onFailure:text=>{clearWait();status.textContent=text;recovery.hidden=false;}
 });
 video.addEventListener('waiting',offerRecovery);
 video.addEventListener('playing',()=>{clearWait();recovery.hidden=true;});
 video.addEventListener('pause',clearWait);
 select.addEventListener('change',()=>controller.quality(Number(select.value)));
 retry.addEventListener('click',()=>{recovery.hidden=true;controller.retry();offerRecovery();});
 fallbackButton.addEventListener('click',()=>{recovery.hidden=true;controller.compatibility();offerRecovery();});
 video._release=()=>{disposed=true;clearWait();controller.destroy();};
 controller.start();offerRecovery();document.querySelector('dialog').scrollTop=0;
}
export function releaseMedia(root){root.querySelectorAll('video').forEach(v=>{if(v._release)v._release();else{v.pause();v.removeAttribute('src');v.load();}});}
