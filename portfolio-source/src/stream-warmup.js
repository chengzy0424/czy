// At most one small first fragment, only after intent on a specific video.
// Keep the original transfer timing when serving it to HLS: a memory hit must
// not be mistaken for an unlimited network and trigger an early HD jump.
export function createSegmentWarmup({fetcher=(...args)=>fetch(...args),now=()=>performance.now(),pageURL=()=>location.href,constrained=()=>globalThis.navigator?.connection?.saveData||/2g/.test(globalThis.navigator?.connection?.effectiveType||'')}={}){
 let entry;
 const canonical=url=>new URL(url,pageURL()).href.replace('https://raw.githubusercontent.com/chengzy0424/czy/main/','https://chengzy0424.github.io/czy/');
 return {
  warm(path,level){
   if(constrained())return Promise.resolve();
   const url=new URL(level+'/part-000.m4s',new URL(path,pageURL())).href;
   if(entry?.url===url)return entry.promise;
   entry?.controller.abort();
   const current={url,controller:new AbortController(),started:now(),data:null};entry=current;
   const timeout=setTimeout(()=>current.controller.abort(),6500);
   current.promise=(async()=>{
    try{
     const response=await fetcher(url,{signal:current.controller.signal,cache:'force-cache',credentials:'same-origin'});
     current.first=now()-current.started;
     if(!response.ok||Number(response.headers.get('content-length'))>512*1024)return;
     const data=await response.arrayBuffer();
     if(entry!==current||current.controller.signal.aborted||data.byteLength>512*1024)return;
     current.elapsed=Math.max(1,now()-current.started);current.data=data;
    }catch{/* Warmup is optional; the normal player retains its route retries. */}
    finally{clearTimeout(timeout);}
   })();return current.promise;
  },
  get(url){return entry?.data&&canonical(url)===canonical(entry.url)?entry:undefined;},
  clear(){entry?.controller.abort();entry=undefined;}
 };
}
