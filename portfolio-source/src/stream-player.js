import {createSegmentWarmup} from './stream-warmup.js';
import {playbackPolicy,currentConnection,nativeHls} from './stream-policy.js';
const firstSegment=createSegmentWarmup();
export const prepareFirstSegment=(path,level)=>firstSegment.warm(path,level);
export const clearFirstSegment=()=>firstSegment.clear();
// HLS is loaded on intent, never alongside the first-screen WebGL bundle.
let library,preferredBackup=false;
export function prepareVideoPlayer(){
 return library ||= Promise.all([import('hls.js/light'),import('./stream-startup.json')])
  .then(([hls,index])=>({...hls,bootstrap:index.default})).catch(error=>{library=undefined;throw error;});
}
export function repositoryMediaURL(input,pageURL,backup=false){
 const url=new URL(input,pageURL);
 let file;
 if(url.hostname==='chengzy0424.github.io'&&/^\/czy\/media\/stream-v[\w-]+\//.test(url.pathname))file=url.pathname.slice(4);
 else if(url.hostname==='raw.githubusercontent.com'&&/^\/chengzy0424\/czy\/main\/media\/stream-v[\w-]+\//.test(url.pathname))file=url.pathname.slice('/chengzy0424/czy/main'.length);
 return file?(backup?'https://raw.githubusercontent.com/chengzy0424/czy/main':'https://chengzy0424.github.io/czy')+file:url.href;
}

const loadPolicy=(firstByte,total)=>({default:{
 maxTimeToFirstByteMs:firstByte,maxLoadTimeMs:total,
 timeoutRetry:{maxNumRetry:2,retryDelayMs:200,maxRetryDelayMs:800},
 errorRetry:{maxNumRetry:2,retryDelayMs:350,maxRetryDelayMs:1200,
  // XHR status 0 also represents reset/offline connections on these known,
  // CORS-enabled repository origins. Give that case a bounded route retry.
  shouldRetry:(policy,count,_timeout,response,retry)=>count<policy.maxNumRetry&&(retry||response?.code===0)
 }
}});

/** One controller per visible video. Destroy cancels segment loads and event handlers. */
export function createStreamPlayer({video,path,levels,fallback,onStatus,onQuality,onFailure}){
 let hls,disposed=false,mode='loading',generation=0,selected=-1,recovery=0,wantsPlay=true,seekTo=0,startTimer=0,playbackAllowed=false;
 const policy=playbackPolicy(levels,currentConnection());
 let holdUntil=0,guardLevel=policy.start,hasPlayed=false,nativeRetries=0,nativeTimer=0,stallTimer=0;
 const nativeMaster=levels.some(l=>l.key==='mobile')&&currentConnection().mobile?path.replace(/master\.m3u8$/,'mobile.m3u8'):path;
 function retryNative(){
  if(disposed||mode!=='native'||nativeRetries>=1)return false;
  const backup=repositoryMediaURL(video.src,location.href,true);if(backup===video.src)return false;
  nativeRetries++;seekTo=video.currentTime||seekTo;video.src=backup;video.load();play();onStatus('正在重新连接影片…');
  return true;
 }
 const ahead=()=>{for(let i=0;i<video.buffered.length;i++)if(video.buffered.start(i)<=video.currentTime+.15&&video.buffered.end(i)>video.currentTime)return video.buffered.end(i)-video.currentTime;return 0;};
 function updateCap(){if(hls)hls.autoLevelCapping=selected>=0?-1:performance.now()<holdUntil||ahead()<8?guardLevel:policy.autoMax;}
 const events=new AbortController(),listen=(name,fn)=>video.addEventListener(name,fn,{signal:events.signal});
 let pendingPlay;
 function play(){
  if(disposed||!wantsPlay||(mode==='hls'&&!playbackAllowed))return;
  pendingPlay=video.play();pendingPlay?.catch(e=>{
   if(!disposed&&e.name==='NotAllowedError')onStatus('点击播放按钮开始观看');
  });
 }
 const playingLabel=()=>onStatus('正在播放 · '+(mode==='fallback'?'兼容播放':mode==='native'?(levels[selected]?.label||'自动画质'):levels[hls?.currentLevel]?.label||'自动画质'));
 listen('playing',()=>{clearTimeout(nativeTimer);clearTimeout(stallTimer);hasPlayed=true;playingLabel();});
 listen('waiting',()=>{
  onStatus(video.currentTime>.1?'正在补充缓冲…':'正在加载首段…');
  if(hasPlayed&&selected<0&&hls){clearTimeout(stallTimer);stallTimer=setTimeout(()=>{
   // Decoder/quality transitions can emit a one-frame waiting event. Only a
   // sustained empty buffer is evidence that the connection needs a downgrade.
   if(!disposed&&hls&&selected<0&&!video.paused&&ahead()<.5){guardLevel=0;holdUntil=performance.now()+12000;updateCap();hls.nextAutoLevel=0;}
  },350);}
  if(mode==='native'){clearTimeout(nativeTimer);nativeTimer=setTimeout(retryNative,6000);}
 });
 listen('pause',()=>{clearTimeout(stallTimer);clearTimeout(nativeTimer);if(video.readyState>0&&!video.ended&&!video.error){wantsPlay=false;onStatus('已暂停');}});
 listen('play',()=>{wantsPlay=true;playbackAllowed=true;clearTimeout(startTimer);});
 listen('ended',()=>onStatus('播放结束，可再次观看'));
 listen('loadedmetadata',()=>{
  if(seekTo>0){video.currentTime=Math.min(seekTo,Math.max(0,video.duration-.05));seekTo=0;}
  play();
 });
 listen('error',()=>{if(!disposed&&mode!=='hls'&&!(mode==='native'&&retryNative()))onFailure('连接未能完成，请重试或切换兼容播放。');});

 function compatibility(){
  if(disposed)return;generation++;clearTimeout(startTimer);clearTimeout(nativeTimer);seekTo=video.currentTime||seekTo;wantsPlay=!video.paused||video.readyState===0;
  hls?.destroy();hls=undefined;mode='fallback';
  video.src=fallback;video.load();play();onStatus('正在连接兼容视频…');
 }
 async function start(at=0){
  const token=++generation;seekTo=at;wantsPlay=true;recovery=0;playbackAllowed=at>0;clearTimeout(startTimer);startTimer=0;
  holdUntil=performance.now()+2000;guardLevel=policy.start;hasPlayed=false;nativeRetries=0;clearTimeout(nativeTimer);clearTimeout(stallTimer);
  hls?.destroy();hls=undefined;mode='loading';onStatus('正在加载首段…');
  // Native HLS (notably Safari) starts synchronously in the visitor's click.
  if(nativeHls(video)){
   mode='native';video.src=nativeMaster;video.load();play();nativeTimer=setTimeout(retryNative,6000);return;
  }
  try{
   const {default:Hls,bootstrap}=await prepareVideoPlayer();if(disposed||token!==generation)return;
   if(!Hls.isSupported()){
    if(video.canPlayType('application/vnd.apple.mpegurl')){mode='native';video.src=nativeMaster;video.load();play();}
    else compatibility();
    return;
   }
   mode='hls';let useBackup=preferredBackup;
   const primary=new URL(path,location.href);
   // Both routes serve the user's own public repository; no third-party account/CDN.
   const canBackup=primary.hostname==='chengzy0424.github.io'&&/^\/czy\/media\/stream-v[\w-]+\//.test(primary.pathname);
   const BaseLoader=Hls.DefaultConfig.loader;
   class RepositoryLoader extends BaseLoader{
    abort(){this.cancelled=true;super.abort();}
    destroy(){this.cancelled=true;super.destroy();}
    loadInternal(){
     // The default loader retries internally. Route that retry before opening XHR,
     // rather than waiting for every primary-host attempt to be exhausted.
     if(canBackup&&this.context){
      if(this.stats.retry>0&&this.lastRetry!==this.stats.retry){useBackup=preferredBackup=!useBackup;this.lastRetry=this.stats.retry;}
      this.context.url=repositoryMediaURL(this.context.url,location.href,useBackup);
     }
     super.loadInternal();
    }
    load(context,config,callbacks){
     const resolved=new URL(context.url,location.href);
     const warm=firstSegment.get(resolved.href);
     if(warm){
      this.context=context;const stats=this.stats,end=performance.now();
      stats.loading.start=end-warm.elapsed;stats.loading.first=stats.loading.start+Math.min(warm.first,warm.elapsed);stats.loading.end=end;stats.loaded=stats.total=warm.data.byteLength;
      queueMicrotask(()=>{if(!this.cancelled&&this.context)callbacks.onSuccess({url:resolved.href,data:warm.data.slice(0),code:200},stats,context,null);});return;
     }
     const key=resolved.pathname.match(/(?:^|\/)(media\/stream-v[\w-]+\/.*)$/)?.[1];
     const cached=bootstrap[key];
     if(cached){
      // Tiny immutable manifests and init headers share one compressed chunk.
      // The only media network dependency at startup is the first video segment.
      this.context=context;const stats=this.stats;stats.loading.start=performance.now();
      queueMicrotask(()=>{
       if(this.cancelled||!this.context)return;
       const data=cached.binary?Uint8Array.from(atob(cached.data),c=>c.charCodeAt(0)).buffer:cached.data;
       stats.loaded=stats.total=cached.binary?data.byteLength:data.length;
       stats.loading.first=stats.loading.end=Math.max(performance.now(),stats.loading.start+.001);
       callbacks.onSuccess({url:resolved.href,data,code:200},stats,context,null);
      });return;
     }
     if(canBackup)context={...context,url:repositoryMediaURL(context.url,location.href,useBackup)};
     if(/\/part-000\.m4s(?:\?|$)/.test(context.url))config={...config,loadPolicy:{...config.loadPolicy,maxTimeToFirstByteMs:2000}};
     const failed=()=>{if(canBackup)useBackup=preferredBackup=!useBackup;};
     super.load(context,config,{...callbacks,
      onTimeout:(...args)=>{failed();callbacks.onTimeout(...args);},
      onError:(...args)=>{failed();callbacks.onError(...args);}
     });
    }
   }
   hls=new Hls({
    enableWorker:true,lowLatencyMode:false,startPosition:at,startLevel:selected<0?policy.start:selected,
    capLevelToPlayerSize:false,
    maxBufferLength:24,maxMaxBufferLength:32,backBufferLength:6,maxBufferSize:16*1024*1024,
    capLevelOnFPSDrop:true,fpsDroppedMonitoringPeriod:4000,fpsDroppedMonitoringThreshold:.12,
    abrMaxWithRealBitrate:true,
    abrEwmaDefaultEstimate:policy.estimate,abrBandWidthFactor:.8,abrBandWidthUpFactor:.7,
    maxStarvationDelay:1,maxLoadingDelay:1,preserveManualLevelOnError:false,
    manifestLoadPolicy:loadPolicy(3500,8000),playlistLoadPolicy:loadPolicy(3500,8000),
    fragLoadPolicy:loadPolicy(4000,14000),loader:RepositoryLoader
   });
   hls.on(Hls.Events.MANIFEST_PARSED,()=>{updateCap();if(selected>=0)hls.loadLevel=selected;play();});
   let firstDownloadMs=0;
   const releaseStart=()=>{if(disposed||token!==generation)return;playbackAllowed=true;clearTimeout(startTimer);play();};
   hls.on(Hls.Events.FRAG_LOADED,(_,data)=>{
    if(data.frag.sn===0)firstDownloadMs=data.stats.loading.end-data.stats.loading.start;
   });
   hls.on(Hls.Events.FRAG_BUFFERED,()=>{
    updateCap();
    if(playbackAllowed)return;
    const buffer=ahead();
    if(buffer<=0)return;
    if(firstDownloadMs<=1200||buffer>=3.5)releaseStart();
    else if(!startTimer){onStatus('正在准备播放…');startTimer=setTimeout(releaseStart,900);}
   });
   hls.on(Hls.Events.LEVEL_SWITCHED,(_,data)=>{onQuality(data.level);if(!video.paused&&video.readyState>=3)playingLabel();});
   hls.on(Hls.Events.ERROR,(_,data)=>{
    if(disposed||!data.fatal)return;
    if(data.type===Hls.ErrorTypes.MEDIA_ERROR&&recovery++===0){seekTo=video.currentTime;hls.recoverMediaError();return;}
    onFailure('网络连接较慢，可重试或切换兼容播放。');
   });
   hls.attachMedia(video);hls.loadSource(primary.href);play();
  }catch{if(!disposed&&token===generation)compatibility();}
 }
 return {
  start,
  quality(index){selected=index;if(hls){
   // Replace only future fragments, preserving the current frame, sound and position.
   if(index<0){guardLevel=policy.start;holdUntil=performance.now()+8000;}
   updateCap();hls.nextLevel=index;onStatus(index<0?'自动调整画质':'将在下一片段切换为 '+levels[index].label);
  }else if(mode==='native'){
   if(video.readyState){seekTo=video.currentTime;wantsPlay=!video.paused;}
   video.src=index<0?nativeMaster:new URL(levels[index].playlist||levels[index].key+'/index.m3u8',new URL(path,location.href)).href;video.load();play();
  }},
  compatibility,
  retry(){start(video.currentTime||seekTo);},
  destroy(){disposed=true;generation++;clearTimeout(startTimer);clearTimeout(nativeTimer);clearTimeout(stallTimer);events.abort();firstSegment.clear();hls?.destroy();hls=undefined;}
 };
}

