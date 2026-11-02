import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {cameraPose,scrollToChapter,galleryCardPose,galleryDescent,galleryTurn,GALLERY_DESCENT,SCENE_Y,CARD_SPECS} from '../src/space-path.js';
import {buildWorld,particleField} from '../src/space-objects.js';
import {galleryIntersectsView} from '../src/space.js';
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
  const targets=Array.from({length:24},(_,i)=>new T.Vector3(.51*Math.cos(i*Math.PI/12),.51*Math.sin(i*Math.PI/12),0));
  targets.push(...[[-.3,0,.02],[.3,0,.02],[0,-.3,.02],[0,.3,.02]].map(p=>new T.Vector3(...p)));
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
  for(const name of ['machine-upper-housing','machine-recessed-basin','machine-support-columns','machine-cables-0','machine-granular-core'])assert.ok(w.machine.getObjectByName(name),'missing mechanical assembly '+name);
  const honey=w.lab.children.find(o=>o.isInstancedMesh);assert.ok(honey.count>650,'draped tile region missing');assert.equal(honey.userData.relief,true);const z=[];const mat=new T.Matrix4();for(let i=0;i<honey.count;i++){honey.getMatrixAt(i,mat);z.push(mat.elements[14]);}assert.ok(Math.max(...z)-Math.min(...z)>1,'surface needs actual relief');
  assert.ok(triangles<(mobile?170000:270000),'geometry budget exceeded '+triangles);
  console.log(JSON.stringify({mobile,meshes,triangles,honeycombCells:honey.count}));w.dispose();
 }
});
test('gallery boards have varying depth, actual thickness and project metadata',async()=>{
 const w=await geometryWorld();assert.deepEqual(w.cards.map(c=>c.spec.id),['tower','ash','csol','mines','boe','ae','lab']);const z=w.cards.map(c=>c.home.z);assert.ok(Math.max(...z)-Math.min(...z)>5);
 w.cards.forEach(c=>{c.base.geometry.computeBoundingBox();assert.ok(c.base.geometry.boundingBox.getSize(new T.Vector3()).z>.05);assert.ok(c.face.userData.detail);assert.equal(c.face.material.depthTest,true);});
 assert.equal(CARD_SPECS.find(c=>c.id==='boe').image,undefined,'no fabricated BOE screenshot');
 assert.match(CARD_SPECS.find(c=>c.id==='lab').note,/空格里的小镇/);w.dispose();
});

test('gallery begins with a long rigid skeleton and keeps every joint spacing while the view descends',async()=>{
 for(const mobile of [false,true]){
  const w=await geometryWorld(mobile),position=w.spine.geometry.attributes.position;
  assert.ok(w.galleryStructure&&w.spine.parent===w.galleryStructure);
  assert.equal(w.extendGallery,undefined,'scroll-time geometry extension must not exist');
  const {joints}=w.spine.geometry.userData;assert.equal(joints.length,30);
  assert.equal(joints.reduce((n,joint)=>n+joint.count,0),position.count);
  for(let i=1;i<joints.length;i++)assert.ok(joints[i].y-joints[i-1].y>.4&&joints[i].y-joints[i-1].y<.58,'joints have been stretched apart');
  const original=position.array.slice();w.world.updateMatrixWorld(true);
  const originalBox=new T.Box3().setFromObject(w.spine),height=originalBox.max.y-originalBox.min.y;
  assert.ok(height>14&&height<15.2,'spine must be built long enough before any scrolling');
  const machineBox=new T.Box3().setFromObject(w.machine);
  assert.ok(originalBox.min.y-machineBox.max.y>2,'long skeleton intersects the following machine scene');
  for(const progress of [2,2.2,2.5,2.8,3,2.8,2.5,2.2,2]){
   w.galleryStructure.rotation.y=galleryTurn(progress);
   w.cards.forEach((card,index)=>{const pose=galleryCardPose(index,progress,mobile);card.group.position.fromArray(pose.position);card.group.rotation.set(...pose.rotation);});
   w.world.updateMatrixWorld(true);
   assert.deepEqual(position.array,original,'scrolling changes skeleton geometry');
   assert.deepEqual(w.galleryStructure.scale.toArray(),[1,1,1]);assert.deepEqual(w.spine.scale.toArray(),[1,1,1]);
   const box=new T.Box3().setFromObject(w.spine),camera=cameraPose(progress,mobile);
   assert.ok(Math.abs(box.min.y-originalBox.min.y)<1e-9&&Math.abs(box.max.y-originalBox.max.y)<1e-9,'skeleton endpoints move during descent');
   assert.ok(camera.look[1]>box.min.y+3.5&&camera.look[1]<box.max.y-3.5,'camera moves beyond the prebuilt column');
  }
  w.dispose();
 }
});

