import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {cameraPose,scrollToChapter,galleryCardPose,CARD_SPECS} from '../src/space-path.js';
import {buildWorld,particleField} from '../src/space-objects.js';
import {springStep} from '../src/weave-math.js';

test('all six passages share a finite continuous and reversible camera path',()=>{
 for(const mobile of [false,true]){
  let previous=cameraPose(0,mobile);
  for(let i=0;i<=12000;i++){
   const p=i/2000,next=cameraPose(p,mobile);assert.deepEqual(next,cameraPose(p,mobile));
   for(const key of ['eye','look'])for(let axis=0;axis<3;axis++){assert.ok(Number.isFinite(next[key][axis]));assert.ok(Math.abs(next[key][axis]-previous[key][axis])<.02);}
   previous=next;
  }
  for(let chapter=1;chapter<6;chapter++){
   const a=cameraPose(chapter-.00001,mobile),b=cameraPose(chapter+.00001,mobile);
   assert.ok(new T.Vector3(...a.eye).distanceTo(new T.Vector3(...b.eye))<.00001,'camera jumps at chapter '+chapter);
  }
 }
 const anchors=[0,900,2200,3300,4200,5500];
 anchors.forEach((y,i)=>assert.equal(scrollToChapter(y,anchors),i));
 assert.equal(scrollToChapter(4400,anchors),4+200/1300);
});

async function geometryWorld(mobile=false){
 // No browser renderer here: fake only the 2D cover painter so actual Three geometry can be checked.
 const gradient={addColorStop(){}};
 const context=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>gradient:()=>{},set:()=>true});
 const doc={createElement:()=>({width:0,height:0,getContext:()=>context})};
 const previous=globalThis.Image;globalThis.Image=class{set src(_) {}};
 const world=await buildWorld({mobile,documentRef:doc});globalThis.Image=previous;return world;
}
test('lab ring and cross remain visible in front of the honeycomb through the viewing motion',async()=>{
 for(const mobile of [false,true]){
  const w=await geometryWorld(mobile);
  const marker=w.lab.getObjectByName('lab-marker');
  assert.ok(marker,'lab marker group missing');
  const targets=Array.from({length:24},(_,i)=>new T.Vector3(.59*Math.cos(i*Math.PI/12),.59*Math.sin(i*Math.PI/12),0));
  targets.push(...[[-.35,0,.02],[.35,0,.02],[0,-.35,.02],[0,.35,.02]].map(p=>new T.Vector3(...p)));
  for(const chapter of [4.9,5,5.1])for(const turn of [-.035,0,.035]){
   const pose=cameraPose(chapter,mobile,mobile?390/844:16/9);
   const eye=new T.Vector3(...pose.eye);
   w.lab.rotation.y=-.16+turn;w.world.updateMatrixWorld(true);
   for(const target of targets){
    const direction=marker.localToWorld(target.clone()).sub(eye).normalize();
    const hit=new T.Raycaster(eye,direction).intersectObject(w.lab,true)[0];
    assert.ok(hit&&marker.children.includes(hit.object),`honeycomb hides marker: mobile=${mobile}, chapter=${chapter}, turn=${turn}`);
   }
  }
  w.dispose();
 }
});

test('solid emblem, segmented spine, mechanical chamber and honeycomb have finite 3D geometry',async()=>{
 for(const mobile of [false,true]){
  const w=await geometryWorld(mobile);let triangles=0,meshes=0;
  w.world.traverse(o=>{if(!o.geometry)return;meshes++;const pos=o.geometry.getAttribute('position');assert.ok([...pos.array].every(Number.isFinite));triangles+=(o.geometry.index?.count||pos.count)/3*(o.isInstancedMesh?o.count:1);});
  const rim=w.lens.children[0];rim.geometry.computeBoundingBox();const size=rim.geometry.boundingBox.getSize(new T.Vector3());
  assert.ok(size.x>2.4&&size.z>.2,'emblem must have real thickness');
  assert.ok(w.spine.geometry.attributes.position.count>4000);
  assert.ok(w.machine.children.length>(mobile?27:30),'mechanical supports and cables missing');
  const honey=w.lab.children.find(o=>o.isInstancedMesh);assert.ok(honey.count>650,'draped tile region missing');assert.equal(honey.userData.relief,true);const z=[];const mat=new T.Matrix4();for(let i=0;i<honey.count;i++){honey.getMatrixAt(i,mat);z.push(mat.elements[14]);}assert.ok(Math.max(...z)-Math.min(...z)>1,'surface needs actual relief');
  assert.ok(triangles<(mobile?170000:220000),'geometry budget exceeded '+triangles);
  console.log(JSON.stringify({mobile,meshes,triangles,honeycombCells:honey.count}));w.dispose();
 }
});
test('gallery boards have varying depth, actual thickness and project metadata',async()=>{
 const w=await geometryWorld();assert.deepEqual(w.cards.map(c=>c.spec.id),['tower','ash','csol','mines','boe','ae','lab']);const z=w.cards.map(c=>c.home.z);assert.ok(Math.max(...z)-Math.min(...z)>5);
 w.cards.forEach(c=>{c.base.geometry.computeBoundingBox();assert.ok(c.base.geometry.boundingBox.getSize(new T.Vector3()).z>.05);assert.ok(c.face.userData.detail);assert.equal(c.face.material.depthTest,true);});
 assert.equal(CARD_SPECS.find(c=>c.id==='boe').image,undefined,'no fabricated BOE screenshot');
 assert.match(CARD_SPECS.find(c=>c.id==='lab').note,/空格里的小镇/);w.dispose();
});

