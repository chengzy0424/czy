import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {SCENE_Y} from './space-path.js';

// A small, local planar reflection. Only the machine chapter pays for the extra pass.
export function createWater({mobile=false}={}){
 const width=14,depth=36;
 const shader=Reflector.ReflectorShader;
 const rippleShader={
  uniforms:{...T.UniformsUtils.clone(shader.uniforms),uTime:{value:0},uOpacity:{value:1},uSurfaceSize:{value:new T.Vector2(width,depth)}},
  vertexShader:`
   uniform mat4 textureMatrix; uniform float uTime;
   varying vec4 vUv; varying vec2 vSurface;
   #include <common>
   #include <logdepthbuf_pars_vertex>
   void main(){
    vec3 p=position;vec2 q=p.xy;vSurface=uv;
    p.z=.065*sin(q.x*2.2+sin(q.y*1.7)*.7+uTime*.35)+.045*sin(q.y*3.3-q.x*.8-uTime*.24)+.022*sin(q.x*7.4+q.y*4.9+uTime*.6);
    vUv=textureMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    #include <logdepthbuf_vertex>
   }`,
  fragmentShader:`
   uniform sampler2D tDiffuse; uniform float uTime,uOpacity; uniform vec2 uSurfaceSize;
   varying vec4 vUv; varying vec2 vSurface;
   void main(){
    vec2 q=(vSurface-.5)*uSurfaceSize;
    float fold=sin(q.y*8.4+sin(q.x*2.6)*1.8+uTime*.65);
    vec2 distortion=vec2(sin(q.y*7.3+sin(q.x*2.1)+uTime*.55),cos(q.x*4.1+q.y*3.7-uTime*.32))*(.0029+.0022*fold);
    distortion.x+=sin(q.y*15.7+q.x*1.6-uTime*.42)*.0029;
    vec2 reflectionUV=vUv.xy/max(.001,vUv.w)+distortion;
    vec3 reflection=texture2D(tDiffuse,reflectionUV).rgb*.7;
    reflection+=texture2D(tDiffuse,reflectionUV+vec2(.0015,0.)).rgb*.15;
    reflection+=texture2D(tDiffuse,reflectionUV-vec2(.0015,0.)).rgb*.15;
    float crest=pow(.5+.5*sin(q.y*6.8+sin(q.x*1.9)*1.4+uTime*.5),24.);
    float fade=(1.-smoothstep(.32,.5,abs(vSurface.x-.5)))*(1.-smoothstep(.3,.5,abs(vSurface.y-.5)));
    vec3 ink=vec3(.009,.019,.025)+crest*vec3(.009,.018,.02);
    vec3 surface=reflection*(.7+.14*fold)+ink;
    if(!gl_FrontFacing)surface=ink*.8+vec3(.018,.004,.014)*(.5+.5*fold)+reflection*.09;
    gl_FragColor=vec4(surface,fade*uOpacity*(gl_FrontFacing?.96:.72));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 };
 const water=new Reflector(new T.PlaneGeometry(width,depth,mobile?28:48,mobile?36:56),{textureWidth:mobile?256:512,textureHeight:mobile?256:512,multisample:0,clipBias:.006,shader:rippleShader});
 // Cover the backed-off phone camera as it descends through the surface.
 water.name='machine-water';water.rotation.x=-Math.PI/2;water.position.set(0,SCENE_Y.machine-2.5,6);
 water.material.transparent=true;water.material.depthWrite=false;water.material.side=T.DoubleSide;
 return water;
}
