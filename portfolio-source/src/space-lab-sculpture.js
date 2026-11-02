import * as T from 'three';
import {LAB_WAVE_PERIOD} from './space-forms.js';

// Closed bevelled ribbons, rather than round rods. The changing face normals
// break a reflection into narrow glints without using animated glow textures.
function ribbon(points,width,thickness,material,segments=28){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),vertices=[],indices=[];
 const point=new T.Vector3(),tangent=new T.Vector3(),side=new T.Vector3(),up=new T.Vector3();
 const profile=[[-1,0],[-.75,.65],[0,1],[.75,.65],[1,0],[.7,-.6],[0,-.75],[-.7,-.6]];
 for(let i=0;i<=segments;i++){
  const t=i/segments;curve.getPoint(t,point);curve.getTangent(t,tangent);
  side.set(-tangent.y,tangent.x,0).normalize();up.crossVectors(tangent,side).normalize();
  const taper=.18+.82*Math.pow(Math.sin(Math.PI*t),.55),w=(typeof width==='function'?width(t):width)*taper;
  for(const [x,z] of profile)vertices.push(point.x+side.x*x*w+up.x*z*thickness,point.y+side.y*x*w+up.y*z*thickness,point.z+side.z*x*w+up.z*z*thickness);
  if(i<segments)for(let k=0;k<8;k++){const a=i*8+k,b=i*8+(k+1)%8;indices.push(a,b,a+8,b,b+8,a+8);}
 }
 for(let k=1;k<7;k++){indices.push(0,k+1,k);const end=segments*8;indices.push(end,end+k,end+k+1);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 return new T.Mesh(geometry,material);
}

function arc(cx,rx,ry,z,start,end,bend=0){
 return Array.from({length:25},(_,i)=>{const a=start+(end-start)*i/24;return [cx+rx*Math.cos(a)+bend*Math.sin(2*a),ry*Math.sin(a),z+.19*Math.cos(a)+.08*Math.sin(3*a)];});
}

