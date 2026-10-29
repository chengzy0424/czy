// Download actual compiled Unity files before entering the engine. A transient
// connection failure retries only that file, keeping completed parts in memory.
export async function loadGameResources({parts,code,framework,signal,onProgress=()=>{},fetchImpl=fetch,concurrency=3,retryDelay=1000,idleTimeout=45000}) {
 const files=[...parts.map(part=>({...part,kind:'data'})),{...code,kind:'code'},{...framework,kind:'framework'}];
 const controller=new AbortController();
 const abort=()=>controller.abort(signal?.reason);
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const buffers=new Array(files.length),received=new Array(files.length).fill(0);
 const total=files.reduce((sum,file)=>sum+file.bytes,0);let next=0;
 const notify=retry=>onProgress({received:received.reduce((sum,n)=>sum+n,0),total,retry});
 async function download(index){
  const file=files[index];
  for(let attempt=0;attempt<3;attempt++){
   controller.signal.throwIfAborted();received[index]=0;
   const attemptController=new AbortController();let timeout;
   const cancelAttempt=()=>attemptController.abort(controller.signal.reason);
   const rearm=()=>{clearTimeout(timeout);timeout=setTimeout(()=>attemptController.abort(new Error('资源连接超时 · '+file.url)),idleTimeout);};
   controller.signal.addEventListener('abort',cancelAttempt,{once:true});rearm();
   try{
    const response=await fetchImpl(file.url,{signal:attemptController.signal});
    if(!response.ok)throw new Error('HTTP '+response.status+' · '+file.url);
    const chunks=[];let count=0;
    if(response.body?.getReader){
     const reader=response.body.getReader();
     try{while(true){const {done,value}=await reader.read();if(done)break;rearm();chunks.push(value);count+=value.byteLength;received[index]=count;notify(attempt);}}
     finally{reader.releaseLock();}
    }else{const buffer=await response.arrayBuffer();chunks.push(buffer);count=buffer.byteLength;}
    if(count!==file.bytes)throw new Error('资源长度不完整 · '+file.url);
    buffers[index]=new Blob(chunks,{type:'application/octet-stream'});received[index]=count;notify(0);return;
   }catch(error){
    clearTimeout(timeout);
    if(controller.signal.aborted||attempt===2)throw error;
    received[index]=0;notify(attempt+1);
    await new Promise(resolve=>setTimeout(resolve,retryDelay*(attempt+1)));
   }finally{clearTimeout(timeout);controller.signal.removeEventListener('abort',cancelAttempt);}
  }
 }
 async function worker(){while(next<files.length){const index=next++;await download(index);}}
 try{
  await Promise.all(Array.from({length:Math.max(1,Math.min(concurrency,files.length))},()=>worker()));
  controller.signal.throwIfAborted();
  const urls={dataUrl:URL.createObjectURL(new Blob(buffers.slice(0,parts.length),{type:'application/octet-stream'})),codeUrl:URL.createObjectURL(buffers[parts.length]),frameworkUrl:URL.createObjectURL(buffers[parts.length+1])};
  return {...urls,dispose(){Object.values(urls).forEach(url=>URL.revokeObjectURL(url));}};
 }catch(error){controller.abort();throw error;}
 finally{signal?.removeEventListener('abort',abort);}
}
