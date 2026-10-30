import * as T from 'three';
import {cameraPose} from './space-path.js';
import {buildWorld,particleField} from './space-objects.js';
import {damp,clamp,smooth,springStep} from './weave-math.js';

const vertex=`
 attribute vec3 aMeta; attribute vec3 aTint;
 uniform float uTime,uDpr,uForce,uChapter,uMobile; uniform vec3 uPointer;
 varying vec3 vTint; varying float vAlpha,vStreak,vAngle,vBead;
 void main(){
  vec3 p=position;float seed=aMeta.x,region=aMeta.y;
  float phase=uTime*(.14+seed*.16)+seed*6.2831;
  // Advected strands, not an unstructured star field.
  if(region<.5){
   float travel=fract((-position.y-.75)/4.9+uTime*(.018+seed*.012));
   float spread=fract(sin(seed*127.1+position.z*311.7)*43758.5453);
   float radius=.45+spread*1.65;float branch=step(.5,seed)*2.-1.;
   p.x=mix(2.,.4,uMobile)+branch*sin(travel*5.7)*radius;
   p.y=-.75-travel*4.9;p.z=cos(travel*5.7)*radius+.25;p.x+=sin(phase*1.7+travel*17.)*.16;
   float flare=max(sin(clamp(uChapter,0.,1.)*3.14159),smoothstep(4.,5.,uChapter));p.x+=sin(travel*3.14159)*flare*1.7*branch;
  }
  else if(region<1.5){float a=uTime*.075;float x=p.x;p.x=x*cos(a)-p.z*sin(a);p.z=x*sin(a)+p.z*cos(a);p.x+=sin(p.y*3.+phase)*.13;p.y+=sin(phase+p.y*.7)*.12;}
  else if(region<2.5){float a=uTime*.16+sin(p.y*2.+phase)*.12;float x=p.x;p.x=x*cos(a)-p.z*sin(a);p.z=x*sin(a)+p.z*cos(a);p.y+=sin(phase)*.055;}
  else {float x=p.x-mix(2.,.4,uMobile);float a=uTime*.06;p.x=mix(2.,.4,uMobile)+x*cos(a)-p.y*sin(a);p.y=x*sin(a)+p.y*cos(a);p.z+=sin(phase+p.y)*.24;}
  if((region<.5||region>2.5)&&uChapter>4.){p.x-=mix(2.,.4,uMobile);p.x*=1.3;p.y-=region<.5?41.9:43.8;}
  vec3 d=p-uPointer;float weight=exp(-dot(d.xy,d.xy)*1.25)*uForce;
  p.xy+=normalize(d.xy+vec2(.001))*weight*.65;p.z+=weight*.4;
  vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
  vStreak=step(.997,aMeta.z);vAngle=sin(p.y*.6+phase*.3)*.7+.5;
  vBead=step(.5,region)*step(region,1.5);float bokeh=step(.985,aMeta.z);float size=mix(1.8+pow(aMeta.z,5.)*6.,2.5+pow(aMeta.z,2.)*10.,vBead)+bokeh*(3.+seed*4.)+vStreak*8.;
  if(region>1.5&&region<2.5)size*=1.05;
  gl_PointSize=clamp(size*uDpr*(8./max(4.,-mv.z)),.8,18.*uDpr);
  vTint=aTint;vAlpha=(.25+seed*.48)*(1.-smoothstep(13.,34.,-mv.z))*mix(1.,.7,bokeh);
  if(region>2.5)vAlpha*=uChapter>4.?1.0:(.08+smoothstep(.2,.85,uChapter)*.7)*(1.-smoothstep(1.1,1.55,uChapter));
  if(region>1.5&&region<2.5)vAlpha*=1.45;
 }`;