test('each gallery project reaches a readable unobstructed front position along a reversible helix',async()=>{
 for(const mobile of [false,true]){
  const w=await geometryWorld(mobile);
  for(let selected=0;selected<CARD_SPECS.length;selected++){
   const progress=2+selected/(CARD_SPECS.length-1),camera=cameraPose(progress,mobile,mobile?390/844:16/9);
   w.cards.forEach((card,index)=>{const pose=galleryCardPose(index,progress,mobile);card.group.position.fromArray(pose.position);card.group.rotation.set(...pose.rotation);});
   w.world.updateMatrixWorld(true);
   const front=galleryCardPose(selected,progress,mobile),target=w.cards[selected].face.getWorldPosition(new T.Vector3()),eye=new T.Vector3(...camera.eye);
   assert.ok(front.visible&&front.focus>.99,'project never receives a reading position');
   assert.ok(Math.abs(front.position[1])<.00001&&Math.abs(front.rotation[1])<.00001,'front project is tilted or displaced vertically');
   const hit=new T.Raycaster(eye,target.clone().sub(eye).normalize()).intersectObjects([...w.pickables,...w.opaque],false)[0];
   assert.equal(hit?.object,w.cards[selected].face,'another object blocks project '+CARD_SPECS[selected].id);
  }
  for(let index=0;index<CARD_SPECS.length;index++){
   let previous=galleryCardPose(index,2,mobile);
   for(let n=0;n<=1200;n++){
    const progress=2+n/1200,pose=galleryCardPose(index,progress,mobile);
    assert.deepEqual(pose,galleryCardPose(index,progress,mobile),'gallery position depends on scroll history');
    assert.ok([...pose.position,...pose.rotation,pose.focus].every(Number.isFinite));
    assert.ok(Math.abs(pose.position[1])<4,'gallery exceeds its vertical viewing region');
    for(const field of ['position','rotation'])for(let axis=0;axis<3;axis++)assert.ok(Math.abs(pose[field][axis]-previous[field][axis])<.05,'gallery jumps between cards');
    previous=pose;
   }
  }
  w.dispose();
 }
});
test('emblem and machine core remain in the viewport at target desktop and phone sizes',()=>{
 for(const [width,height,mobile] of [[1920,1080,false],[1440,900,false],[1024,768,false],[768,1024,false],[390,844,true],[320,720,true]]){
  for(const [chapter,center,radius] of [[0,[mobile?.4:2,0,0],1.25],[4,[0,-24,0],2.25],[5,[0,-34,0],3.9]]){
   const pose=cameraPose(chapter,mobile,width/height),camera=new T.PerspectiveCamera(mobile?43:40,width/height,.1,100);camera.position.fromArray(pose.eye);camera.lookAt(...pose.look);camera.updateMatrixWorld();
   for(const dx of [-radius,radius]){const p=new T.Vector3(center[0]+dx,center[1],center[2]).project(camera);assert.ok(Math.abs(p.x)<1.1,`clipping ${width} chapter ${chapter} x=${p.x}`);}
  }
 }
});
test('particles stay clustered at the reference objects, with stable counts and spring recovery',()=>{
 const a=particleField(44000),b=particleField(44000);assert.deepEqual(a,b);assert.ok([...a.position,...a.color,...a.meta].every(Number.isFinite));
 const counts=[0,0,0,0];for(let i=0;i<44000;i++)counts[a.meta[i*3+1]]++;assert.deepEqual(counts,[11000,11000,11000,11000]);
 for(const hz of [30,60,120]){let p=1,v=0;for(let i=0;i<hz*2;i++)[p,v]=springStep(p,v,0,1/hz);assert.ok(Math.abs(p)<.0001&&Math.abs(v)<.001);}
});

