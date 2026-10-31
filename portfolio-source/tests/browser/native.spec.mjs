import {test,expect} from '@playwright/test';
test('native retry keeps the selected manifest; rapid paused changes, MP4 and destroy',async({page},info)=>{
 test.skip(!['edge-native-branch','webkit','webkit-touch'].includes(info.project.name),'Native controller integration is covered in native-capable projects.');
 if(info.project.name==='edge-native-branch')await page.addInitScript(()=>Object.defineProperty(window,'MediaSource',{value:undefined}));
 await page.goto('/tests/browser/native.html');
 const native=await page.evaluate(()=>document.createElement('video').canPlayType('application/vnd.apple.mpegurl'));
 test.skip(!native,'This engine/OS does not advertise native HLS.');
 await page.locator('#start').click();const video=page.locator('video');
 await expect(video).toHaveAttribute('data-playback-mode','native');
 await expect.poll(()=>video.evaluate(v=>v.currentTime),{timeout:40000}).toBeGreaterThan(.2);
 await page.locator('#pause').click();await video.evaluate(v=>{v.currentTime=14;v.volume=.45;});
 await expect.poll(()=>video.evaluate(v=>!v.seeking)).toBe(true);
 await page.getByLabel('Quality').selectOption('1');
 await expect.poll(()=>video.evaluate(v=>v.readyState>=2&&Math.abs(v.currentTime-14)<.5)).toBe(true);
 await page.locator('#retry').click();await expect.poll(()=>video.evaluate(v=>v.currentSrc)).toMatch(/\/720\/index.m3u8$/);
 await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeGreaterThan(14);
 await page.locator('#pause').click();const at=await video.evaluate(v=>v.currentTime);
 // Delay the replacement's real manifest so MP4 is selected before its metadata.
 await page.route('**/low60/index.m3u8',async route=>{await new Promise(r=>setTimeout(r,500));await route.continue().catch(()=>{});});
 await page.getByLabel('Quality').selectOption('0');await page.locator('#fallback').click();
 await expect.poll(()=>video.evaluate(v=>v.readyState>=2&&!v.seeking)).toBe(true);
 expect(await video.evaluate(v=>v.paused)).toBe(true);expect(await video.evaluate(v=>v.currentTime)).toBeCloseTo(at,0);
 expect(await video.evaluate(v=>v.volume)).toBeCloseTo(.45,2);
 await page.locator('#destroy').click();await expect.poll(()=>video.evaluate(v=>v.paused&&!v.getAttribute('src')&&v.readyState===0)).toBe(true);
 await page.locator('#retry').click();await expect(video).not.toHaveAttribute('src',/.+/);
});