test('long skeleton stays visible until it leaves desktop and tall mobile viewports',async()=>{
 for(const mobile of [false,true]){
  const w=await geometryWorld(mobile),meshes=[],point=new T.Vector3(),projection=new T.Matrix4(),frustum=new T.Frustum();
  w.gallery.traverse(object=>{if(object.geometry)meshes.push(object);});
  const viewports=mobile?[[390,844],[320,1000],[390,1200]]:[[1660,940],[768,1024]];
  for(const [width,height] of viewports){
   const camera=new T.PerspectiveCamera(mobile?43:40,width/height,.1,100);let oldCutoffFailures=0,culled=0;
   for(let step=0;step<=150;step++){
    const progress=3+step/100,pose=cameraPose(progress,mobile,width/height);
    camera.position.fromArray(pose.eye);camera.lookAt(...pose.look);camera.rotateZ(pose.roll);camera.updateMatrixWorld();
    w.galleryStructure.rotation.y=galleryTurn(progress);
    w.cards.forEach((card,index)=>{const cardPose=galleryCardPose(index,progress,mobile);card.group.position.fromArray(cardPose.position);card.group.rotation.set(...cardPose.rotation);});
    w.world.updateMatrixWorld(true);
    const visible=galleryIntersectsView(camera,meshes,frustum,projection),position=w.spine.geometry.attributes.position;
    let boneInViewport=false;
    for(let i=0;i<position.count;i++){
     point.fromBufferAttribute(position,i).applyMatrix4(w.spine.matrixWorld).project(camera);
     if(Math.abs(point.x)<=1&&Math.abs(point.y)<=1&&Math.abs(point.z)<=1){boneInViewport=true;break;}
    }
    if(boneInViewport){assert.ok(visible,`visible bone culled at ${width}x${height}, chapter ${progress}`);if(Math.abs(SCENE_Y.gallery-pose.look[1])>=14)oldCutoffFailures++;}
    if(!visible)culled++;
    // A previously hidden parent must become visible again on reverse scrolling.
    w.gallery.visible=false;assert.equal(galleryIntersectsView(camera,meshes,frustum,projection),visible);w.gallery.visible=true;
   }
   assert.ok(oldCutoffFailures>0,'regression did not reach the former premature cutoff');
   assert.ok(culled>0,'gallery should still be culled once all geometry leaves the viewport');
  }
  w.dispose();
 }
});

