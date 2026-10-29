import * as T from 'three';
import {cameraPose} from './space-path.js';
import {buildWorld,particleField} from './space-objects.js';
import {damp,clamp,smooth,springStep} from './weave-math.js';

const vertex=`
 attribute vec3 aMeta; attribute vec3 aTint;
 uniform float uTime,uDpr,uForce,uChapter; uniform vec3 uPointer;
 varying vec3 vTint; varying float vAlpha;
 void main(){
  vec3 p=position;float seed=aMeta.x,region=aMeta.y;
  float phase=uTime*(.14+seed*.16)+seed*6.2831;
  // Advected strands, not an unstructured star field.
  if(region<.5){p.y=-.7-mod(-p.y-.7+uTime*(.15+seed*.14),4.6);p.x+=sin(p.y*1.5+phase)*.17;p.z+=cos(phase+p.y)*.2;}
  else if(region<1.5){float a=uTime*.075;float x=p.x;p.x=x*cos(a)-p.z*sin(a);p.z=x*sin(a)+p.z*cos(a);p.x+=sin(p.y*3.+phase)*.13;p.y+=sin(phase+p.y*.7)*.12;}
  else if(region<2.5){p.x+=sin(phase*1.7+p.y)*.13;p.y+=sin(phase)*.08;p.z+=cos(phase+p.x)*.14;}
  else {p.y+=sin(p.x*.85+uTime*.45)*.23;p.z+=cos(p.x*.4+phase)*.2;}
  vec3 d=p-uPointer;float weight=exp(-dot(d.xy,d.xy)*1.25)*uForce;
  p.xy+=normalize(d.xy+vec2(.001))*weight*.65;p.z+=weight*.4;
  vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
  gl_PointSize=clamp((1.4+pow(aMeta.z,12.)*17.0)*uDpr*(8./max(4.,-mv.z)),.7,19.*uDpr);
  vTint=aTint;vAlpha=(.24+seed*.52)*(1.-smoothstep(10.,32.,-mv.z));
  if(region>2.5)vAlpha*=smoothstep(.35,.8,uChapter)*(1.-smoothstep(1.2,1.7,uChapter));
 }`;
