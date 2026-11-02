import * as T from 'three';
import {SCENE_Y} from './space-path.js';

export function descentOpacity(progress){const t=T.MathUtils.clamp((progress-5.055)/.32,0,1);return t*t*(3-2*t);}
export function descentField(count){
 let state=687231;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const position=new Float32Array(count*3),color=new Float32Array(count*3),meta=new Float32Array(count*3),tint=new T.Color();
 for(let i=0;i<count;i++){
  const lane=i%4,t=random(),angle=random()*Math.PI*2,spread=(random()+random()+random()-1.5),j=i*3;
  let x,y,z;
  if(lane===0){x=-5.1+t*10.3;y=-2.6+Math.sin(t*7.1)*.58+spread*.42;z=.25+Math.sin(t*4.8)*1.6+spread*.6;}
  else if(lane===1){x=.9+Math.sin(t*6.4+.7)*2.8+Math.cos(angle)*spread*.85;y=-2.2-t*9.6+spread*.4;z=-.8+Math.cos(t*6.4+.7)*2.1+Math.sin(angle)*spread;}
  else if(lane===2){x=-4.6+t*10.8;y=-6.7+Math.sin(t*6.7)*1.25+spread*.65;z=-2.4+Math.sin(t*5.1)*1.7+spread*1.2;}
  else{x=-4.2+t*9.8;y=-10.1+Math.sin(t*7.3+1.5)*1.2+spread*.52;z=.7+Math.cos(t*5.2)*2.3+spread*.85;}
  // A small near-camera population turns into soft, transient foreground motes.
  const near=random()>.965;if(near)z+=2.4;
  position.set([x,y,z],j);
  tint.setHSL((.975+t*.115+(lane===2?.025:0))%1,.65+random()*.23,.12+Math.pow(random(),2)*.35);color.set([tint.r,tint.g,tint.b],j);
  meta.set([random(),near?1:0,random()],j);
 }
 return {position,color,meta};
}

export function createDescent({mobile=false}={}){
 const count=mobile?4200:14000,data=descentField(count),geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.BufferAttribute(data.position,3));geometry.setAttribute('aTint',new T.BufferAttribute(data.color,3));geometry.setAttribute('aMeta',new T.BufferAttribute(data.meta,3));geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.8;
 const uniforms={uTime:{value:0},uOpacity:{value:0},uPixelRatio:{value:1},uTravel:{value:0}};
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,blending:T.NormalBlending,vertexShader:`
  attribute vec3 aTint,aMeta;uniform float uTime,uOpacity,uPixelRatio,uTravel;
  varying vec3 vTint;varying float vOpacity,vBlur,vAngle;
  void main(){
   vec3 p=position;float phase=uTime*(.16+aMeta.x*.13)+aMeta.x*6.283185;
   p.x+=sin(phase+p.y*.7)*.17;p.y+=cos(phase+p.x*.8)*.12;p.z+=sin(phase*.8+p.x)*.18;
   p.x+=sin(p.y*.8)*uTravel*.15;
   vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
   vBlur=max(aMeta.y*.8,smoothstep(9.,21.,-mv.z)*.7);
   float size=1.4+pow(aMeta.z,3.)*5.2+aMeta.y*7.;
   gl_PointSize=clamp(size*uPixelRatio*12./max(4.,-mv.z),1.,17.*uPixelRatio);
   vTint=aTint;vAngle=aMeta.x*6.28;vOpacity=uOpacity*(.34+aMeta.x*.58)*(1.-smoothstep(24.,43.,-mv.z))*(1.-aMeta.y*.45);
  }`,fragmentShader:`
  varying vec3 vTint;varying float vOpacity,vBlur,vAngle;
  void main(){
   vec2 uv=gl_PointCoord-.5;uv=mat2(cos(vAngle),-sin(vAngle),sin(vAngle),cos(vAngle))*uv;
   float radius=mix(max(abs(uv.x)*.91,abs(uv.y)*1.12),length(uv),vBlur);
   if(radius>.5)discard;
   float edge=1.-smoothstep(mix(.27,.02,vBlur),.5,radius);
   float spec=pow(max(0.,1.-length(uv-vec2(-.1,.12))*2.2),7.);
   gl_FragColor=vec4(vTint*(.66+spec*.8)+vec3(.13,.1,.075)*spec,edge*vOpacity);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const points=new T.Points(geometry,material);points.name='lab-descent-cloud';points.position.y=SCENE_Y.lab;
 return {points,count,uniforms,update(time,progress,reduced=false,travel=0,pixelRatio=1,quality=1){
  uniforms.uTime.value=reduced?0:time;uniforms.uOpacity.value=descentOpacity(progress);uniforms.uTravel.value=reduced?0:travel;uniforms.uPixelRatio.value=pixelRatio;
  points.visible=progress>5.055&&uniforms.uOpacity.value>0;geometry.setDrawRange(0,Math.floor(count*(quality<1?.7:1)));
 },dispose(){geometry.dispose();material.dispose();points.removeFromParent();}};
}