function shardGeometry(){
 const vertices=[],index=[];
 for(const [r,z] of [[.82,.047],[1,.018],[.92,-.025]])for(let n=0;n<6;n++){
  const shape=[[-1,-.45],[.1,-.8],[.95,-.15],[.5,.7],[-.3,.5],[-.85,.2]];
  vertices.push(shape[n][0]*r,shape[n][1]*r,z);
 }
 for(let n=1;n<5;n++)index.push(0,n,n+1,12,12+n+1,12+n);
 for(let row=0;row<2;row++)for(let n=0;n<6;n++){const a=row*6+n,b=row*6+(n+1)%6;index.push(a,b,a+6,b,b+6,a+6);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(index);geometry.computeVertexNormals();return geometry;
}

export function createLabSculpture({material,markerPlane,mobile=false}){
 const root=new T.Group();root.name='lab-left-assembly';
 const polished=material.clone();polished.color.set(0xc3cec6);polished.roughness=.14;polished.metalness=.96;polished.envMapIntensity=1.7;polished.bumpScale=.033;
 const dark=polished.clone();dark.color.set(0x646f6c);dark.roughness=.26;dark.envMapIntensity=.9;
 const gauze=polished.clone();gauze.color.set(0x98b6ad);gauze.transparent=true;gauze.opacity=.18;gauze.depthWrite=false;gauze.roughness=.12;gauze.envMapIntensity=.75;
 const layers=[];
 // Broken, overlapping shells reveal the opening all the way through. None
 // spans its centre, so the mouth cannot turn into a flat black cylinder.
 for(let layer=0;layer<4;layer++){
  const shell=new T.Group();shell.name=`lab-lip-shell-${layer}`;
  const rx=.77+layer*.044,ry=1.32+layer*.053,cx=-3.42+layer*.018,z=.48+layer*.32;
  const offset=layer*.14;
  shell.add(ribbon(arc(cx,rx,ry,z,-1.35+offset,.81+offset,.018*layer),t=>.025+.038*Math.sin(t*Math.PI*3)**2,.01,layer<2?dark:polished,mobile?24:36));
  shell.add(ribbon(arc(cx,rx,ry,z,1.73-offset,3.37-offset,.018*layer),t=>.034+.035*Math.sin(t*Math.PI*2)**2,.012,layer===0?dark:polished,mobile?22:30));
  shell.add(ribbon(arc(cx,rx,ry,z,3.63+offset,4.78+offset,.018*layer),.028,.01,layer===0?dark:polished,mobile?16:22));
  // A thin offset reflection is a separate surface, not a screen-space halo.
  if(layer===1||layer===3)shell.add(ribbon(arc(cx-.025,rx-.055,ry-.06,z+.095,1.83,4.15,.025),.014,.006,gauze,mobile?22:30));
  root.add(shell);layers.push(shell);
 }
 const sculpture=new T.Group();sculpture.name='lab-left-sculpture';sculpture.position.set(-3.39,0,markerPlane+.035);root.add(sculpture);
 const front=new T.Group();front.name='lab-left-blades';sculpture.add(front);
 const rear=new T.Group();rear.name='lab-left-echo';rear.position.set(.095,.035,-.32);rear.rotation.z=.055;sculpture.add(rear);
 const directions=[[0,1,1.23],[-1,0,.72],[0,-1,1.2],[1,0,.77]];
 const plateData=[];
 for(let arm=0;arm<4;arm++){
  const [dx,dy,length]=directions[arm],sx=-dy,sy=dx;
  function center(t,branch=0){
   const sweep=(arm%2===0?.15:-.07)*Math.sin(t*Math.PI*.8)+branch*(.025+.085*Math.sin(t*Math.PI));
   return [dx*length*t+sx*sweep,dy*length*t+sy*sweep,.025+.13*Math.sin(t*Math.PI)+branch*.027+.022*Math.sin(t*31+arm)];
  }
  // Split, swept blades leave a real slit between the two polished edges.
  for(const branch of [-1,1]){
   const points=Array.from({length:9},(_,i)=>center(i/8,branch));
   const blade=ribbon(points,t=>.042+.035*Math.sin(t*Math.PI),.018,polished,mobile?18:26);front.add(blade);
   rear.add(ribbon(points,.046,.009,gauze,mobile?16:22));
  }
  // Small folded scales interrupt the continuous bars. The seed is fixed so
  // reloads, scroll reversal and reduced-motion all retain the same sculpture.
  const count=arm%2===0?8:5;
  for(let i=1;i<count;i++)for(const side of [-1,1]){
   const t=i/count,p=center(t,side),seed=Math.sin(i*17.3+arm*4.1+side)*.5+.5;
   p[0]+=sx*side*.025;p[1]+=sy*side*.025;p[2]+=.025+(i%3)*.014;
   plateData.push({p,rotation:[side*(.28+seed*.4),.17*Math.sin(i),Math.atan2(dy,dx)+.18*side],scale:[.09+.055*seed,.052+.03*seed,.45]});
  }
 }
 const shards=new T.InstancedMesh(shardGeometry(),polished,plateData.length),dummy=new T.Object3D();shards.name='lab-left-faceted-scales';
 plateData.forEach(({p,rotation,scale},i)=>{dummy.position.fromArray(p);dummy.rotation.set(...rotation);dummy.scale.fromArray(scale);dummy.updateMatrix();shards.setMatrixAt(i,dummy.matrix);shards.setColorAt(i,new T.Color().setRGB(.65+(i%4)*.08,.69+(i%4)*.07,.66+(i%4)*.07));});front.add(shards);
 root.userData.layerDepth=.96;
 function update(time){
  const phase=time*Math.PI*2/LAB_WAVE_PERIOD;
  layers.forEach((shell,i)=>{shell.position.z=.035*Math.sin(phase-i*.6);shell.position.y=.012*Math.sin(phase-i*.4);shell.rotation.y=.012*Math.sin(phase-i*.5);});
  front.rotation.y=.14*Math.sin(phase);front.rotation.z=.018*Math.sin(phase);front.position.y=.018*Math.sin(phase);
  rear.rotation.y=-.16*Math.sin(phase+.35);rear.position.x=.095+.028*Math.sin(phase+.8);rear.position.z=-.32+.04*Math.sin(phase+.5);
 }
 update(0);return {root,update};
}
