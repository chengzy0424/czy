import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';

// A small, local planar reflection. Only the machine chapter pays for the extra pass.
export function createWater(){
 const shader=Reflector.ReflectorShader;
 const rippleShader={
  uniforms:{...T.UniformsUtils.clone(shader.uniforms),uTime:{value:0},uOpacity:{value:1}},
  vertexShader:shader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 vSurface;').replace('vUv = textureMatrix','vSurface=uv; vUv = textureMatrix'),
  fragmentShader:`
   uniform sampler2D tDiffuse; uniform float uTime,uOpacity;
   varying vec4 vUv; varying vec2 vSurface;
   void main(){
    vec2 q=(vSurface-.5)*vec2(14.,20.);float r=length(q);
    float wave=sin(r*11.-uTime*1.5)+.45*sin(q.x*8.+q.y*3.+uTime*.6);
    vec2 distortion=normalize(q+vec2(.001))*wave*.004;
    vec3 reflection=texture2D(tDiffuse,vUv.xy/vUv.w+distortion).rgb;
    float rim=pow(.5+.5*cos(r*11.-uTime*1.5),22.);
    float fade=(1.-smoothstep(.32,.5,abs(vSurface.x-.5)))*(1.-smoothstep(.3,.5,abs(vSurface.y-.5)));
    vec3 ink=vec3(.012,.027,.031)+rim*vec3(.009,.018,.019);
    gl_FragColor=vec4(reflection*.78+ink,fade*uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 };
 const water=new Reflector(new T.PlaneGeometry(14,20),{textureWidth:512,textureHeight:512,multisample:0,clipBias:.004,shader:rippleShader});
 water.name='machine-water';water.rotation.x=-Math.PI/2;water.position.set(0,-26.5,0);
 water.material.transparent=true;water.material.depthWrite=false;water.material.side=T.DoubleSide;
 return water;
}
