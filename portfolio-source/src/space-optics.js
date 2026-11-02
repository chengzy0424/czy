import * as T from 'three';

export function opticsStrength(progress){
 const t=T.MathUtils.clamp((progress-4.55)/.43,0,1);return t*t*(3-2*t);
}
export function opticsSize(width,height,pixelRatio=1,mobile=false,quality=1){
 const scale=Math.min(pixelRatio,(mobile?680:1280)*quality/width);
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale)),pixelRatio:scale};
}
export function scenePixelRatio(width,height,deviceRatio=1,mobile=false,quality=1){
 return Math.min(deviceRatio,mobile?1.35:1.65,Math.sqrt((mobile?1_000_000:3_000_000)/Math.max(1,width*height)))*quality;
}

// One bounded scene target and one nine-tap composite. Depth keeps foreground
// metal in focus while distant tiles, reflected highlights and dust soften.
// HTML copy and the video player are outside this pass.
export function createOptics({mobile=false}={}){
 const depth=new T.DepthTexture(1,1,T.UnsignedIntType);
 const target=new T.WebGLRenderTarget(1,1,{depthBuffer:true,depthTexture:depth,samples:2,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
 const uniforms={uScene:{value:target.texture},uDepth:{value:depth},uTexel:{value:new T.Vector2(1,1)},uBackground:{value:new T.Color()},uNear:{value:.1},uFar:{value:100},uFocus:{value:8.8},uStrength:{value:1}};
 const material=new T.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
  varying vec2 vUv;
  uniform sampler2D uScene,uDepth;
  uniform vec2 uTexel;
  uniform vec3 uBackground;
  uniform float uNear,uFar,uFocus,uStrength;
  #include <packing>
  float distanceAt(vec2 uv){return -perspectiveDepthToViewZ(texture2D(uDepth,uv).x,uNear,uFar);}
  void main(){
   float depth=distanceAt(vUv),defocus=smoothstep(.35,3.2,abs(depth-uFocus));
   float radius=mix(.58,2.2,defocus)*uStrength;
   vec3 sharp=texture2D(uScene,vUv).rgb,color=sharp*2.0,halo=vec3(0.);float weights=2.;
   for(int i=0;i<8;i++){
    float angle=float(i)*.78539816;vec2 offset=vec2(cos(angle),sin(angle));
    vec2 uv=clamp(vUv+offset*uTexel*radius,vec2(0.),vec2(1.));
    float sampleDepth=distanceAt(uv);
    float weight=exp(-abs(sampleDepth-depth)*.65);
    color+=texture2D(uScene,uv).rgb*weight;weights+=weight;
    vec3 glow=texture2D(uScene,clamp(vUv+offset*uTexel*3.2,vec2(0.),vec2(1.))).rgb;
    halo+=max(glow-vec3(.42),vec3(0.));
   }
   color=mix(sharp,color/weights,uStrength)+halo*(.012*uStrength);
   // The reference has low-contrast air between surfaces, not a white bloom.
   float veil=smoothstep(uFocus+1.,uFocus+12.,depth)*.08*uStrength;
   color=mix(color,vec3(.012,.024,.025),veil);
   gl_FragColor=vec4(color,1.);
   #include <tonemapping_fragment>
   // A clear color has no material exposure. Do not tone-map that empty air
   // again, or the teal background collapses into black in the offscreen pass.
   if(texture2D(uDepth,vUv).x>.99999){float emptyAir=1.-smoothstep(.002,.075,length(sharp-uBackground));gl_FragColor.rgb=mix(gl_FragColor.rgb,sharp,emptyAir);}
   #include <colorspace_fragment>
  }`});
 const quad=new T.Mesh(new T.PlaneGeometry(2,2),material),scene=new T.Scene(),camera=new T.Camera();scene.add(quad);quad.frustumCulled=false;
 let size={width:1,height:1,pixelRatio:1};
 return {
  resize(width,height,pixelRatio,quality){size=opticsSize(width,height,pixelRatio,mobile,quality);target.setSize(size.width,size.height);uniforms.uTexel.value.set(1/size.width,1/size.height);},
  get pixelRatio(){return size.pixelRatio;},
  get size(){return size;},
  async compile(renderer,world,view){renderer.setRenderTarget(target);await renderer.compileAsync(world,view);renderer.setRenderTarget(null);await renderer.compileAsync(scene,camera);},
  render(renderer,world,view,progress,focus){
   renderer.getClearColor(uniforms.uBackground.value);
   uniforms.uStrength.value=opticsStrength(progress);uniforms.uNear.value=view.near;uniforms.uFar.value=view.far;uniforms.uFocus.value=focus;
   renderer.setRenderTarget(target);renderer.render(world,view);renderer.setRenderTarget(null);renderer.render(scene,camera);
  },
  dispose(){target.dispose();depth.dispose();quad.geometry.dispose();material.dispose();}
 };
}
