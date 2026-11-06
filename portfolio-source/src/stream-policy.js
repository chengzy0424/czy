// Keep startup cheap and preserve a buffer before allowing larger segments.
export function playbackPolicy(levels,{mobile=false,saveData=false,effectiveType='',downlink}={}){
 const weak=saveData||/2g/.test(effectiveType)||(Number.isFinite(downlink)&&downlink>0&&downlink<.65);
 const mobileIndex=Math.max(0,levels.findIndex(l=>(l.key||l.level)==='mobile'));
 const affordable=levels.map((l,i)=>({l,i})).filter(({l})=>(l.height||0)<=720&&(l.fps||30)<=30);
 const autoMax=weak?mobileIndex:mobile&&affordable.length?affordable.at(-1).i:levels.length-1;
 return {start:weak?0:mobileIndex,autoMax,estimate:weak?220000:500000};
}
export function currentConnection(){
 const n=globalThis.navigator,c=n?.connection;
 return {mobile:globalThis.matchMedia?.('(pointer:coarse)').matches||Math.min(globalThis.innerWidth||1440,globalThis.screen?.width||1440)<768,
  saveData:!!c?.saveData,effectiveType:c?.effectiveType||'',downlink:c?.downlink};
}
export function nativeHls(video){
 return !!video?.canPlayType('application/vnd.apple.mpegurl')&&(!globalThis.MediaSource||globalThis.navigator?.vendor==='Apple Computer, Inc.');
}
