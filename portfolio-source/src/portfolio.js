// Only actual retained builds and personal films are playable.
export const games = {
 tower: {title:'Tower Defense', subtitle:'烽誓 · 守望', genre:'策略塔防', cover:'tower-cover.webp', imageNote:'原创概念封面', url:'fengshi', size:'43 MB', controls:'选择防御塔并点击地面建造；Space 发起下一波。', summary:'把战术，放进每一次选择。', description:'沿道路与地形部署防线，在敌人波次之间调整布局，让英雄与援军共同守住战线。', focus:'部署决策 · 敌人波次 · 战场反馈'},
 ash: {title:'far cry', subtitle:'Ash Exodus', genre:'第一人称射击', cover:'ash-exodus-cover.png', imageNote:'项目封面', url:'ash', size:'163 MB', controls:'WASD 移动，鼠标瞄准与射击；Space 跳过出场镜头，F1 查看操作说明，Esc 暂停并释放鼠标。', summary:'进入场景，亲自感受操作与反馈。', description:'第一人称射击方向的 Unity 项目。在可运行的场景中体验移动、视角控制和战斗交互。', focus:'第一人称操作 · 场景探索 · 射击反馈'},
 csol: {title:'Csol far', subtitle:'Cs Oline Monster', genre:'第一人称射击', cover:'csol-cover.webp', imageNote:'原创概念封面', url:'csol', size:'44 MB', controls:'WASD 移动，鼠标瞄准，左键射击、右键瞄准；靠近武器拾取，R 换弹，滚轮切换武器，Esc 释放鼠标。', summary:'让每次瞄准，都有明确的回应。', description:'Unity 射击项目，围绕第一人称视角、移动和射击构建可体验的游戏流程。', focus:'视角控制 · 移动操作 · 战斗交互'},
 mines: {title:'saolei', subtitle:'扫雷', genre:'经典益智', cover:'mines-cover.webp', imageNote:'原创概念封面', url:'mines', size:'13 MB', controls:'左键翻开，右键插旗；方向键移动，Enter 翻开，F 插旗。手机支持轻触和长按。', summary:'在有限线索中，找到下一步。', description:'保留经典扫雷的推理规则，提供清晰的棋盘状态、翻格与标记反馈，以及适合触屏的操作方式。', focus:'邻格推理 · 标记反馈 · 触屏操作'}
};
export const films = {
 murphy:{title:'墨菲定律',poster:'murphy-poster.jpg',file:'murphy.mp4',description:'用动态图像组织概念，让文字与画面共同推进叙事。'},
 hyrum:{title:'海勒姆定律',poster:'hyrum-poster.jpg',file:'hyrum.mp4',description:'围绕“看不见的约定”，用视觉叙事表达抽象想法。'}
};
export function gameDetail(id){
 const g=games[id];if(!g)return '';
 return `<p class="project-type">UNITY / C# / ${g.genre}</p><h2 class="detail-heading" id="detail-title">${g.title} <small>${g.subtitle}</small></h2><div class="detail-layout"><figure class="detail-cover"><img src="./art/${g.cover}" alt="${g.subtitle} · ${g.imageNote}"/><figcaption>${g.imageNote}</figcaption></figure><div class="detail-copy"><h3>${g.summary}</h3><p>${g.description}</p><dl class="project-facts"><div><dt>体验核心</dt><dd>${g.focus}</dd></div><div><dt>运行方式</dt><dd>浏览器 WebGL · 按需加载</dd></div></dl><p class="control-note">${g.controls}</p><button class="primary-link play-button" data-play="${id}">开始试玩 <span>↗</span></button><p class="load-note">首次约 ${g.size} · ${id==='mines'?'电脑与手机均可操作':'建议电脑键盘鼠标体验'}</p></div></div>${id==='tower'?'<details class="actual-screenshot"><summary>查看真实游戏画面</summary><img src="./art/fengshi-gameplay.png" loading="lazy" alt="Tower Defense Windows 构建的实际游戏画面"/><p class="detail-caption">Windows 构建的实际游戏画面</p></details>':''}<div id="player-slot"></div>`;
}
export function filmList(){return `<p class="project-type">AE / PERSONAL FILMS</p><h2 class="detail-heading" id="detail-title">让想法，变成画面。</h2><div class="film-detail-grid">${Object.entries(films).map(([id,f])=>`<article><button class="film-cover" data-film="${id}" aria-label="观看${f.title}"><img src="./art/${f.poster}" alt="${f.title}的实际影片画面"/><span class="film-play">播放影片 <span>▷</span></span></button><h3>${f.title}</h3><p>${f.description}</p></article>`).join('')}</div><div id="player-slot"></div>`;}
export function gameList(){return `<p class="project-type">UNITY / FOUR PLAYABLE PROJECTS</p><h2 class="detail-heading" id="detail-title">选择一个世界。</h2><div class="game-picker">${Object.entries(games).map(([id,g])=>`<button data-detail="${id}"><img src="./art/${g.cover}" alt="${g.subtitle} · ${g.imageNote}"/><span>${g.title}<small>${g.genre} / ${g.size}</small></span><b aria-hidden="true">↗</b></button>`).join('')}</div><p class="disclosure">ARPG 处于计划阶段，尚无可试玩版本。</p>`;}

// Called only in response to a media button. No iframe, video, or game loader exists before it.
export function startMedia(kind,id,slot){
 if(!slot)return;
 releaseMedia(slot);
 slot.replaceChildren();
 const heading=document.createElement('h3');heading.className='player-title';
 if(kind==='game'&&games[id]){
  const g=games[id];heading.textContent=g.title+' · 浏览器试玩';slot.append(heading);
  const frame=document.createElement('iframe');frame.className='game-frame';frame.title=g.title+' 游戏';frame.src='./games/'+g.url+'/index.html?embed=1';frame.allow='fullscreen; autoplay; gamepad';frame.allowFullscreen=true;slot.append(frame);
  const note=document.createElement('p');note.className='load-note';note.textContent=g.controls+' 退出时先按 Esc，再关闭项目。';slot.append(note);
 }else if(kind==='film'&&films[id]){
  const f=films[id];heading.textContent=f.title;slot.append(heading);
  const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.poster='./art/'+f.poster;video.src='./media/'+f.file;video.className='film-player';slot.append(video);
  video.addEventListener('error',()=>{const p=document.createElement('p');p.className='media-error';p.textContent='影片暂时无法加载，请检查网络后重试。';slot.append(p);},{once:true});
  video.play().catch(()=>{}); // Native controls remain available if autoplay is blocked.
 }
 slot.scrollIntoView({block:'nearest',behavior:'instant'});
}
export function releaseMedia(root){
 root.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load();});
 root.querySelectorAll('iframe').forEach(f=>{f.src='about:blank';f.remove();});
}
