import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SCENE_Y} from './space-path.js';
import {seededRandom} from './weave-math.js';

const CORE_COLORS=[0xd71146,0xa30c25,0xf02a87,0x9d125e,0xd7d5cb,0x869d9e,0x742831].map(hex=>new T.Color(hex).toArray());

// World-space sample shared by the fine point cloud and the reflective fragments.
export function machineParticle(t,a,s,random=Math.random){
 const upper=t>=.58,v=upper?(t-.58)/.42:t/.58,latitude=v*Math.PI,theta=a+v*2.8;
 const silhouette=1+.2*Math.sin(theta*3+v*8)+.1*Math.sin(theta*7-v*11);
 const radius=Math.sin(latitude)*(.4+.6*Math.pow(s,.36))*silhouette;
 const x=(upper?.35:-.38)+Math.cos(theta)*radius*(upper?.63:.82);
 const y=SCENE_Y.machine+(upper?.34:-.2)+Math.cos(latitude)*(upper?.93:.64)+.12*Math.sin(theta*2)*radius;
 const z=Math.sin(theta)*radius*(upper?.61:.7)+.08*Math.sin(v*9);
 const pick=random(),color=CORE_COLORS[pick<.24?0:pick<.42?1:pick<.59?2:pick<.72?3:pick<.86?4:pick<.95?5:6];
 return {x,y,z,color};
}

