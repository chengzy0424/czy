import {clamp,smooth} from './weave-math.js';
// A single world: the camera travels down it. No section swaps or teleports.
export const CHAPTERS=[0,1,2,3,4,5,6];
// Hold each composition briefly at both ends; the middle carries the passage.
export function chapterBlend(t){return smooth(clamp((t-.09)/.82));}
export function passageStrength(p){return Math.sin(Math.PI*chapterBlend(p-Math.floor(p)))**2;}
const KEYS=[
 {p:0, eye:[0,0,10.5], look:[0,0,0]},
 {p:1, eye:[2.1,.15,4.6], look:[1.65,-.1,0]},
 {p:2, eye:[0,-12.6,11.7], look:[0,-13,0]},
 {p:3, eye:[0,-12.6,11.7], look:[0,-13,0]},
 {p:4, eye:[.8,-24.5,12], look:[0,-24.6,0]},
 {p:5, eye:[-.4,-34,10.5], look:[0,-34,0]},
 {p:6, eye:[0,-45.5,12], look:[0,-45.5,0]}
];
export function cameraPose(progress,mobile=false,aspect=16/9){
 const p=clamp(progress,0,6),i=Math.min(5,Math.floor(p)),t=chapterBlend(p-i);
 const a=KEYS[i],b=KEYS[i+1];
 const eye=a.eye.map((v,k)=>v+(b.eye[k]-v)*t),look=a.look.map((v,k)=>v+(b.look[k]-v)*t);
 // Depth excursions begin and end at zero velocity. Scrolling back retraces the same path.
 const passage=Math.sin(Math.PI*t)**2;
 if(i===0){eye[2]-=passage*.7;look[0]+=passage*.22;}
 if(i===1){eye[0]+=passage*1.6;eye[2]-=passage*1.8;look[0]-=passage*1.6;look[1]-=passage*3.2;}
 if(i===3){eye[0]-=passage*1.2;eye[2]+=passage*2;look[0]-=passage*.4;look[1]-=passage*1.2;}
 if(i===4){eye[0]+=passage*1.4;eye[2]+=passage*1.8;look[0]+=passage*.3;look[1]-=passage*1.4;}
 if(i===5){eye[0]-=passage*.8;eye[2]+=passage*1.5;look[1]-=passage;}
 if(mobile){
  eye[0]*=.35;look[0]*=.35;
  const introLift=1-smooth(clamp(p));
  eye[2]+=7+introLift+7*smooth(clamp(p-4));
  const readingInset=aspect<.45?1.1:0;
  eye[1]+=(2+readingInset)*introLift;look[1]+=(2+readingInset)*introLift;
 }else eye[2]+=Math.max(0,1.24-aspect)*12;
 const roll=mobile?0:(i===3?.09:i===4?-.065:0)*passage;
 return {eye,look,roll};
}
export function scrollToChapter(y,anchors){
 if(y<=anchors[0])return 0;
 for(let i=0;i<anchors.length-1;i++)if(y<anchors[i+1])return i+clamp((y-anchors[i])/Math.max(1,anchors[i+1]-anchors[i]));
 return anchors.length-1;
}
const GALLERY_CARD_COUNT=7;
// Every real project gets a short reading hold. The return scroll retraces the same helix.
export function galleryCardPose(index,progress,mobile=false){
 const advance=clamp(progress-2)*(GALLERY_CARD_COUNT-1),step=Math.min(GALLERY_CARD_COUNT-2,Math.floor(advance));
 const centerIndex=step+chapterBlend(advance-step),relative=index-centerIndex;
 const phase=relative*Math.PI*2/GALLERY_CARD_COUNT;
 return {
  position:[(mobile?0:.65)+Math.sin(phase)*(mobile?3.3:3.8),3.8*Math.tanh(relative*.32),Math.cos(phase)*3],
  rotation:[.035*Math.sin(phase),phase,.025*Math.sin(phase)],
  visible:true,
  focus:1-smooth(clamp(Math.abs(relative)/1.15))
 };
}
export const CARD_SPECS=[
 {id:'tower',title:'TOWER DEFENSE',lines:['TOWER','DEFENSE'],subtitle:'UNITY / C#',note:'烽誓 · 守望 · 策略塔防',image:'./art/tower-960.webp'},
 {id:'ash',title:'ASH EXODUS',lines:['ASH','EXODUS'],subtitle:'UNITY / FPS',note:'far cry · 原声玩法演示',image:'./art/ash-960.webp'},
 {id:'csol',title:'CSOL FAR',lines:['CSOL','FAR'],subtitle:'UNITY / FPS',note:'Cs Oline Monster · 射击交互',image:'./art/csol-960.webp'},
 {id:'mines',title:'MINESWEEPER',lines:['MINESWEEPER'],subtitle:'UNITY / PUZZLE',note:'扫雷 · 推理与触屏操作',image:'./art/mines-960.webp'},
 {id:'boe',title:'HUMAN MACHINE',lines:['HUMAN','MACHINE'],subtitle:'ANDROID / KOTLIN',note:'BOE 实习 · 经历与职责'},
 {id:'ae',title:'MOTION FILM',lines:['MOTION','FILM'],subtitle:'AE / PERSONAL FILMS',note:'三部个人影像作品',image:'./art/familiar-960.webp'},
 {id:'lab',title:'THE LAB',lines:['THE LAB'],subtitle:'AIGC / EXPLORATION',note:'空格里的小镇 · 一弧之间',image:'./art/town-960.webp'}
].map((spec,index)=>{const pose=galleryCardPose(index,2);return {...spec,position:pose.position,rotation:pose.rotation[1]};});

