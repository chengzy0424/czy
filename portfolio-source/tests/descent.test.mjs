import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {descentField,descentOpacity,createDescent} from '../src/space-descent.js';
import {opticsStrength,opticsSize,scenePixelRatio} from '../src/space-optics.js';
import {cameraPose,SCENE_Y} from '../src/space-path.js';

test('descent cloud continuously bridges the LAB and closing scene in both viewport classes',()=>{
 const a=descentField(14000),b=descentField(14000);assert.deepEqual(a,b);assert.ok([...a.position,...a.color,...a.meta].every(Number.isFinite));
 for(const [width,height] of [[1660,940],[390,844]]){
  const mobile=width<=760,camera=new T.PerspectiveCamera(mobile?43:40,width/height,.1,100),point=new T.Vector3();
  for(const progress of [5.15,5.3,5.5,5.7,5.9,6]){
   const pose=cameraPose(progress,mobile,width/height);camera.position.fromArray(pose.eye);camera.lookAt(...pose.look);camera.updateMatrixWorld();
   let visible=0,minX=1,maxX=-1,near=Infinity,far=-Infinity;
   for(let i=0;i<a.position.length;i+=3){
    point.fromArray(a.position,i);point.y+=SCENE_Y.lab;const distance=point.distanceTo(camera.position);point.project(camera);
    if(Math.abs(point.x)<1&&Math.abs(point.y)<1&&Math.abs(point.z)<1){visible++;minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);near=Math.min(near,distance);far=Math.max(far,distance);}
   }
   assert.ok(visible>500,`empty descent at ${width} / ${progress}`);assert.ok(maxX-minX>.25,'cloud collapses to a narrow line');assert.ok(far-near>3,'particles have no depth');
  }
 }
});

test('descent fades continuously, returns on reverse scroll and freezes under reduced motion',()=>{
 let previous=0;for(let n=0;n<150;n++){const alpha=descentOpacity(5+n/100);assert.ok(alpha>=previous&&alpha-previous<.05);previous=alpha;}
 for(const mobile of [false,true]){
  const cloud=createDescent({mobile}),original=cloud.points.geometry.attributes.position.array.slice();
  cloud.update(2,5);assert.equal(cloud.points.visible,false);
  cloud.update(2,5.5);assert.equal(cloud.points.visible,true);assert.equal(cloud.uniforms.uTime.value,2);
  cloud.update(3,5);assert.equal(cloud.points.visible,false);
  cloud.update(8,5.5,true,1);assert.equal(cloud.uniforms.uTime.value,0);assert.equal(cloud.uniforms.uTravel.value,0);
  cloud.update(8,5.5,false,1,1,.75);assert.ok(cloud.points.geometry.drawRange.count<cloud.count);
  assert.deepEqual(cloud.points.geometry.attributes.position.array,original,'animation rewrites all particle positions on the CPU');cloud.dispose();
 }
});

test('optical pass stays within a bounded pixel budget and ramps in without a cut',()=>{
 for(const [w,h,dpr,mobile] of [[3840,2160,2,false],[1660,940,1,false],[390,844,3,true]]){
  const size=opticsSize(w,h,dpr,mobile);assert.ok(size.width<=(mobile?680:1280));assert.ok(Math.abs(size.width/size.height-w/h)<.005);
  const reduced=opticsSize(w,h,dpr,mobile,.75);assert.ok(reduced.width<=size.width);
  const ratio=scenePixelRatio(w,h,dpr,mobile);assert.ok(w*h*ratio*ratio<=(mobile?1_000_001:3_000_001),'retina viewport exceeds output pixel budget');
 }
 assert.equal(opticsStrength(4.5),0);assert.equal(opticsStrength(5),1);
 for(let n=0;n<100;n++)assert.ok(Math.abs(opticsStrength(4.4+n/100)-opticsStrength(4.4+(n+1)/100))<.04);
});
