import {test,expect} from '@playwright/test';
import {PerspectiveCamera,Vector3} from 'three';
import {cameraPose,galleryCardPose,SCENE_Y,CARD_SPECS} from '../../src/space-path.js';

// Use wheel input plus exact scroll checkpoints, and real mouse/emulated
// touch input on the rendered board's projected centre.
// No onSelect calls, synthetic DOM clicks, or replacement scene are used.
test('seven rotating gallery boards open the right project and restore the scroll journey',async({page},info)=>{
 test.setTimeout(360000);
 if(!info.project.use.hasTouch)await page.setViewportSize({width:960,height:640});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?inspect=1');
 await expect.poll(()=>page.evaluate(()=>document.body.classList.contains('webgl-ready')||document.body.classList.contains('webgl-failed')),{timeout:45000}).toBe(true);
 test.skip(await page.evaluate(()=>document.body.classList.contains('webgl-failed')),'WebGL unavailable: this run cannot verify rotating gallery hit-testing.');
 const metrics=page.locator('#prototype-metrics');await expect(metrics).toContainText('frames');
 const touch=!!info.project.use.hasTouch,viewport=page.viewportSize(),mobile=viewport.width<=760;
 const firefox=info.project.use.browserName==='firefox';
 if(firefox){
  // Verify wheel input reaches the real document, without assuming an OS wheel
  // delta equals an exact CSS-pixel distance (Firefox applies async scrolling).
  await page.mouse.wheel(0,200);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  await page.waitForTimeout(750);
 }
 const scroll=async top=>{
  if(touch||firefox)await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),top);
  else await page.mouse.wheel(0,top-await page.evaluate(()=>scrollY));
 };
 info.annotations.push({type:'scroll-input',description:touch?'DOM scrollTo plus emulated taps; physical swipe is unverified':firefox?'Mouse-wheel response checked; exact board checkpoints use DOM scrollTo; mouse clicks on real boards':'mouse wheel plus mouse clicks'});
 const samples=[];
 for(const [index,spec] of CARD_SPECS.entries()){
  const progress=2+index/(CARD_SPECS.length-1);
  const target=await page.locator('#spatial-gallery').evaluate((el,p)=>Math.round(el.offsetTop+(el.offsetHeight-innerHeight)*(p-2)),progress);
  // Both paths exercise the site's scroll handler. Mobile WebKit does not
  // support wheel input; its scrollTo and taps are explicitly labelled emulation.
  await page.mouse.move(viewport.width-15,viewport.height*.55);
  await scroll(target);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(target,0);
  await expect.poll(async()=>Math.abs(JSON.parse(await metrics.textContent()).chapter-progress),{timeout:30000}).toBeLessThan(.025);
  const pose=cameraPose(progress,mobile,viewport.width/viewport.height);
  const camera=new PerspectiveCamera(mobile?43:40,viewport.width/viewport.height,.1,100);
  camera.position.fromArray(pose.eye);camera.lookAt(...pose.look);camera.rotateZ(pose.roll);camera.updateMatrixWorld();
  const card=galleryCardPose(index,progress,mobile);
  const point=new Vector3(...card.position);point.y+=SCENE_Y.gallery;point.project(camera);
  const x=(point.x+1)*viewport.width/2,y=(1-point.y)*viewport.height/2;
  if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
  await expect(page.locator('dialog')).toBeVisible();
  if(['tower','ash','csol','mines'].includes(spec.id))await expect(page.locator(`[data-play="${spec.id}"]`)).toBeVisible();
  else if(spec.id==='boe')await expect(page.locator('#detail-content')).toContainText('BOE');
  else await expect(page.locator(`#detail-content [data-film="${spec.id==='ae'?'murphy':'town'}"]`)).toBeVisible();
  // Inspect the real draw counter while a video is visible over the gallery.
  if(index===0){
   await page.locator('[data-play="tower"]').click();
   const video=page.locator('video');
   await expect.poll(()=>video.evaluate(v=>v.currentTime),{timeout:40000}).toBeGreaterThan(.2);
   await page.waitForTimeout(1200);const paused=JSON.parse(await metrics.textContent()).frames;
   await page.waitForTimeout(1200);expect(JSON.parse(await metrics.textContent()).frames).toBe(paused);
   await page.locator('.playback-back').click();
   await expect(page.locator('video')).toHaveCount(0);
  }
  const paused=JSON.parse(await metrics.textContent()).frames;
  await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(target,0);
  await expect.poll(async()=>JSON.parse(await metrics.textContent()).frames).toBeGreaterThan(paused);
  samples.push({id:spec.id,progress,scroll:await page.evaluate(()=>scrollY),input:touch?'emulated touch':'mouse',hit:{x,y}});
  if(index===0||index===3||index===6)await info.attach(`gallery-${index}`,{body:await page.screenshot(),contentType:'image/png'});
 }
 // Reverse through the same scroll path, then continue to the newer scenes.
 const start=await page.locator('#spatial-gallery').evaluate(el=>el.offsetTop);
 await scroll(start);
 await expect.poll(async()=>Math.abs(JSON.parse(await metrics.textContent()).chapter-2)).toBeLessThan(.025);
 for(const [selector,chapter] of [['#machine',4],['#lab',5],['#confluence',6]]){
  const top=await page.locator(selector).evaluate(el=>el.offsetTop);
  await scroll(top);
  await expect.poll(async()=>Math.abs(JSON.parse(await metrics.textContent()).chapter-chapter),{timeout:30000}).toBeLessThan(.025);
 }
 expect(errors).toEqual([]);
 await info.attach('gallery-scroll-and-hit-evidence',{body:JSON.stringify(samples,null,2),contentType:'application/json'});
});