test('each gallery project reaches a readable unobstructed front position along a reversible helix',async()=>{
 for(const mobile of [false,true]){
  const w=await geometryWorld(mobile);
  for(let selected=0;selected<CARD_SPECS.length;selected++){
   const progress=2+selected/(CARD_SPECS.length-1),camera=cameraPose(progress,mobile,mobile?390/844:16/9);
   w.galleryStructure.rotation.y=galleryTurn(progress);
   w.cards.forEach((card,index)=>{const pose=galleryCardPose(index,progress,mobile);card.group.position.fromArray(pose.position);card.group.rotation.set(...pose.rotation);});
   w.world.updateMatrixWorld(true);
   const front=galleryCardPose(selected,progress,mobile),target=w.cards[selected].face.getWorldPosition(new T.Vector3()),eye=new T.Vector3(...camera.eye);
   assert.ok(front.visible&&front.focus>.99,'project never receives a reading position');
   assert.ok(Math.abs(front.position[1]+galleryDescent(progress))<.00001&&Math.abs(front.rotation[1])<.00001,'front project is tilted or displaced from its descending reading position');
   const hit=new T.Raycaster(eye,target.clone().sub(eye).normalize()).intersectObjects([...w.pickables,...w.opaque],false)[0];
   assert.equal(hit?.object,w.cards[selected].face,'another object blocks project '+CARD_SPECS[selected].id);
  }
  for(let index=0;index<CARD_SPECS.length;index++){
   let previous=galleryCardPose(index,2,mobile);
   for(let n=0;n<=1200;n++){
    const progress=2+n/1200,pose=galleryCardPose(index,progress,mobile);
    assert.deepEqual(pose,galleryCardPose(index,progress,mobile),'gallery position depends on scroll history');
    assert.ok([...pose.position,...pose.rotation,pose.focus].every(Number.isFinite));
    assert.equal(pose.position[1],galleryCardPose(index,2,mobile).position[1],'project changes its fixed height on the spine');
    for(const field of ['position','rotation'])for(let axis=0;axis<3;axis++)assert.ok(Math.abs(pose[field][axis]-previous[field][axis])<.05,'gallery jumps between cards');
    previous=pose;
   }
  }
  w.dispose();
 }
});
test('gallery descent carries the camera and project reading positions together without reversing or jumping',()=>{
 assert.equal(galleryDescent(-1),0);assert.equal(galleryDescent(2),0);
 assert.equal(galleryDescent(3),GALLERY_DESCENT);assert.equal(galleryDescent(6),GALLERY_DESCENT);
 let previous=0;
 for(let n=0;n<=2000;n++){
  const progress=2+n/2000,descent=galleryDescent(progress);
  assert.ok(Number.isFinite(descent)&&descent>=previous&&descent-previous<.005,'descent reverses or jumps');
  assert.equal(descent,galleryDescent(progress),'descent depends on scroll history');
  for(const mobile of [false,true]){
   const camera=cameraPose(progress,mobile),start=cameraPose(2,mobile);
   assert.ok(Math.abs(camera.eye[1]-start.eye[1]+descent)<1e-10,'camera eye leaves the descent');
   assert.ok(Math.abs(camera.look[1]-start.look[1]+descent)<1e-10,'camera target leaves the descent');
   for(let index=0;index<CARD_SPECS.length;index++){
    const card=galleryCardPose(index,progress,mobile);
    assert.ok(Math.abs(card.position[1]-camera.look[1]+SCENE_Y.gallery)<=GALLERY_DESCENT+1e-9,'project leaves the long gallery');
   }
  }
  previous=descent;
 }
 for(let index=0;index<CARD_SPECS.length;index++){
  const progress=2+index/(CARD_SPECS.length-1),card=galleryCardPose(index,progress),camera=cameraPose(progress);
  assert.ok(Math.abs(card.position[1]-camera.look[1]+SCENE_Y.gallery)<1e-10,'front project drifts relative to camera');
 }
});
test('emblem and machine core remain in the viewport at target desktop and phone sizes',()=>{
 for(const [width,height,mobile] of [[1920,1080,false],[1440,900,false],[1024,768,false],[768,1024,false],[390,844,true],[320,720,true]]){
  for(const [chapter,center,radius] of [[0,[mobile?.4:2,0,0],1.25],[4,[0,SCENE_Y.machine,0],2.25],[5,[0,SCENE_Y.lab,0],3.9]]){
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


test('projects retain their heights and angular attachment to the spine as the camera passes successive levels',()=>{
 for(const mobile of [false,true])for(let n=0;n<=120;n++){
  const progress=2+n/120,turn=galleryTurn(progress);
  for(let index=0;index<CARD_SPECS.length;index++){
   const card=galleryCardPose(index,progress,mobile),initial=galleryCardPose(index,2,mobile);
   assert.equal(card.position[1],initial.position[1],'a project slides vertically along its bone');
   assert.ok(Math.abs(card.rotation[1]-turn-index*Math.PI*2/CARD_SPECS.length)<1e-10,'project and spine turn out of sync');
   const radius=Math.hypot(card.position[0]-(mobile?0:.65),card.position[2]);
   assert.ok(Math.abs(radius-(mobile?3.3:3.8))<1e-10,'orbit stretches during the turn');
   if(index<CARD_SPECS.length-1)assert.ok(galleryCardPose(index+1,progress,mobile).position[1]<card.position[1],'next project must be below the current project');
  }
 }
});
