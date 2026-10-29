import {clamp,smooth} from './weave-math.js';
// A single world: the camera travels down it. No section swaps or teleports.
export const CHAPTERS=[0,1,2,3,4,5];
const KEYS=[
 {p:0, eye:[0,0,11.8], look:[0,0,0]},
 {p:1, eye:[1.5,.2,5.1], look:[1.15,0,0]},
 {p:2, eye:[-2.2,-12.6,10.7], look:[0,-13,0]},
 {p:3, eye:[3.8,-14.1,9.7], look:[0,-13.5,0]},
 {p:4, eye:[.8,-27.1,10.5], look:[0,-27,0]},
 {p:5, eye:[-.4,-40,10.5], look:[0,-40,0]}
];
export function cameraPose(progress,mobile=false){
 const p=clamp(progress,0,5),i=Math.min(4,Math.floor(p)),t=smooth(p-i);
 const a=KEYS[i],b=KEYS[i+1];
 const eye=a.eye.map((v,k)=>v+(b.eye[k]-v)*t),look=a.look.map((v,k)=>v+(b.look[k]-v)*t);
 if(mobile){
  eye[0]*=.35;look[0]*=.35;
  const introLift=1-smooth(clamp(p));
  eye[2]+=7+introLift+7*smooth(clamp(p-4));
  eye[1]+=1.1*introLift;look[1]+=1.1*introLift;
 }
 return {eye,look};
}
export function scrollToChapter(y,anchors){
 if(y<=anchors[0])return 0;
 for(let i=0;i<anchors.length-1;i++)if(y<anchors[i+1])return i+clamp((y-anchors[i])/Math.max(1,anchors[i+1]-anchors[i]));
 return anchors.length-1;
}
export const CARD_SPECS=[
 {id:'tower',title:'TOWER DEFENSE',subtitle:'UNITY / C#',note:'原创概念封面 · 烽誓守望',image:'./art/tower-cover.webp',position:[-2.65,1.05,3.05],rotation:-.28},
 {id:'boe',title:'HUMAN / MACHINE',subtitle:'ANDROID / KOTLIN',note:'BOE 实习 · 经历与职责',position:[2.65,-.65,2.5],rotation:.33},
 {id:'ae',title:'MOTION & FILM',subtitle:'AE / PERSONAL FILMS',note:'墨菲定律 · 海勒姆定律',image:'./art/murphy-poster.jpg',position:[3.15,1.4,-2.3],rotation:1.1},
 {id:'lab',title:'THE LAB',subtitle:'AIGC / EXPLORATION',note:'筹备中 · 尚无公开作品',position:[-3.25,-1.1,-2.5],rotation:-1.05}
];
