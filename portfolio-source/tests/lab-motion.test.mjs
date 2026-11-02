import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildLab} from '../src/space-lab.js';
import {LAB_WAVE_PERIOD,LAB_LIP_SEAM,drapePoint} from '../src/space-forms.js';
import {cameraPose} from '../src/space-path.js';

function dispose(lab){const materials=new Set();lab.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});materials.forEach(m=>m.dispose());}
function closeArrays(actual,expected,tolerance=1e-5){assert.equal(actual.length,expected.length);for(let i=0;i<actual.length;i++)assert.ok(Math.abs(actual[i]-expected[i])<tolerance,`value ${i} differs: ${actual[i]} / ${expected[i]}`);}
function correlation(a,b){const mean=v=>v.reduce((sum,n)=>sum+n,0)/v.length,ma=mean(a),mb=mean(b);let aa=0,bb=0,ab=0;for(let i=0;i<a.length;i++){const da=a[i]-ma,db=b[i]-mb;aa+=da*da;bb+=db*db;ab+=da*db;}return ab/Math.sqrt(aa*bb);}

test('LAB tiles carry a coherent traveling wave with a stable eight-second period',()=>{
 const nearby=[[],[],[]];
 for(let i=0;i<64;i++)for(let j=0;j<3;j++)nearby[j].push(drapePoint([1,1.1,1.8][j],0,new T.Vector3(),i*LAB_WAVE_PERIOD/64).z);
 assert.ok(correlation(nearby[0],nearby[1])>.9,'adjacent tiles do not move together');
 assert.ok(correlation(nearby[0],nearby[2])<-.5,'radial phase does not travel across the basin');
 for(const mobile of [false,true]){
  const {lab,updateLab}=buildLab({mobile}),grid=lab.getObjectByName('lab-honeycomb'),backings=lab.children.filter(o=>o.name.endsWith('-backing'));
  const rest=grid.instanceMatrix.array.slice(),backRest=backings.map(o=>o.geometry.attributes.position.array.slice()),matrix=new T.Matrix4();
  const tx=new T.Vector3(),ty=new T.Vector3(),n=new T.Vector3(),point=new T.Vector3();let shifted=0,tilted=0;
  updateLab(LAB_WAVE_PERIOD/4);
  for(let i=0;i<grid.count;i++){
   grid.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));
   tx.setFromMatrixColumn(matrix,0);ty.setFromMatrixColumn(matrix,1);n.setFromMatrixColumn(matrix,2);point.setFromMatrixPosition(matrix);
   assert.ok(Math.abs(tx.dot(ty))<1e-5&&Math.abs(tx.dot(n))<1e-5&&Math.abs(ty.dot(n))<1e-5,'tile loses its surface basis');
   assert.ok(Math.abs(n.length()-.65)<1e-5,'tile thickness scale is inconsistent');
   assert.ok(grid.boundingBox.containsPoint(point),'animated tile escapes its conservative bounds');
   if(Math.abs(matrix.elements[14]-rest[i*16+14])>.025)shifted++;
   if(Math.abs(matrix.elements[8]-rest[i*16+8])+Math.abs(matrix.elements[9]-rest[i*16+9])>.04)tilted++;
  }
  assert.ok(shifted>grid.count*.6,'wave does not displace enough real tiles');assert.ok(tilted>grid.count*.5,'tiles only translate instead of tilting');
  backings.forEach((o,i)=>assert.ok(o.geometry.attributes.position.array.some((value,k)=>Math.abs(value-backRest[i][k])>.025),'backing stays flat while tiles move'));
  updateLab(LAB_WAVE_PERIOD);closeArrays(grid.instanceMatrix.array,rest);backings.forEach((o,i)=>closeArrays(o.geometry.attributes.position.array,backRest[i]));
  updateLab(1.5);updateLab(4,true);closeArrays(grid.instanceMatrix.array,rest);assert.equal(updateLab(5,true),false,'reduced motion keeps uploading geometry');
  dispose(lab);
 }
});

test('LAB circle and left sculptural arms remain clear through the whole wave and viewing passage',()=>{
 for(const mobile of [false,true]){
  const {lab,updateLab}=buildLab({mobile}),marker=lab.getObjectByName('lab-marker'),left=lab.getObjectByName('lab-left-sculpture');
  const targets=Array.from({length:16},(_,i)=>new T.Vector3(.59*Math.cos(i*Math.PI/8),.59*Math.sin(i*Math.PI/8),0));
  targets.push(...[[-.35,0,.02],[.35,0,.02],[0,-.35,.02],[0,.35,.02]].map(p=>new T.Vector3(...p)));
  const leftTargets=[];
  for(const rod of left.children)for(const ring of [0,3,6,9,11]){
   const center=new T.Vector3(),vertex=new T.Vector3();
   for(let radial=0;radial<6;radial++)center.add(vertex.fromBufferAttribute(rod.geometry.attributes.position,ring*7+radial));
   leftTargets.push(center.multiplyScalar(1/6));
  }
  const ray=new T.Raycaster(),direction=new T.Vector3();
  for(const time of [0,1,2,3,4,5,6,7])for(const chapter of [4.9,5,5.1])for(const turn of [-.035,.035]){
   updateLab(time);lab.rotation.y=-.16+turn;lab.updateMatrixWorld(true);
   const eye=new T.Vector3(...cameraPose(chapter,mobile,mobile?390/844:16/9).eye);
   for(const [sculpture,points] of [[marker,targets],[left,leftTargets]])for(const target of points){
    direction.copy(target);sculpture.localToWorld(direction);direction.sub(eye).normalize();ray.set(eye,direction);
    const hit=ray.intersectObject(lab,true)[0];
    assert.ok(hit&&sculpture.children.includes(hit.object),`${sculpture.name} hidden: mobile=${mobile} t=${time} chapter=${chapter} yaw=${turn}`);
   }
  }
  dispose(lab);
 }
});

test('LAB backing stays on each curved patch without triangles spanning the open mouth',()=>{
 const a=new T.Vector3(),b=new T.Vector3();
 for(let time=0;time<LAB_WAVE_PERIOD;time++)for(const y of [-2.52,-1.26,0,1.26,2.52]){
  drapePoint(LAB_LIP_SEAM,y,a,time);drapePoint(LAB_LIP_SEAM-.94*1.75,y*.5,b,time);
  assert.ok(a.distanceTo(b)<1e-6,'basin detaches from the rolled lip during its wave');
 }
 for(const mobile of [false,true]){
  const {lab,updateLab}=buildLab({mobile});
  for(let time=0;time<LAB_WAVE_PERIOD;time++){
   updateLab(time);
   for(const mesh of lab.children.filter(o=>o.name.endsWith('-backing'))){
    const position=mesh.geometry.attributes.position,index=mesh.geometry.index;
    for(let i=0;i<index.count;i+=3)for(let edge=0;edge<3;edge++){
     a.fromBufferAttribute(position,index.getX(i+edge));b.fromBufferAttribute(position,index.getX(i+(edge+1)%3));
     assert.ok(a.distanceTo(b)<1.3,`${mesh.name} contains a triangle jumping across the lip at ${time}s`);
    }
   }
  }
  dispose(lab);
 }
});
