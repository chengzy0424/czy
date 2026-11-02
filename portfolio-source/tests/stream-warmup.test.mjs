import test from 'node:test';
import assert from 'node:assert/strict';
import {createSegmentWarmup} from '../src/stream-warmup.js';
const pageURL=()=> 'https://chengzy0424.github.io/czy/';
const response=bytes=>({ok:true,headers:new Headers(),arrayBuffer:async()=>new Uint8Array(bytes).buffer});

test('one first fragment is reused with real transfer timing and bounded memory',async()=>{
 let clock=0,calls=0;
 const cache=createSegmentWarmup({pageURL,now:()=>clock,constrained:()=>false,fetcher:async()=>{calls++;clock+=800;return response(2048);}});
 await cache.warm('./media/stream-v1/town/master.m3u8','low');
 await cache.warm('./media/stream-v1/town/master.m3u8','low');assert.equal(calls,1);
 const hit=cache.get('https://raw.githubusercontent.com/chengzy0424/czy/main/media/stream-v1/town/low/part-000.m4s');
 assert.equal(hit.data.byteLength,2048);assert.equal(hit.elapsed,800);assert.equal(hit.first,800);
 assert.equal(cache.get('./media/stream-v1/town/low/part-001.m4s'),undefined);
 await cache.warm('./media/stream-v1/arc/master.m3u8','low');assert.equal(cache.get(hit.url),undefined);cache.clear();
});

test('switching intent aborts stale work; failed or oversized warmups never poison playback',async()=>{
 let firstResolve,firstSignal;
 const cache=createSegmentWarmup({pageURL,constrained:()=>false,fetcher:(url,options)=>url.includes('/town/')?new Promise(resolve=>{firstResolve=resolve;firstSignal=options.signal;}):Promise.resolve(response(32))});
 const old=cache.warm('./media/stream-v1/town/master.m3u8','low');
 await cache.warm('./media/stream-v1/arc/master.m3u8','low');assert.equal(firstSignal.aborted,true);
 firstResolve(response(32));await old;assert.equal(cache.get('./media/stream-v1/town/low/part-000.m4s'),undefined);cache.clear();
 for(const fetcher of [async()=>{throw new Error('offline');},async()=>response(600*1024)]){
  const failed=createSegmentWarmup({pageURL,constrained:()=>false,fetcher});await failed.warm('./media/stream-v1/arc/master.m3u8','low');assert.equal(failed.get('./media/stream-v1/arc/low/part-000.m4s'),undefined);failed.clear();
 }
});

test('data saver avoids speculative media traffic entirely',async()=>{
 let fetched=false;const cache=createSegmentWarmup({pageURL,constrained:()=>true,fetcher:async()=>{fetched=true;return response(32);}});
 await cache.warm('./media/stream-v1/town/master.m3u8','low');assert.equal(fetched,false);cache.clear();
});