const fragment=`varying vec3 vTint;varying float vAlpha;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;float a=(1.-smoothstep(.28,.5,r))*vAlpha;gl_FragColor=vec4(vTint*(1.+(1.-smoothstep(0.,.14,r))*.3),a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

export function createSpace({container,state,onFailure=()=>{},onSelect=()=>{}}){
 const mobile=matchMedia('(max-width:760px)').matches,coarse=matchMedia('(pointer:coarse)').matches;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.86;
 renderer.setClearColor(0x04090c);container.append(renderer.domElement);
 const scene=new T.Scene();scene.fog=new T.FogExp2(0x04090c,.014);
 const camera=new T.PerspectiveCamera(mobile?43:40,1,.1,100);
 const environment=new T.Scene();environment.background=new T.Color(0x030609);
 for(const [color,x,y,z,w,h] of [[0x8ef1f0,-4,1,2,.7,7],[0xc83c9f,4,0,-2,.55,5],[0xe3eee6,0,5,1,4,.7],[0xd0dcd6,2,1,5,.4,5],[0x4133b1,-2,-3,-4,3,1],[0x52636a,-2,0,7,4,5]]){
  const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color,side:T.DoubleSide}));panel.material.color.multiplyScalar(4);panel.position.set(x,y,z);panel.lookAt(0,0,0);environment.add(panel);
 }
 const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(environment,.03);scene.environment=env.texture;scene.environmentIntensity=.8;environment.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
 let raf=0,disposed=false,lost=false,time=0,last=0,progress=state.chapter||0,force=0,forceVelocity=0,desiredForce=0,quality=1,frames=0,drawMs=0,frameTimes=[],slowWindows=0;
 renderer.debug.onShaderError=(gl,program,vertexShader,fragmentShader)=>{
  console.error('Spatial scene shader compilation failed.',gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertexShader),gl.getShaderInfoLog(fragmentShader));
  lost=true;pause();document.body.classList.remove('webgl-ready');onFailure();
 };
 const world=buildWorld({mobile,onTexture:()=>wake()});scene.add(world.world);
 const key=new T.PointLight(0xb2ebf0,62,26,2),rim=new T.PointLight(0xde329a,55,22,2),fill=new T.PointLight(0x6db5b5,18,22,2);scene.add(key,rim,fill);
 const redLight=new T.PointLight(0xe61458,29,7,2);redLight.position.set(.4,-26,1);scene.add(redLight);
 const count=mobile?11000:44000,points=particleField(count,mobile),geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.BufferAttribute(points.position,3));geo.setAttribute('aTint',new T.BufferAttribute(points.color,3));geo.setAttribute('aMeta',new T.BufferAttribute(points.meta,3));
 const uniforms={uTime:{value:0},uDpr:{value:1},uForce:{value:0},uChapter:{value:0},uPointer:{value:new T.Vector3(100,100,0)}};
 const pointMaterial=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,depthTest:true,blending:T.NormalBlending});
 const cloud=new T.Points(geo,pointMaterial);cloud.frustumCulled=false;scene.add(cloud);
 const pointer=new T.Vector2(),viewPointer=new T.Vector2(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,0,1),0),worldPointer=new T.Vector3();
 let pointerKnown=false,hovered=null,down=null,touchUntil=0;
 function interactive(target){return target?.closest?.('a,button,nav,dialog,.hero-copy,.work-panel,.category-tabs,.stage-copy');}
 function onMove(event){
  if(event.pointerType==='touch')return;
  pointer.set(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);pointerKnown=true;
  desiredForce=interactive(event.target)?0:1;wake();
 }
 function onLeave(){desiredForce=0;pointerKnown=false;pointer.set(0,0);hovered=null;document.body.classList.remove('over-spatial-card');wake();}
 function onDown(event){if(interactive(event.target))return;down={x:event.clientX,y:event.clientY};if(event.pointerType==='touch'){pointer.set(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);pointerKnown=true;desiredForce=1;touchUntil=performance.now()+450;wake();}}
 function onUp(event){if(!down||Math.hypot(down.x-event.clientX,down.y-event.clientY)>7){down=null;return;}down=null;if(interactive(event.target))return;pick();if(hovered)onSelect(hovered.spec.id);}
 function pick(){
  hovered=null;
  if(!pointerKnown||progress<1.55||progress>3.5||state.modal||state.offscreen)return;
  ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects([...world.pickables,...world.opaque],false)[0];
  if(hit?.object.userData.detail)hovered=world.cards.find(c=>c.spec.id===hit.object.userData.detail);
 }
 function resize(){const dpr=Math.min(devicePixelRatio||1,mobile?1.35:1.65)*quality;renderer.setPixelRatio(dpr);renderer.setSize(innerWidth,innerHeight);uniforms.uDpr.value=dpr;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();wake();}
 function updateScene(dt){
  const reduced=state.reduced;
  progress=reduced?state.chapter||0:damp(progress,state.chapter||0,dt,8);
  const pose=cameraPose(progress,mobile),offset=reduced?0:.22;
  viewPointer.lerp(reduced?new T.Vector2():pointer,1-Math.exp(-dt*3));
  camera.position.fromArray(pose.eye);camera.position.x+=viewPointer.x*offset;camera.position.y+=viewPointer.y*offset*.6;
  camera.lookAt(...pose.look);camera.updateMatrixWorld();
  key.position.set(camera.position.x-3,pose.look[1]+4,6);rim.position.set(3,pose.look[1]+.7,-1);fill.position.set(-4,pose.look[1]-3,2);
  world.emblem.position.x=mobile?.4:2;
  world.lens.rotation.y=-.3+(reduced?0:Math.sin(time*.21)*.13)+smooth(clamp(progress))*.45;
  world.lens.rotation.z=-.08+(reduced?0:Math.sin(time*.17)*.025);
  world.arcs.rotation.y=reduced?0:Math.sin(time*.14)*.08;
  world.intro.material.opacity=smooth(clamp((progress-.25)/.45))*(1-smooth(clamp((progress-1.15)/.45)));
  world.gallery.rotation.y=(progress-2)*.43;
  world.tendrils.rotation.y=reduced?0:time*.025;
  world.rotor.rotation.y=reduced?0:time*.045;
  world.machine.rotation.y=.08+Math.sin(reduced?0:time*.1)*.06;
  world.lab.rotation.y=-.16+(reduced?0:Math.sin(time*.13)*.035);
  // Far chapters remain in world coordinates; culling only removes unseen draw calls.
  for(const group of [world.emblem,world.gallery,world.machine,world.lab])group.visible=Math.abs(group.position.y-pose.look[1])<14;
  scene.updateMatrixWorld(true);pick();
  document.body.classList.toggle('over-spatial-card',!!hovered&&!coarse);
  for(const card of world.cards){
   card.hover=reduced?(hovered===card?1:0):damp(card.hover,hovered===card?1:0,dt,10);
   card.group.position.copy(card.home);card.group.position.z+=card.hover*.17;
   card.group.rotation.y=card.spec.rotation-card.hover*.025;
   card.edge.material.emissive.set(0xa6e4d4);card.edge.material.emissiveIntensity=card.hover*.35;
  }
  if(coarse&&performance.now()>touchUntil){desiredForce=0;pointerKnown=false;}
  if(reduced){force=0;forceVelocity=0;}else [force,forceVelocity]=springStep(force,forceVelocity,desiredForce,dt);
  ray.setFromCamera(pointer,camera);if(ray.ray.intersectPlane(plane,worldPointer))uniforms.uPointer.value.lerp(worldPointer,1-Math.exp(-dt*8));
  uniforms.uTime.value=reduced?0:time;uniforms.uForce.value=force;uniforms.uChapter.value=progress;
 }
 function draw(now){
  raf=0;if(disposed||lost||state.modal||state.offscreen||document.hidden)return;
  const dt=last?Math.min(.05,(now-last)/1000):1/60;if(last&&!state.reduced){frameTimes.push(now-last);if(frameTimes.length>180)frameTimes.shift();}last=now;
  if(!state.reduced)time+=dt;
  updateScene(dt);const start=performance.now();renderer.render(scene,camera);if(lost)return;drawMs=performance.now()-start;frames++;
  document.body.classList.add('webgl-ready');
  if(frames%180===0&&frameTimes.length>150){const sorted=[...frameTimes].sort((a,b)=>a-b);slowWindows=sorted[Math.floor(sorted.length*.9)]>29?slowWindows+1:0;if(slowWindows>=2&&quality===1){quality=.75;geo.setDrawRange(0,Math.floor(count*.72));resize();}}
  if(!state.reduced&&!raf)raf=requestAnimationFrame(draw);
 }
 function wake(){if(!raf&&!disposed&&!lost&&!state.modal&&!state.offscreen&&!document.hidden){last=0;raf=requestAnimationFrame(draw);}}
 function pause(){cancelAnimationFrame(raf);raf=0;last=0;}
 function visibility(){document.hidden?pause():wake();}
 function contextLost(e){e.preventDefault();lost=true;pause();document.body.classList.remove('webgl-ready');onFailure();}
 function contextRestored(){lost=false;document.body.classList.remove('webgl-failed');resize();}
 window.addEventListener('pointermove',onMove,{passive:true});window.addEventListener('pointerdown',onDown,{passive:true});window.addEventListener('pointerup',onUp,{passive:true});
 document.addEventListener('pointerleave',onLeave);document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',onLeave);window.addEventListener('resize',resize);
 renderer.domElement.addEventListener('webglcontextlost',contextLost);renderer.domElement.addEventListener('webglcontextrestored',contextRestored);resize();
 return {wake,pause,metrics:()=>({frames,points:geo.drawRange.count===Infinity?count:geo.drawRange.count,dpr:renderer.getPixelRatio(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,lastDrawSubmissionMs:drawMs,frameTimesMs:[...frameTimes],quality,reduced:state.reduced,chapter:progress}),dispose(){disposed=true;pause();window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerdown',onDown);window.removeEventListener('pointerup',onUp);document.removeEventListener('pointerleave',onLeave);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',onLeave);window.removeEventListener('resize',resize);renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.domElement.removeEventListener('webglcontextrestored',contextRestored);world.dispose();geo.dispose();pointMaterial.dispose();env.dispose();renderer.dispose();renderer.domElement.remove();}};
}
