import {test,expect} from '@playwright/test';

test('Chromium native controls accept pause, scrub drag and resume',async({page,context},info)=>{
 test.skip(info.project.use.browserName!=='chromium','Native-control geometry differs by engine; Safari/iPhone scrub gestures remain manual device QA.');
 if(info.project.name==='edge-native-branch')await page.addInitScript(()=>Object.defineProperty(window,'MediaSource',{value:undefined}));
 await page.goto('/');
 const touch=!!info.project.use.hasTouch;
 const press=locator=>touch?locator.tap():locator.click();
 await press(page.getByRole('link',{name:'直接查看作品',exact:true}));
 await press(page.locator('[data-detail="csol"]').first());await press(page.locator('[data-play="csol"]'));
 const video=page.locator('video');await expect.poll(()=>video.evaluate(v=>v.currentTime),{timeout:40000}).toBeGreaterThan(.5);
 await video.evaluate(v=>v.scrollIntoView({block:'end'}));
 let box=await video.boundingBox();
 if(touch)await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);else await video.hover();
 const control={x:box.x+25,y:box.y+box.height-48};
 if(touch)await page.touchscreen.tap(control.x,control.y);else await page.mouse.click(control.x,control.y);
 await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);
 box=await video.boundingBox();const x1=box.x+16+(box.width-32)*.18,x2=box.x+16+(box.width-32)*.65,y=box.y+box.height-22;
 if(touch){
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y}]});
  for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x1+(x2-x1)*i/10,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 }else{
  await page.mouse.move(x1,y);await page.mouse.down();await page.mouse.move(x2,y,{steps:10});await page.mouse.up();
 }
 await expect.poll(()=>video.evaluate(v=>v.currentTime/v.duration)).toBeGreaterThan(.55);
 await expect.poll(()=>video.evaluate(v=>v.seeking)).toBe(false);
 const before=await video.evaluate(v=>v.currentTime);expect(await video.evaluate(v=>v.paused)).toBe(true);
 await info.attach('native-scrub',{body:JSON.stringify({input:touch?'CDP touch gesture emulation, not a physical phone':'mouse drag on the browser native timeline',time:before}),contentType:'application/json'});
 await info.attach('native-controls',{body:await page.screenshot(),contentType:'image/png'});
 if(touch)await page.touchscreen.tap(control.x,control.y);else await page.mouse.click(control.x,control.y);
 await expect.poll(()=>video.evaluate((v,at)=>!v.paused&&v.currentTime>at+.2,before)).toBe(true);
});
