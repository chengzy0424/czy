// Real project recordings and personal films; no game engine is shipped with this site.
export const games={
 tower:{title:'Tower Defense',subtitle:'烽誓 · 守望',genre:'策略塔防',imageNote:'原创概念封面',summary:'把战术，放进每一次选择。',description:'沿道路与地形部署防线，在敌人波次之间调整布局，让英雄与援军共同守住战线。',focus:'防御塔部署 · 敌人波次 · 英雄支援',demo:'建造防御塔、推进波次与战场支援。'},
 ash:{title:'far cry',subtitle:'Ash Exodus',genre:'第一人称射击',imageNote:'项目封面',summary:'从探索，到交火。',description:'第一人称射击方向的 Unity 项目，围绕场景探索、移动与射击反馈构建操作体验。',focus:'第一人称视角 · 场景探索 · 射击反馈',demo:'场景移动、视角控制与射击操作。'},
 csol:{title:'Csol far',subtitle:'Cs Oline Monster',genre:'第一人称射击',imageNote:'原创概念封面',summary:'让每次瞄准，都有明确的回应。',description:'Unity 射击项目，围绕第一人称视角、武器操作和战斗交互构建游戏流程。',focus:'移动瞄准 · 武器射击 · 换弹反馈',demo:'移动、瞄准、射击与换弹。'},
 mines:{title:'saolei',subtitle:'扫雷',genre:'经典益智',imageNote:'原创概念封面',summary:'在有限线索中，找到下一步。',description:'保留经典扫雷的推理规则，提供清晰的棋盘状态、翻格与标记反馈，以及适合触屏的操作方式。',focus:'邻格推理 · 翻格反馈 · 标记操作',demo:'翻开棋格、查看数字线索与标记。'}
};
export const films={
 murphy:{title:'墨菲定律',group:'ae',duration:'02:04',description:'用动态图像组织概念，让文字与画面共同推进叙事。'},
 hyrum:{title:'海勒姆定律',group:'ae',duration:'02:30',description:'围绕“看不见的约定”，用视觉叙事表达抽象想法。'},
 familiar:{title:'熟悉的陷阱',group:'ae',duration:'03:04',description:'从熟悉的日常线索出发，观察记忆与判断中的偏差。'},
 town:{title:'空格里的小镇',group:'aigc',duration:'01:04',description:'把键盘想象成一座小镇，在微缩场景中展开一段短篇。'},
 arc:{title:'一弧之间',group:'aigc',duration:'00:20',description:'以曲线、材质与节奏为线索，探索生成影像的视觉表达。'}
};
export function cover(id,alt,{lazy=true,sizes='(max-width:760px) 90vw, 48vw'}={}){return `<img src="./art/${id}-960.webp" srcset="./art/${id}-480.webp 480w, ./art/${id}-960.webp 960w, ./art/${id}-1440.webp 1440w" sizes="${sizes}" alt="${alt}" width="1600" height="900" decoding="async"${lazy?' loading="lazy"':''}/>`;}
export function gameDetail(id){const g=games[id];if(!g)return '';return `<p class="project-type">UNITY / C# / ${g.genre}</p><h2 class="detail-heading" id="detail-title">${g.title}<small>${g.subtitle}</small></h2><div class="detail-layout"><figure class="detail-cover">${cover(id,g.subtitle+' · '+g.imageNote,{lazy:false})}<figcaption>${g.imageNote}</figcaption></figure><div class="detail-copy"><h3>${g.summary}</h3><p>${g.description}</p><dl class="project-facts"><div><dt>设计关注</dt><dd>${g.focus}</dd></div><div><dt>演示内容</dt><dd>${g.demo}</dd></div></dl><button class="primary-link play-button" data-play="${id}">观看玩法演示 <span aria-hidden="true">▷</span></button><p class="load-note">实机录制 · 约半分钟 · 无声演示</p></div></div><div id="player-slot"></div>`;}
export function filmCards(group='ae'){return Object.entries(films).filter(([,f])=>f.group===group).map(([id,f])=>`<article><button class="film-cover" data-film="${id}" aria-label="观看${f.title}">${cover(id,f.title+'的实际影片画面')}<span class="film-play">观看影片 <span aria-hidden="true">▷</span></span></button><p class="film-meta">${group==='ae'?'AE / 个人影像':'AIGC / 视觉创作'}<span>${f.duration}</span></p><h3>${f.title}</h3><p>${f.description}</p></article>`).join('');}
export function filmList(group='ae'){return `<p class="project-type">${group==='ae'?'AE / PERSONAL FILMS':'AIGC / VISUAL EXPLORATIONS'}</p><h2 class="detail-heading" id="detail-title">${group==='ae'?'让想法，变成画面。':'想象，有了新的形状。'}</h2><div class="film-detail-grid">${filmCards(group)}</div><div id="player-slot"></div>`;}
export function gameList(){return `<p class="project-type">UNITY / SELECTED PROJECTS</p><h2 class="detail-heading" id="detail-title">四个世界，四种体验。</h2><div class="game-picker">${Object.entries(games).map(([id,g])=>`<button data-detail="${id}">${cover(id,g.subtitle+' · '+g.imageNote)}<span>${g.title}<small>${g.genre} / 实机演示</small></span><b aria-hidden="true">↗</b></button>`).join('')}</div><p class="disclosure">ARPG 处于计划阶段，后续记录开发进展。</p>`;}
// Attach a media source only after an explicit play action. Closing releases network/decoder work.
export function startMedia(kind,id,slot){
 const item=kind==='game'?games[id]:films[id];if(!slot||!item)return;releaseMedia(slot);slot.replaceChildren();
 const content=slot.closest('#detail-content');content?.classList.add('is-playing');
 const back=document.createElement('button');back.className='playback-back';back.type='button';back.textContent=kind==='game'?'← 返回项目介绍':'← 返回影片列表';
 back.addEventListener('click',()=>{releaseMedia(slot);slot.replaceChildren();content?.classList.remove('is-playing');document.querySelector('dialog').scrollTop=0;content?.querySelector(kind==='game'?'[data-play]':'[data-film="'+id+'"]')?.focus({preventScroll:true});});slot.append(back);
 const heading=document.createElement('h3');heading.className='player-title';heading.textContent=item.title+(kind==='game'?' · 玩法演示':'');slot.append(heading);
 const bar=document.createElement('div');bar.className='player-toolbar';const status=document.createElement('p');status.className='player-status';status.setAttribute('role','status');status.textContent='正在准备影片…';bar.append(status);
 const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.poster='./art/'+id+'-960.webp';video.className='film-player';video.setAttribute('aria-label',heading.textContent);
 const source=quality=>'./media/'+id+(kind==='game'?'-demo.mp4':'-'+quality+'.mp4');
 if(kind==='film'){
  const label=document.createElement('label');label.textContent='画质 ';const select=document.createElement('select');select.setAttribute('aria-label','影片画质');
  for(const [value,text] of [['720','720p · 快速播放'],['1080','1080p · 高清']]){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}
  select.addEventListener('change',()=>{const at=video.currentTime,paused=video.paused;video.src=source(select.value);video.addEventListener('loadedmetadata',()=>{video.currentTime=Math.min(at,video.duration||at);if(!paused)video.play().catch(()=>{});},{once:true});video.load();status.textContent='正在切换画质…';});label.append(select);bar.append(label);
 }
 const retry=document.createElement('button');retry.type='button';retry.textContent='重新加载';retry.className='media-retry';retry.hidden=true;retry.addEventListener('click',()=>{retry.hidden=true;video.load();video.play().catch(()=>{});status.textContent='正在重新连接…';});bar.append(retry);slot.append(bar,video);
 video.addEventListener('waiting',()=>status.textContent='正在缓冲…');video.addEventListener('playing',()=>{status.textContent=kind==='game'?'实机录制 · 无声演示':'正在播放';retry.hidden=true;});video.addEventListener('pause',()=>{if(!video.ended)status.textContent='已暂停';});video.addEventListener('ended',()=>status.textContent='播放结束，可再次观看');video.addEventListener('error',()=>{status.textContent='影片加载失败，请检查网络或重新加载。';retry.hidden=false;});
 video.src=source('720');video.play().catch(()=>{status.textContent='点击播放器中的播放按钮开始观看';});document.querySelector('dialog').scrollTop=0;
}
export function releaseMedia(root){root.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load();});}