const fragment=`varying vec3 vTint;varying float vAlpha,vStreak,vAngle,vBead;void main(){vec2 uv=gl_PointCoord-.5;uv=mat2(cos(vAngle),-sin(vAngle),sin(vAngle),cos(vAngle))*uv;uv.x*=mix(1.,5.,vStreak);float r=length(uv);if(r>.5)discard;vec3 normal=vec3(uv*2.,sqrt(max(0.,1.-dot(uv*2.,uv*2.))));float light=.22+max(0.,dot(normal,normalize(vec3(-.6,.7,1.))))*.95;float spec=pow(max(0.,dot(normal,normalize(vec3(-.4,.45,1.)))),24.);float a=(1.-smoothstep(mix(.12,.36,vBead),.5,r))*vAlpha;gl_FragColor=vec4(vTint*mix(1.+(1.-smoothstep(0.,.17,r))*.65,light,vBead)+spec*.17*vBead,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

export async function createSpace({container,state,onFailure=()=>{},onSelect=()=>{}}){
 const yieldControl=()=>globalThis.scheduler?.yield?globalThis.scheduler.yield():new Promise(resolve=>setTimeout(resolve,0));
 const mobile=matchMedia('(max-width:760px)').matches,coarse=matchMedia('(pointer:coarse)').matches;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.86;
 renderer.setClearColor(0x04090c);container.append(renderer.domElement);
 const scene=new T.Scene();scene.fog=new T.FogExp2(0x04090c,.014);
 const camera=new T.PerspectiveCamera(mobile?43:40,1,.1,100);
 const environment=new T.Scene();environment.background=new T.Color(0x030609);
 for(const [color,x,y,z,w,h] of [[0x8ddcd3,-4,1,2,2.6,7],[0xa94e9c,4,0,-2,2.2,5],[0xe3eee6,0,5,1,5,1.7],[0xc4d5d4,2,1,5,2.2,5],[0x4a4990,-2,-3,-4,3,2],[0x52636a,-2,0,7,4,5]]){
  const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color,side:T.DoubleSide}));panel.material.color.multiplyScalar(2.5);panel.position.set(x,y,z);panel.lookAt(0,0,0);environment.add(panel);
 }
 await yieldControl();
 const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(environment,.03,.1,100,{size:128});scene.environment=env.texture;scene.environmentIntensity=.8;environment.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
 await yieldControl();
 let raf=0,disposed=false,lost=false,time=0,last=0,progress=state.chapter||0,force=0,forceVelocity=0,desiredForce=0,quality=1,frames=0,drawMs=0,frameTimes=[],slowWindows=0;
 renderer.debug.onShaderError=(gl,program,vertexShader,fragmentShader)=>{
  console.error('Spatial scene shader compilation failed.',gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertexShader),gl.getShaderInfoLog(fragmentShader));
  lost=true;pause();document.body.classList.remove('webgl-ready');onFailure();
 };
 const world=await buildWorld({mobile,yieldControl,onTexture:()=>wake()});scene.add(world.world);
 const key=new T.PointLight(0xb2ebf0,62,26,2),rim=new T.PointLight(0xde329a,55,22,2),fill=new T.PointLight(0x6db5b5,18,22,2);scene.add(key,rim,fill);
 const redLight=new T.PointLight(0xe61458,29,7,2);redLight.position.set(.4,-23,1);scene.add(redLight);
 const count=mobile?11000:44000,points=particleField(count,mobile),geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.BufferAttribute(points.position,3));geo.setAttribute('aTint',new T.BufferAttribute(points.color,3));geo.setAttribute('aMeta',new T.BufferAttribute(points.meta,3));
 const uniforms={uTime:{value:0},uDpr:{value:1},uForce:{value:0},uChapter:{value:0},uMobile:{value:mobile?1:0},uPointer:{value:new T.Vector3(100,100,0)}};
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
  const pose=cameraPose(progress,mobile,camera.aspect),offset=reduced?0:.22;
  viewPointer.lerp(reduced?new T.Vector2():pointer,1-Math.exp(-dt*3));
  camera.position.fromArray(pose.eye);camera.position.x+=viewPointer.x*offset;camera.position.y+=viewPointer.y*offset*.6;
  camera.lookAt(...pose.look);camera.rotateZ(reduced?0:pose.roll);camera.updateMatrixWorld();
  key.position.set(camera.position.x-3,pose.look[1]+4,6);rim.position.set(3,pose.look[1]+.7,-1);fill.position.set(-4,pose.look[1]-3,2);
  const labLight=smooth(clamp((progress-4.5)*2))*(1-smooth(clamp((progress-5.1)*2)));key.intensity=62-labLight*20;rim.intensity=55-labLight*35;
  world.emblem.position.set(progress>4?0:mobile?.4:2,progress>4?-45.5:0,0);
  world.lens.rotation.y=-.3+(reduced?0:Math.sin(time*.21)*.13)+smooth(clamp(progress))*.45;
  world.lens.rotation.z=-.08+(reduced?0:Math.sin(time*.17)*.025);
  world.lens.scale.setScalar(progress>4?.74:1);world.lens.position.y=progress>4?-1:0;
  world.arcs.rotation.y=reduced?0:Math.sin(time*.14)*.08;
  const unfold=smooth(clamp(progress))*Math.PI*.32;
  world.arcs.rotation.z=-unfold*.32;world.arcs.scale.x=1+smooth(clamp(progress))*.65;
  if(progress>4){world.arcs.rotation.z=Math.PI-.08;world.arcs.scale.x=1;world.arcs.position.y=-1.45;}else world.arcs.position.y=0;
  world.flowUniforms.uTime.value=reduced?0:time;world.flowUniforms.uEnergy.value=Math.sin(Math.PI*(progress%1))**2;
  world.ribbonUniforms.uTime.value=reduced?0:time;world.ribbonUniforms.uOpacity.value=progress>4?.8:smooth(clamp((progress-.2)*2))*.7;
  world.ribbons.rotation.z=reduced?0:Math.sin(time*.08)*.14;
  world.ribbons.position.y=progress>4?1.5:0;world.ribbons.scale.setScalar(progress>4?1.35:1);
  for(const jelly of world.jellyfish){const pulse=reduced?0:Math.sin(time*1.25+jelly.phase);jelly.group.position.copy(jelly.base);jelly.group.position.y+=pulse*.07;jelly.group.rotation.y=reduced?0:Math.sin(time*.19+jelly.phase)*.2;jelly.bell.scale.set(1+pulse*.045,1-pulse*.035,1+pulse*.045);jelly.strands.rotation.z=reduced?0:Math.sin(time*.65+jelly.phase)*.065;}
  world.intro.visible=!mobile;
  world.intro.material.opacity=smooth(clamp((progress-.25)/.45))*(1-smooth(clamp((progress-1.15)/.45)));
  world.gallery.rotation.y=-smooth(clamp(progress-2))*.8+smooth(clamp(2-progress))*.25;
  if(progress>.75)world.loadCovers();
  world.tendrils.rotation.y=reduced?0:time*.025;
  world.rotor.rotation.y=(reduced?0:time*.1)+smooth(clamp(progress-3))*2.1;
  world.machine.rotation.y=.08+Math.sin(reduced?0:time*.1)*.06;
  world.lab.rotation.y=-.16+(reduced?0:Math.sin(time*.13)*.035)+(1-smooth(clamp(progress-4)))*1.15;
  // Far chapters remain in world coordinates; culling only removes unseen draw calls.
  for(const group of [world.emblem,world.gallery,world.machine,world.lab])group.visible=Math.abs(group.position.y-pose.look[1])<14;
  scene.updateMatrixWorld(true);pick();
  document.body.classList.toggle('over-spatial-card',!!hovered&&!coarse);
  for(const card of world.cards){
   card.hover=reduced?(hovered===card?1:0):damp(card.hover,hovered===card?1:0,dt,10);
   card.group.position.copy(card.home);card.group.position.z+=card.hover*.17;
   card.group.position.y+=(reduced?0:Math.sin(time*.24+card.home.x)*.045);
   const turn=smooth(clamp(progress-2));
   if(mobile&&card.spec.id==='boe'){card.group.position.x+=(1.7-card.home.x)*turn;card.group.position.z+=(1.3-card.home.z)*turn;}
   const exit=smooth(clamp((progress-3)/.75));
   if(card.spec.id==='tower')card.group.position.y+=turn*.75;
   card.group.position.y+=exit*(card.spec.id==='tower'?1.3:.4);
   card.group.rotation.x=-exit*.9+(card.spec.id==='tower'?.035:-.045);
   card.group.rotation.z=exit*(card.spec.id==='tower'?-.13:.08);
   card.group.rotation.y=card.spec.rotation+turn*(card.spec.id==='boe'?1.4:card.spec.id==='tower'?.52:.72)-card.hover*.025;
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
 // Compile shaders asynchronously where KHR_parallel_shader_compile is available.
 // Geometry generation yields between sections; first paint never waits on these assets.
 camera.position.set(0,0,10.5);camera.lookAt(0,0,0);
 await yieldControl();await renderer.compileAsync(scene,camera);
 window.addEventListener('pointermove',onMove,{passive:true});window.addEventListener('pointerdown',onDown,{passive:true});window.addEventListener('pointerup',onUp,{passive:true});
 document.addEventListener('pointerleave',onLeave);document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',onLeave);window.addEventListener('resize',resize);
 renderer.domElement.addEventListener('webglcontextlost',contextLost);renderer.domElement.addEventListener('webglcontextrestored',contextRestored);resize();
 return {wake,pause,metrics:()=>({frames,points:geo.drawRange.count===Infinity?count:geo.drawRange.count,dpr:renderer.getPixelRatio(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,lastDrawSubmissionMs:drawMs,frameTimesMs:[...frameTimes],quality,reduced:state.reduced,chapter:progress}),dispose(){disposed=true;pause();window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerdown',onDown);window.removeEventListener('pointerup',onUp);document.removeEventListener('pointerleave',onLeave);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',onLeave);window.removeEventListener('resize',resize);renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.domElement.removeEventListener('webglcontextrestored',contextRestored);world.dispose();geo.dispose();pointMaterial.dispose();env.dispose();renderer.dispose();renderer.domElement.remove();}};
}