export function buildMachine({mobile=false,materials,opaque=[]}){
 const {chrome,dark,rose,silver,glow}=materials;
 const machine=new T.Group();machine.name='layered-machine';machine.position.y=SCENE_Y.machine;
 const rotor=new T.Group();rotor.name='machine-layered-plates';machine.add(rotor);
 const radial=mobile?40:64,steel=dark.clone();steel.color.set(0x172026);steel.roughness=.31;steel.envMapIntensity=1.3;
 const burgundy=rose.clone();burgundy.color.set(0x421320);burgundy.roughness=.25;
 function add(geometry,material,parent=machine,name){
  const object=new T.Mesh(geometry,material);if(name)object.name=name;parent.add(object);opaque.push(object);return object;
 }
 function lathe(profile,material,y=0,name){
  const object=add(new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),radial),material,rotor,name);object.position.y=y;return object;
 }
 function plate(outer,inner,depth,y,material,name){
  const bevel=Math.min(.055,depth*.24);
  return lathe([[inner,-depth/2],[outer-bevel,-depth/2],[outer,-depth/2+bevel],[outer,depth/2-bevel],[outer-bevel,depth/2],[inner+bevel,depth/2],[inner,depth/2-bevel],[inner,-depth/2]],material,y,name);
 }
 function rim(radius,y,material,thickness=.018){
  const object=add(new T.TorusGeometry(radius,thickness,5,radial),material,rotor);object.rotation.x=Math.PI/2;object.position.y=y;
 }
 // Wide opaque faces and deep bevels give the upper assembly real weight.
 plate(2.24,.35,.44,2.12,steel,'machine-upper-housing');
 plate(2.37,1.05,.16,1.76,burgundy,'machine-upper-shelf');
 plate(2.24,1.15,.15,1.36,steel,'machine-lower-shelf');
 rim(2.23,2.29,chrome,.023);rim(2.35,1.78,rose);rim(2.22,1.39,silver,.013);
 // A solid recessed basin replaces the empty lower hoops.
 lathe([[0,-.2],[1.04,-.2],[1.46,-.12],[1.67,.02],[1.79,.04],[2.04,-.12],[2.1,-.24],[2.04,-.35],[0,-.35],[0,-.2]],burgundy,-1.88,'machine-recessed-basin');
 plate(2.16,.28,.17,-2.26,steel,'machine-lower-plinth');
 rim(2.07,-2.08,chrome,.025);rim(2.14,-2.22,rose,.021);rim(1.7,-1.85,silver,.012);

 const dummy=new T.Object3D();
 function instances(geometry,material,count,name,place){
  const object=new T.InstancedMesh(geometry,material,count);object.name=name;
  for(let i=0;i<count;i++){dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);place(dummy,i);dummy.updateMatrix();object.setMatrixAt(i,dummy.matrix);}
  object.computeBoundingBox();object.computeBoundingSphere();machine.add(object);opaque.push(object);return object;
 }
 instances(new T.BoxGeometry(1,1,1),steel,8,'machine-housing-blocks',(o,i)=>{
  const a=i*Math.PI/4+.13;o.position.set(Math.cos(a)*1.77,1.9,Math.sin(a)*1.77);o.rotation.y=-a;o.scale.set(.43,.57,.64);
 });
 instances(new T.CylinderGeometry(.055,.068,3.28,8),burgundy,6,'machine-support-columns',(o,i)=>{
  const a=i*Math.PI/3+.19;o.position.set(Math.cos(a)*1.73,-.29,Math.sin(a)*1.73);
 });
 instances(new T.BoxGeometry(1,1,1),chrome,18,'machine-fasteners',(o,i)=>{
  const a=Math.floor(i/3)*Math.PI/3+.19;o.position.set(Math.cos(a)*1.75,[-1.7,.02,1.15][i%3],Math.sin(a)*1.75);o.rotation.y=-a;o.scale.set(.12,.07,.16);
 });

 // Merge cables by finish: many independent drapes cost three draw calls.
 const cableParts=[[],[],[]],cableSegments=mobile?22:32;
 function cable(points,radius,finish){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
  cableParts[finish].push(new T.TubeGeometry(curve,cableSegments,radius,mobile?4:5,false));
 }
 const cableCount=mobile?24:36;
 for(let i=0;i<cableCount;i++){
  const a=i*Math.PI*2/cableCount+.16*Math.sin(i*2.7),r=1.3+(i%4)*.17,bend=.15+.22*Math.sin(i*1.3),sway=.23*Math.cos(i*1.7);
  cable([[Math.cos(a)*r,1.48,Math.sin(a)*r],[Math.cos(a+bend)*(r+sway),.75,Math.sin(a+bend)*(r+sway)],[Math.cos(a-bend*.7)*(r+.13),-.65,Math.sin(a-bend*.7)*(r+.13)],[Math.cos(a+.08)*1.56,-1.89,Math.sin(a+.08)*1.56]],i%7===0?.032:i%3===0?.018:.009,i%6===0?2:i%3===0?0:1);
 }
 for(let i=0;i<(mobile?8:14);i++){
  const side=i%2?-1:1,reach=2.55+(i%4)*.28,y=1.35-(i%3)*.17,z=-.6+(i%5)*.32;
  cable([[side*1.52,y,z],[side*2.1,y-.65,z+.24],[side*reach,y-1.2+(i%3)*.14,z-.18],[side*(reach+.27),y-.33+(i%2)*.18,z-.42]],i%5===0?.022:.009,i%4===0?2:i%3===0?0:1);
 }
 cableParts.forEach((parts,index)=>{
  const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());add(geometry,[steel,rose,silver][index],machine,'machine-cables-'+index);
 });

 const random=seededRandom(481702),grainMaterial=new T.MeshPhysicalMaterial({color:0xffffff,metalness:.84,roughness:.2,clearcoat:1,clearcoatRoughness:.12,iridescence:.2,envMapIntensity:1.9,flatShading:true});
 const coreCount=mobile?360:720,core=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),grainMaterial,coreCount),tint=new T.Color();
 core.name='machine-granular-core';
 for(let i=0;i<coreCount;i++){
  const sample=machineParticle(random(),random()*Math.PI*2,random(),random),size=.017+Math.pow(random(),3)*.072;
  dummy.position.set(sample.x,sample.y-SCENE_Y.machine,sample.z);dummy.rotation.set(random()*6,random()*6,random()*6);dummy.scale.set(size*(.65+random()),size*(.7+random()*.8),size*(.65+random()));dummy.updateMatrix();core.setMatrixAt(i,dummy.matrix);tint.fromArray(sample.color);core.setColorAt(i,tint);
 }
 core.computeBoundingBox();core.computeBoundingSphere();machine.add(core);opaque.push(core);

 // The dark, corrugated underside stays visible when the camera crosses the water.
 const floorGeometry=new T.PlaneGeometry(14,18,48,40),positions=floorGeometry.attributes.position;
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i);positions.setZ(i,.075*Math.sin(x*2.2+Math.sin(y*1.7))+.047*Math.sin(y*3.4-x*.65)+.022*Math.sin(x*6.7+y*4.2));}floorGeometry.computeVertexNormals();
 const floor=add(floorGeometry,new T.MeshPhysicalMaterial({color:0x101b21,metalness:.9,roughness:.29,clearcoat:1,iridescence:.3,envMapIntensity:.75,side:T.DoubleSide}),machine,'machine-membrane');floor.position.y=-2.78;floor.rotation.x=-Math.PI/2;
 return {machine,rotor,core};
}
