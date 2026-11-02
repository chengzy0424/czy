import * as T from 'three';
import {createDrapedGrid,updateDrapedGrid,createDrapeSampler,LAB_LIP_SEAM,LAB_WAVE_PERIOD} from './space-forms.js';
import {SCENE_Y} from './space-path.js';

function curvedRod(points,radius,material,segments=12,closed=false,tapered=false){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed);
 const geometry=new T.TubeGeometry(curve,segments,radius,6,closed);
 if(tapered){
  const position=geometry.attributes.position,center=new T.Vector3();
  for(let i=0;i<=segments;i++){
   const t=i/segments,taper=.28+.72*Math.pow(1-t,.7);curve.getPointAt(t,center);
   for(let j=0;j<7;j++){const k=i*7+j;position.setXYZ(k,center.x+(position.getX(k)-center.x)*taper,center.y+(position.getY(k)-center.y)*taper,center.z+(position.getZ(k)-center.z)*taper);}
  }
  geometry.computeVertexNormals();
 }
 return new T.Mesh(geometry,material);
}

function makeBacking(x0,x1,columns,rows,material){
 const geometry=new T.PlaneGeometry(x1-x0,5.04,columns,rows),position=geometry.attributes.position,normal=geometry.attributes.normal,coordinates=[];
 // Float32 plane coordinates can cross a parameter seam by a few nanometers.
 // Clamp each patch to its own domain to prevent triangles spanning the mouth.
 for(let i=0;i<position.count;i++)coordinates.push([Math.max(x0,Math.min(x1,position.getX(i)+(x0+x1)/2)),position.getY(i)]);
 const sampler=createDrapeSampler(coordinates),point=new T.Vector3(),tx=new T.Vector3(),ty=new T.Vector3(),n=new T.Vector3();
 position.setUsage(T.DynamicDrawUsage);normal.setUsage(T.DynamicDrawUsage);
 geometry.boundingBox=sampler.bounds(.05);geometry.boundingSphere=geometry.boundingBox.getBoundingSphere(new T.Sphere());
 const mesh=new T.Mesh(geometry,material);mesh.name=x0<LAB_LIP_SEAM?'lab-lip-backing':'lab-basin-backing';
 function update(time){
  sampler.setTime(time);
  for(let i=0;i<position.count;i++){
   sampler.sample(i,point,tx,ty);n.crossVectors(tx,ty).normalize();point.addScaledVector(n,-.04);
   position.setXYZ(i,point.x,point.y,point.z);normal.setXYZ(i,n.x,n.y,n.z);
  }
  position.needsUpdate=true;normal.needsUpdate=true;
 }
 update(0);return {mesh,update};
}

export function buildLab({mobile=false,materials={},opaque=[]}={}){
 const lab=new T.Group();lab.name='lab';lab.position.y=SCENE_Y.lab;lab.rotation.set(0,-.16,.055);
 const tileMaterial=new T.MeshPhysicalMaterial({color:0xc0c5c4,metalness:.88,roughness:.44,clearcoat:.35,clearcoatRoughness:.34,iridescence:.045,iridescenceThicknessRange:[260,340],envMapIntensity:.65,side:T.DoubleSide});
 const grid=createDrapedGrid(tileMaterial,mobile);lab.add(grid);opaque.push(grid);
 const backingMaterial=new T.MeshStandardMaterial({color:0x060909,metalness:.46,roughness:.52,side:T.DoubleSide});
 // Independent parametric patches prevent triangles from filling the open lip.
 const backings=[makeBacking(-4.03,LAB_LIP_SEAM-.001,mobile?6:8,mobile?18:24,backingMaterial),makeBacking(LAB_LIP_SEAM,4.03,mobile?24:30,mobile?16:18,backingMaterial)];
 backings.forEach(({mesh})=>{lab.add(mesh);opaque.push(mesh);});
 const sourceSilver=materials.silver||materials.chrome,silver=sourceSilver?sourceSilver.clone():new T.MeshStandardMaterial();
 silver.color.set(0xbac8c5);silver.metalness=.91;silver.roughness=.23;silver.envMapIntensity=1.15;
 if('iridescence' in silver)silver.iridescence=.08;
 // This bound includes both harmonics at every phase, the rim, and tile bevels.
 // The circular marker and left sculpture never need to chase the moving tiles.
 const markerPlane=grid.boundingBox.max.z+.28;
 const marker=new T.Group();marker.name='lab-marker';marker.position.set(0,-.05,markerPlane);lab.add(marker);
 marker.add(new T.Mesh(new T.TorusGeometry(.59,.025,8,64),silver));
 marker.add(curvedRod([[0,-.39,.02],[0,.39,.02]],.035,silver,8));
 marker.add(curvedRod([[-.39,0,.02],[.39,0,.02]],.035,silver,8));

 const arm=new T.Group();arm.name='lab-left-sculpture';arm.position.set(-3.14,0,markerPlane+.035);lab.add(arm);
 // Four swept, tapered arms continue the rolled mouth's asymmetry.
 arm.add(curvedRod([[0,0,.075],[-.08,.7,.07],[-.15,1.52,.015]],.06,silver,12,false,true));
 arm.add(curvedRod([[0,0,.075],[.1,-.75,.06],[.17,-1.52,.015]],.06,silver,12,false,true));
 arm.add(curvedRod([[0,0,.075],[-.3,.055,.06],[-.57,.19,.02]],.055,silver,12,false,true));
 arm.add(curvedRod([[0,0,.075],[.34,-.025,.06],[.62,-.13,.02]],.055,silver,12,false,true));
 lab.userData.wavePeriod=LAB_WAVE_PERIOD;lab.userData.markerClearance=.28;
 let lastTime=0;
 function updateLab(time,reduced=false){
  const next=reduced?0:Number.isFinite(time)?time:0;
  if(Math.abs(next-lastTime)<1e-7)return false;
  updateDrapedGrid(grid,next);for(const backing of backings)backing.update(next);
  lastTime=next;return true;
 }
 return {lab,updateLab};
}
