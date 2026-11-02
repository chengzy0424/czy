import * as T from 'three';

// Closing-scene atmosphere, in coordinates relative to SCENE_Y.confluence.
// Every surface sits behind the separate ZY emblem. No full-screen pass,
// texture download or extra particle field is needed for these broad currents.
const noise = `
 float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
 float noise21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),f.x),f.y);}
 float mist(vec2 p){return noise21(p)*.57+noise21(p*2.03+4.7)*.29+noise21(p*4.11-8.2)*.14;}
`;

const bandVertex = `
 uniform float uTime,uSeed;
 varying vec2 vUv;
 void main(){
  vUv=uv;vec3 p=position;
  float center=sin(uv.x*3.14159265);
  p.y+=sin(uv.x*10.3-uTime*.21+uSeed)*.075*center;
  p.z+=sin(uv.x*6.2-uTime*.12+uSeed)*.12*center;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
 }`;

const bandFragment = `
 uniform float uTime,uSeed,uOpacity;
 varying vec2 vUv;
 ${noise}
 void main(){
  float x=vUv.x;
  float flow=mist(vec2(x*12.-uTime*.045,vUv.y*2.7+uSeed));
  float drift=(noise21(vec2(x*11.-uTime*.035,uSeed))-.5)*.32;
  float across=(vUv.y-.5)*2.+drift;
  float milk=exp(-across*across*5.5);
  float blush=exp(-across*across*2.5);
  float edge=1.-smoothstep(.78,1.,abs((vUv.y-.5)*2.));
  float ends=smoothstep(0.,.13,x)*(1.-smoothstep(.72,1.,x));
  // Soft internal clouding breaks the highlight without outlining the strip.
  float density=.42+.58*smoothstep(.16,.85,flow);
  float eddies=.55+.45*noise21(vec2(x*31.-uTime*.055,vUv.y*4.1+uSeed));
  vec3 rose=vec3(.48,.016,.075);
  vec3 cream=mix(vec3(.92,.55,.49),vec3(1.32,1.12,.84),smoothstep(.12,.8,x));
  vec3 color=mix(rose,cream,milk*.87)*(.7+flow*.32);
  float alpha=(milk*.69*eddies+blush*.19)*density*edge*ends*uOpacity;
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;

const veilVertex = `
 uniform float uTime,uSeed;
 varying vec2 vUv;
 void main(){
  vUv=uv;vec3 p=position;
  p.z+=sin(uv.x*5.6+uSeed-uTime*.085)*sin(uv.y*3.14159265)*.36;
  p.y+=sin(uv.x*7.1+uSeed+uTime*.07)*.10;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
 }`;

const veilFragment = `
 uniform float uTime,uSeed,uOpacity,uDensity;
 uniform vec3 uColor;
 varying vec2 vUv;
 ${noise}
 void main(){
  vec2 p=(vUv-.5)*2.;
  vec2 q=vec2(vUv.x*5.8-uTime*.025,vUv.y*3.3+uSeed);
  float billow=mist(q+vec2(noise21(q*.8),noise21(q*.7+2.))*.85);
  float fold=mist(q*1.8+vec2(uTime*.015,8.));
  float edge=(1.-smoothstep(.5,1.,abs(p.x)))*(1.-smoothstep(.4,1.,abs(p.y)));
  float vapor=smoothstep(.25,.72,billow)*(.62+.38*fold);
  // Missing density creates real dark gaps, instead of a flat red overlay.
  float hollows=smoothstep(.18,.58,noise21(vec2(vUv.x*3.5+uSeed,vUv.y*2.8)));
  float alpha=edge*vapor*hollows*uDensity*uOpacity;
  vec3 color=uColor*(.72+fold*.48);
  gl_FragColor=vec4(color,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;

function ribbonGeometry(index,mobile){
 const segments=mobile?48:80,rows=mobile?2:4;
 const geometry=new T.PlaneGeometry(1,1,segments,rows);
 const position=geometry.attributes.position,uv=geometry.attributes.uv;
 const offsets=[-1.48,-.69,.14,.98,1.82];
 const breadth=[1.52,1.35,1.65,1.42,1.28][index];
 for(let i=0;i<position.count;i++){
  const t=uv.getX(i),side=(uv.getY(i)-.5)*breadth;
  const x=-5.2+t*14.2;
  const bend=-.6*Math.exp(-(((t-.28)*3.4)**2));
  const envelope=Math.exp(-(((t-.4)*3.2)**2));
  const ripples=(Math.sin(t*27.3+index*.22)*.22+Math.sin(t*53.1+index*.47)*.075)*envelope;
  const slope=.105*x;
  const y=offsets[index]+slope+bend+ripples+side*(.72+Math.sin(t*Math.PI)*.28);
  const z=-2.7-index*.36+Math.sin(t*Math.PI*1.3+index*.12)*1.0+side*.42;
  position.setXYZ(i,x,y,z);
 }
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 geometry.boundingSphere.radius+=.25;
 return geometry;
}

export function createPlumes({mobile=false}={}){
 const group=new T.Group();group.name='closing-plumes';
 const time={value:0},opacity={value:0};
 const materials=[],geometries=[];
 const add=(geometry,material,name)=>{
  const mesh=new T.Mesh(geometry,material);mesh.name=name;
  group.add(mesh);materials.push(material);geometries.push(geometry);return mesh;
 };
 // A few separated depth layers carry the red volume. The dark ring silhouette
 // and the left side of the frame remain open; these are not camera-facing fog.
 const veils=[
  {position:[2.8,2.45,-5.8],size:[11,3.8],turn:.13,color:[.60,.009,.057],density:.69},
  {position:[-.9,-1.25,-3.75],size:[6.6,3.1],turn:.37,color:[.53,.012,.086],density:.77},
  {position:[4.2,.55,-5.05],size:[7.8,3.15],turn:-.08,color:[.68,.012,.063],density:.59},
  {position:[1.2,3.1,-4.2],size:[5.7,3.3],turn:.42,color:[.37,.007,.055],density:.45},
  {position:[4.9,-1.35,-3.7],size:[5.9,2.4],turn:-.22,color:[.38,.009,.055],density:.43}
 ];
 for(const [i,spec] of veils.entries()){
  if(mobile&&i===3)continue;
  const geometry=new T.PlaneGeometry(spec.size[0],spec.size[1],mobile?12:20,4);
  const material=new T.ShaderMaterial({
   uniforms:{uTime:time,uOpacity:opacity,uSeed:{value:i*1.71+.63},uDensity:{value:spec.density},uColor:{value:new T.Vector3(...spec.color)}},
   vertexShader:veilVertex,fragmentShader:veilFragment,transparent:true,
   depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.NormalBlending
  });
  const mesh=add(geometry,material,`closing-red-veil-${i}`);
  mesh.position.fromArray(spec.position);mesh.rotation.set(.03*(i-2),.09*(i-2),spec.turn);
  geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.4;
 }
 for(let i=0;i<5;i++){
  const material=new T.ShaderMaterial({
   uniforms:{uTime:time,uOpacity:opacity,uSeed:{value:i*.39}},
   vertexShader:bandVertex,fragmentShader:bandFragment,transparent:true,
   depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.NormalBlending
  });
  add(ribbonGeometry(i,mobile),material,`closing-cream-current-${i}`);
 }
 const bounds=new T.Box3().setFromObject(group).expandByScalar(.5);
 group.userData.localBounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
 let disposed=false;
 function update(elapsed=0,progress=6,reduced=false){
  if(disposed)return;
  const p=Number.isFinite(progress)?progress:0;
  const fade=T.MathUtils.clamp((p-5.03)/.48,0,1);
  opacity.value=fade*fade*(3-2*fade);
  time.value=reduced?0:(Number.isFinite(elapsed)?elapsed:0);
  group.visible=opacity.value>.001;
 }
 update(0,0);
 return {group,update,dispose(){
  if(disposed)return;disposed=true;group.removeFromParent();
  geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());group.clear();
 }};
}
