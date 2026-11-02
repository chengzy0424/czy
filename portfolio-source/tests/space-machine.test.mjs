import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildMachine,machineParticle} from '../src/space-machine.js';
import {createWater} from '../src/space-water.js';
import {SCENE_Y,cameraPose} from '../src/space-path.js';
import {seededRandom} from '../src/weave-math.js';

test('layered machine has solid depth, reflective granular volume and bounded batched geometry',()=>{
 for(const mobile of [false,true]){
  const materials=Object.fromEntries(['chrome','dark','rose','silver','glow'].map(key=>[key,new T.MeshPhysicalMaterial()])),opaque=[];
  const {machine,rotor,core}=buildMachine({mobile,materials,opaque});machine.updateMatrixWorld(true);
  assert.equal(machine.position.y,SCENE_Y.machine);assert.equal(rotor.parent,machine);
  const housing=new T.Box3().setFromObject(machine.getObjectByName('machine-upper-housing'));
  assert.ok(housing.max.y-housing.min.y>.4,'upper housing is a thin outline');
  assert.ok(housing.max.x-housing.min.x>4.4,'upper housing lacks its broad surface');
  const basin=machine.getObjectByName('machine-recessed-basin'),basinBox=new T.Box3().setFromObject(basin);
  assert.ok(basinBox.max.y-basinBox.min.y>.35,'lower basin has no depth');
  assert.ok([...basin.geometry.attributes.position.array].some((v,i,a)=>i%3===0&&Math.hypot(v,a[i+2])<.001),'lower basin must have a solid center');
  let triangles=0,draws=0;
  machine.traverse(object=>{
   if(!object.geometry)return;draws++;
   const position=object.geometry.attributes.position;assert.ok([...position.array].every(Number.isFinite));
   triangles+=(object.geometry.index?.count||position.count)/3*(object.isInstancedMesh?object.count:1);
  });
  assert.ok(triangles<(mobile?24000:44000),'machine exceeds the replacement budget');assert.ok(draws<=20,'cable and facet batching regressed');
  assert.ok(new T.Box3().setFromObject(machine).max.y-SCENE_Y.machine<2.5,'machine intrudes into the preceding gallery');
  assert.ok(core.isInstancedMesh&&core.count>300&&opaque.includes(core));
  let red=0,silver=0;const color=new T.Color();
  for(let i=0;i<core.count;i++){core.getColorAt(i,color);if(color.r>color.g*2)red++;if(Math.abs(color.r-color.g)<.1&&color.g>.2)silver++;}
  assert.ok(red>100&&silver>20,'core needs both red fragments and reflective silver facets');
  machine.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});Object.values(materials).forEach(m=>m.dispose());
 }
});

test('machine particle field keeps its irregular volume at the shared world anchor',()=>{
 function sample(){const random=seededRandom(971),points=[];for(let i=0;i<1200;i++)points.push(machineParticle(random(),random()*Math.PI*2,random(),random));return points;}
 const points=sample();assert.deepEqual(points,sample());
 assert.ok(points.every(p=>[p.x,p.y,p.z,...p.color].every(Number.isFinite)));
 const ys=points.map(p=>p.y-SCENE_Y.machine),xs=points.map(p=>p.x),zs=points.map(p=>p.z);
 assert.ok(Math.max(...ys)>1.1&&Math.min(...ys)<-.8,'core lost its uneven upper and lower lobes');
 assert.ok(Math.max(...xs)-Math.min(...xs)>1.9&&Math.max(...zs)-Math.min(...zs)>1.1,'granular core has collapsed into a flat or narrow shape');
 assert.ok(Math.max(...ys)<1.5&&Math.min(...ys)>-1.5,'core escapes the mechanical chamber');
});

test('desktop and backed-off phone cameras cross inside the water rather than beyond its front edge',()=>{
 for(const [width,height,mobile] of [[1660,940,false],[768,1024,false],[390,844,true],[320,720,true]]){
  const water=createWater({mobile});water.updateMatrixWorld(true);
  let before=4,after=5;
  assert.ok(cameraPose(before,mobile,width/height).eye[1]>water.position.y);
  assert.ok(cameraPose(after,mobile,width/height).eye[1]<water.position.y);
  for(let iteration=0;iteration<45;iteration++){
   const mid=(before+after)/2;
   if(cameraPose(mid,mobile,width/height).eye[1]>water.position.y)before=mid;else after=mid;
  }
  const crossing=(before+after)/2,eye=cameraPose(crossing,mobile,width/height).eye;
  const local=water.worldToLocal(new T.Vector3(...eye)),geometry=water.geometry.parameters;
  assert.ok(Math.abs(local.z)<1e-9,'camera never crosses the water height');
  assert.ok(geometry.width/2-Math.abs(local.x)>2,'camera crosses beside the water');
  assert.ok(geometry.height/2-Math.abs(local.y)>3,'camera passes beyond the water front edge');
  assert.deepEqual(water.material.uniforms.uSurfaceSize.value.toArray(),[geometry.width,geometry.height],'wave scale does not follow actual plane size');
  assert.equal(water.geometry.index.count/3,mobile?2016:5376,'extending the water must not increase tessellation');
  water.geometry.dispose();water.dispose();
 }
});
