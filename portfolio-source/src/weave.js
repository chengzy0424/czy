import * as THREE from 'three';
import {makeWeave,positions,damp,springStep,scenePose,clamp} from './weave-math.js';
const VERTEX="\nattribute vec3 aGame;\nattribute vec3 aSoftware;\nattribute vec3 aMeta;\nuniform float uTime;\nuniform float uUnfold;\nuniform float uCategory;\nuniform float uDpr;\nuniform float uStrength;\nuniform float uEnergy;\nuniform vec3 uTrail[4];\nvarying vec3 vColor;\nvarying float vAlpha;\nvoid main(){\n vec3 p=mix(position,mix(aGame,aSoftware,uCategory),uUnfold);\n float t=aMeta.x, v=aMeta.y, lane=aMeta.z;\n float fold=1.0-uCategory*uUnfold;\n p.z+=sin(t*18.0+uTime*.65+lane*2.0)*.038*fold;\n p.y+=sin(t*9.0-uTime*.42+lane*1.7)*.025*fold;\n vec4 world=modelMatrix*vec4(p,1.0);\n vec2 shift=vec2(0.0);\n for(int i=0;i<4;i++){\n  vec2 delta=world.xy-uTrail[i].xy;\n  float distanceToPointer=length(delta);\n  float influence=exp(-distanceToPointer*distanceToPointer*2.0)*uTrail[i].z*uStrength;\n  vec2 normal=delta/max(.035,distanceToPointer);\n  vec2 tangent=vec2(-normal.y,normal.x);\n  shift+=(normal*.66+tangent*.26)*influence*(.85+uEnergy*.28);\n }\n world.xy+=shift;\n world.z+=length(shift)*.32;\n vec4 mv=viewMatrix*world;\n gl_Position=projectionMatrix*mv;\n float grain=fract(sin(t*12587.2+v*7683.3+lane*91.0)*43758.5453);\n gl_PointSize=clamp((.75+grain*1.0)*uDpr*9.4/max(2.0,-mv.z),.75,4.5*uDpr);\n float sheen=.5+.5*sin(t*14.0+lane*4.2+v*1.8+uTime*.13);\n vec3 teal=vec3(.21,.55,.53), silver=vec3(.79,.91,.85);\n vec3 color=mix(teal,silver,pow(sheen,1.6));\n float magenta=smoothstep(.54,.82,t)*(1.0-smoothstep(.83,.97,t))*lane*.6;\n color=mix(color,vec3(.68,.34,.60),magenta);\n color=mix(color,vec3(.37,.65,.61),uCategory*uUnfold*.3);\n vColor=color+vec3(.08)*min(1.0,length(shift));\n vAlpha=(.25+grain*.5)*(1.0-.18*abs(v))*clamp(1.4+world.z*.18,.3,1.25);\n}";
const FRAGMENT="\nvarying vec3 vColor;\nvarying float vAlpha;\nvoid main(){\n float d=length(gl_PointCoord-.5)*2.0;\n if(d>1.0)discard;\n float alpha=(1.0-smoothstep(.45,1.0,d))*vAlpha;\n gl_FragColor=vec4(vColor,alpha);\n}";

