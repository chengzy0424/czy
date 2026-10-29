export const clamp = (n,a=0,b=1)=>Math.min(b,Math.max(a,n));
export const smooth = n=>{n=clamp(n);return n*n*(3-2*n);};
export const mix=(a,b,t)=>a+(b-a)*t;
export const damp=(a,b,dt,rate=7)=>mix(a,b,1-Math.exp(-rate*Math.min(Math.max(dt,0),.05)));
export function seededRandom(seed=42024){return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
const path=[[-1.9,1.9,-.4],[1.65,1.5,.1],[-1.4,-.6,.65],[1.5,-2,-.15]];
export function center(t){
 const u=clamp(t)*3,i=Math.min(2,Math.floor(u)),f=u-i;
 const a=path[Math.max(0,i-1)],b=path[i],c=path[i+1],d=path[Math.min(3,i+2)];
 return b.map((v,k)=>.5*(2*v+(-a[k]+c[k])*f+(2*a[k]-5*v+4*c[k]-d[k])*f*f+(-a[k]+3*v-3*c[k]+d[k])*f*f*f));
}
export function positions(t,v,lane=0){
 const c=center(t),next=center(Math.min(1,t+.002)),prev=center(Math.max(0,t-.002));
 const dx=next[0]-prev[0],dy=next[1]-prev[1],len=Math.hypot(dx,dy)||1;
 const twist=t*Math.PI*2.5+lane*.85,width=(.38+.26*Math.sin(t*Math.PI))*(lane===1?.78:1),n=v*width,offset=lane-1;
 return {
 hero:[c[0]+n*(-dy/len)*Math.cos(twist)+offset*.12,c[1]+n*(dx/len)*Math.cos(twist)+offset*.24,c[2]+n*Math.sin(twist)+offset*.26],
 game:[(t-.5)*8,Math.sin(t*5.8+lane*.6)*(.55+lane*.12)+(lane-1)*.5+v*.32,Math.cos(t*4.8+lane*.9)*.8+v*.45],
 software:[(t-.5)*7.4,(lane-1)*1.12+v*.36,Math.sin(t*Math.PI)*.3+v*.55+(lane-1)*.18]
 };
}
export function makeWeave(count){
 const rand=seededRandom(),data={hero:new Float32Array(count*3),game:new Float32Array(count*3),software:new Float32Array(count*3),meta:new Float32Array(count*3)};
 for(let i=0;i<count;i++){
 const lane=i%3,t=rand(),raw=rand()*2-1,v=Math.sign(raw)*Math.pow(Math.abs(raw),1.25),p=positions(t,v,lane);
 const scatter=rand()<.045?.15+rand()*.3:.006,jitter=[(rand()-.5)*scatter,(rand()-.5)*scatter,(rand()-.5)*scatter];
 for(const name of ['hero','game','software'])for(let j=0;j<3;j++)data[name][i*3+j]=p[name][j]+jitter[j];
 data.meta.set([t,v,lane/2],i*3);
 }return data;
}
export function springStep(position,velocity,target,dt,stiffness=75,drag=15){
 let remaining=Math.min(Math.max(dt,0),.08),p=position,v=velocity;
 while(remaining>0){const step=Math.min(remaining,1/120);v+=(stiffness*(target-p)-drag*v)*step;p+=v*step;remaining-=step;}return[p,v];
}
export function scenePose(progress,mobile=false){
 const t=smooth(progress);
 return{x:mix(mobile?0:2.45,mobile?0:1.9,t),y:mix(mobile?-2.5:.08,1.2,t),scale:mix(mobile?.79:1,.78,t),rotation:mix(-.12,.12,t),cameraZ:mix(9.4,10.8,t),cameraX:mix(0,-.65,t)};
}
