import {clamp,smooth} from './weave-math.js';
// A single world: the camera travels down it. No section swaps or teleports.
export const CHAPTERS=[0,1,2,3,4,5];
const KEYS=[
 {p:0, eye:[0,0,10.5], look:[0,0,0]},
 {p:1, eye:[2.1,.15,4.6], look:[1.65,-.1,0]},
 {p:2, eye:[0,-12.6,12.5], look:[0,-13,0]},
 {p:3, eye:[3.6,-13.4,11.6], look:[.65,-13.3,0]},
 {p:4, eye:[.8,-27.1,10.5], look:[0,-27,0]},
 {p:5, eye:[-.4,-40,10.5], look:[0,-40,0]}
];
export function cameraPose(progress,mobile=false,aspect=16/9){
 const p=clamp(progress,0,5),i=Math.min(4,Math.floor(p)),t=smooth(p-i);
 const a=KEYS[i],b=KEYS[i+1];
 const eye=a.eye.map((v,k)=>v+(b.eye[k]-v)*t),look=a.look.map((v,k)=>v+(b.look[k]-v)*t);
 // Depth excursions begin and end at zero velocity. Scrolling back retraces the same path.
 const passage=Math.sin(Math.PI*t)**2;
 if(i===0){eye[2]-=passage*.7;look[0]+=passage*.22;}
 if(i===1){eye[0]+=passage*1.6;eye[2]-=passage*1.8;look[0]-=passage*1.6;look[1]-=passage*3.2;}
 if(i===2){eye[2]-=passage*1.35;eye[1]+=passage*.3;}
 if(i===3){eye[0]-=passage*2.2;eye[2]-=passage*1.8;look[0]-=passage*.4;look[1]-=passage*3.4;}
 if(i===4){eye[0]+=passage*2;eye[2]-=passage*1.8;look[0]+=passage*.3;look[1]-=passage*3.2;}
 if(mobile){
  eye[0]*=.35;look[0]*=.35;
  const introLift=1-smooth(clamp(p));
  eye[2]+=7+introLift+7*smooth(clamp(p-4));
  eye[1]+=2*introLift;look[1]+=2*introLift;
 }else eye[2]+=Math.max(0,1.24-aspect)*12;
 return {eye,look};
}
export function scrollToChapter(y,anchors){
 if(y<=anchors[0])return 0;
 for(let i=0;i<anchors.length-1;i++)if(y<anchors[i+1])return i+clamp((y-anchors[i])/Math.max(1,anchors[i+1]-anchors[i]));
 return anchors.length-1;
}
export const CARD_SPECS=[
 {id:'tower',title:'TOWER DEFENSE',subtitle:'UNITY / C#',note:'四款游戏 · 实机演示',image:'./art/tower-960.webp',position:[.75,.05,3.4],rotation:-.08},
 {id:'boe',title:'HUMAN / MACHINE',subtitle:'ANDROID / KOTLIN',note:'BOE 实习 · 经历与职责',position:[3.35,-.75,.25],rotation:-.38},
 {id:'ae',title:'MOTION & FILM',subtitle:'AE / PERSONAL FILMS',note:'三部个人影像作品',image:'./art/familiar-960.webp',position:[-2.6,1.35,-2.3],rotation:.42},
 {id:'lab',title:'THE LAB',subtitle:'AIGC / EXPLORATION',note:'空格里的小镇 · 一弧之间',image:'./art/town-960.webp',position:[-2.4,-1.2,-1.65],rotation:.38}
];