export function createWeave({container,state,onFailure}){
 const fine=matchMedia('(hover:hover) and (pointer:fine)');
 let mobile=innerWidth<=760, frame=0, disposed=false, lost=false, last=0, clock=0, quality=1;
 let currentProgress=state.progress, category=state.category==='software'?1:0, strength=0,strengthVelocity=0;
 let samples=[], slowWindows=0, frames=0, lastDrawMs=0;
 const desired=new THREE.Vector2(50,50), pointer=new THREE.Vector2(50,50), trails=Array.from({length:4},()=>new THREE.Vector3(50,50,0));
 const pointerNdc=new THREE.Vector2(), ray=new THREE.Raycaster(), plane=new THREE.Plane(new THREE.Vector3(0,0,1),0), intersection=new THREE.Vector3();
 let pointerActive=false, touchTimer=0, energy=0, inputEnergy=0, previousInput=null;
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setClearColor(0x081214,0);
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');container.append(canvas);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,60),group=new THREE.Group();scene.add(group);
 const uniforms={uTime:{value:0},uUnfold:{value:0},uCategory:{value:0},uDpr:{value:1},uStrength:{value:0},uEnergy:{value:0},uTrail:{value:trails}};
 const material=new THREE.ShaderMaterial({vertexShader:VERTEX,fragmentShader:FRAGMENT,uniforms,transparent:true,depthWrite:false,blending:THREE.NormalBlending});
 const lineMaterial=new THREE.ShaderMaterial({vertexShader:VERTEX,fragmentShader:'varying vec3 vColor; varying float vAlpha; void main(){gl_FragColor=vec4(vColor,.21);}',uniforms,transparent:true,depthWrite:false});
 let points;
 function buildParticles(){
  if(points){group.remove(points);points.geometry.dispose();}
  const count=mobile?9600:36000,data=makeWeave(count),geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(data.hero,3));geo.setAttribute('aGame',new THREE.BufferAttribute(data.game,3));geo.setAttribute('aSoftware',new THREE.BufferAttribute(data.software,3));geo.setAttribute('aMeta',new THREE.BufferAttribute(data.meta,3));
  points=new THREE.Points(geo,material);points.frustumCulled=false;group.add(points);
 }
 buildParticles();
 for(let lane=0;lane<3;lane++)for(const side of [-1,1]){
  const data={hero:[],game:[],software:[],meta:[]};
  for(let i=0;i<=280;i++){const t=i/280,p=positions(t,side,lane);for(const key of ['hero','game','software'])data[key].push(...p[key]);data.meta.push(t,side,lane/2);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(data.hero,3));geo.setAttribute('aGame',new THREE.Float32BufferAttribute(data.game,3));geo.setAttribute('aSoftware',new THREE.Float32BufferAttribute(data.software,3));geo.setAttribute('aMeta',new THREE.Float32BufferAttribute(data.meta,3));
  const line=new THREE.Line(geo,lineMaterial);line.frustumCulled=false;group.add(line);
 }
 function resize(){
  const nextMobile=innerWidth<=760;
  if(nextMobile!==mobile){mobile=nextMobile;buildParticles();}
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  const dpr=Math.min(devicePixelRatio||1,mobile?1.35:1.8)*quality;
  renderer.setPixelRatio(dpr);renderer.setSize(innerWidth,innerHeight);uniforms.uDpr.value=dpr;
  wake();
 }
 function projectPointer(x,y){
  pointerNdc.set(x/innerWidth*2-1,-y/innerHeight*2+1);ray.setFromCamera(pointerNdc,camera);
  if(ray.ray.intersectPlane(plane,intersection))desired.set(intersection.x,intersection.y);
 }
 function interactiveTarget(target){return target instanceof Element&&!!target.closest('a,button,nav,.hero-copy,.work-panel,.category-tabs,dialog');}
 function move(event){
  if(state.reduced||state.modal||(!fine.matches&&event.pointerType!=='touch'))return;
  if(interactiveTarget(event.target)){pointerActive=false;return;}
  if(event.pointerType==='touch'&&event.type==='pointermove')return;
  const now=performance.now();
  if(previousInput){const elapsed=Math.max(8,now-previousInput.time);inputEnergy=clamp(Math.hypot(event.clientX-previousInput.x,event.clientY-previousInput.y)/elapsed,0,2);}
  previousInput={x:event.clientX,y:event.clientY,time:now};
  projectPointer(event.clientX,event.clientY);
  if(!pointerActive&&strength<.02){pointer.copy(desired);for(const t of trails)t.set(desired.x,desired.y,0);}
  pointerActive=true;
  if(event.pointerType==='touch'){clearTimeout(touchTimer);touchTimer=setTimeout(()=>{pointerActive=false;wake();},400);}
  wake();
 }
 function leave(){pointerActive=false;previousInput=null;inputEnergy=0;wake();}
 function render(now){
  frame=0;if(disposed||lost||document.hidden||state.modal)return;
  const elapsed=last?now-last:16.67,dt=Math.min(.05,elapsed/1000);last=now;
  const reduced=state.reduced;
  if(!reduced)clock+=dt;
  const targetCategory=state.category==='software'?1:0;
  currentProgress=reduced?state.progress:damp(currentProgress,state.progress,dt,6.5);
  category=reduced?targetCategory:damp(category,targetCategory,dt,4.8);
  if(reduced){strength=0;strengthVelocity=0;}else [strength,strengthVelocity]=springStep(strength,strengthVelocity,pointerActive?1:0,dt);
  pointer.x=damp(pointer.x,desired.x,dt,20);pointer.y=damp(pointer.y,desired.y,dt,20);
  trails[0].set(pointer.x,pointer.y,.68);
  for(let i=1;i<4;i++){trails[i].x=damp(trails[i].x,trails[i-1].x,dt,9);trails[i].y=damp(trails[i].y,trails[i-1].y,dt,9);trails[i].z=.22/(i+.3);}
  energy=damp(energy,inputEnergy,dt,7);inputEnergy=damp(inputEnergy,0,dt,3);
  const pose=scenePose(currentProgress,mobile);
  // A portrait camera must pull back to preserve the sculpture width.
  const fit=mobile?Math.max(1,.8/camera.aspect):Math.max(1,1.6/camera.aspect);
  camera.position.set(pose.cameraX,0,pose.cameraZ*fit);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  group.position.set(pose.x,pose.y,0);group.scale.setScalar(pose.scale);
  group.rotation.set(Math.sin(clock*.14)*.018,Math.sin(clock*.11)*.05,pose.rotation);
  if(!reduced){group.rotation.x+=pointerNdc.y*.015;group.rotation.y+=pointerNdc.x*.018;}
  uniforms.uTime.value=clock;uniforms.uUnfold.value=currentProgress;uniforms.uCategory.value=category;
  uniforms.uStrength.value=Math.max(0,strength);uniforms.uEnergy.value=energy;
  const start=performance.now();renderer.render(scene,camera);lastDrawMs=performance.now()-start;frames++;
  document.body.classList.add('webgl-ready');
  if(!reduced&&elapsed<250){samples.push(elapsed);if(samples.length>=150){const sorted=[...samples].sort((a,b)=>a-b);const p90=sorted[Math.floor(sorted.length*.9)];if(p90>25)slowWindows++;else slowWindows=0;if(slowWindows>=2&&quality>.7){quality=.72;renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.35:1.8)*quality);uniforms.uDpr.value=renderer.getPixelRatio();points.geometry.setDrawRange(0,Math.floor(points.geometry.getAttribute('position').count*.65));slowWindows=0;}samples=[];}}
  if(!reduced&&!state.offscreen)frame=requestAnimationFrame(render);
 }
 function wake(){if(disposed||lost||document.hidden||state.modal)return;if(!frame){last=performance.now();frame=requestAnimationFrame(render);}}
 function pause(){cancelAnimationFrame(frame);frame=0;last=0;}
 function visibility(){if(document.hidden)pause();else wake();}
 function contextLost(event){event.preventDefault();lost=true;pause();document.body.classList.remove('webgl-ready');onFailure('context-lost');}
 function contextRestored(){lost=false;resize();wake();}
 canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
 window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointerdown',move,{passive:true});document.documentElement.addEventListener('pointerleave',leave);
 window.addEventListener('blur',leave);window.addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',visibility);
 resize();
 return {wake,pause,metrics:()=>({frames,particleCount:points.geometry.drawRange.count===Infinity?points.geometry.getAttribute('position').count:points.geometry.drawRange.count,dpr:renderer.getPixelRatio(),lastDrawSubmissionMs:lastDrawMs,quality,frameTimesMs:[...samples],reduced:state.reduced}),dispose(){disposed=true;pause();clearTimeout(touchTimer);window.removeEventListener('pointermove',move);window.removeEventListener('pointerdown',move);document.documentElement.removeEventListener('pointerleave',leave);window.removeEventListener('blur',leave);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);group.children.forEach(o=>o.geometry.dispose());material.dispose();lineMaterial.dispose();renderer.dispose();canvas.remove();}};
}
