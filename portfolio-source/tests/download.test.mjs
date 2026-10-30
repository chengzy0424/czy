import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGameResources} from '../public/games/download.js';
test('retry a truncated part without downloading completed files again; preserve binary order and limit concurrency',async()=>{
 const values={a:new Uint8Array([1,2]),b:new Uint8Array([3,4]),c:new Uint8Array([5]),wasm:new Uint8Array([6,7]),framework:new Uint8Array([8])};
 const calls={};let active=0,peak=0;
 const fetchImpl=async(url)=>{calls[url]=(calls[url]||0)+1;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,url==='a'?20:2));active--;return new Response(url==='b'&&calls.b===1?new Uint8Array([3]):values[url]);};
 const resource=await loadGameResources({parts:['a','b','c'].map(url=>({url,bytes:values[url].length})),code:{url:'wasm',bytes:2},framework:{url:'framework',bytes:1},fetchImpl,concurrency:2,retryDelay:0});
 try{assert.deepEqual([...new Uint8Array(await(await fetch(resource.dataUrl)).arrayBuffer())],[1,2,3,4,5]);assert.deepEqual([...new Uint8Array(await(await fetch(resource.codeUrl)).arrayBuffer())],[6,7]);assert.equal(calls.a,1);assert.equal(calls.b,2);assert.equal(calls.c,1);assert.ok(peak<=2);}finally{resource.dispose();}
});
test('abort stops queued resource downloads',async()=>{
 const controller=new AbortController();let calls=0;
 const task=loadGameResources({parts:[{url:'a',bytes:1},{url:'b',bytes:1}],code:{url:'wasm',bytes:1},framework:{url:'framework',bytes:1},concurrency:1,retryDelay:0,signal:controller.signal,fetchImpl:async(_url,{signal})=>{calls++;controller.abort();signal.throwIfAborted();}});
 await assert.rejects(task,{name:'AbortError'});assert.equal(calls,1);
});
test('a stalled connection times out and retries a bounded number of times',async()=>{
 let calls=0;
 await assert.rejects(loadGameResources({parts:[{url:'stalled',bytes:1}],code:{url:'wasm',bytes:1},framework:{url:'framework',bytes:1},concurrency:1,retryDelay:0,idleTimeout:15,fetchImpl:(_url,{signal})=>{calls++;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}}),/资源连接超时/);
 assert.equal(calls,3);
});
test('failed primary uses the fixed-revision fallback, and later files prefer the working route',async()=>{
 const calls=[];const fetchImpl=async url=>{calls.push(url);if(url==='a')throw Error('primary disconnected');return new Response(new Uint8Array([9]));};
 const resources=await loadGameResources({parts:[{url:'a',bytes:1},{url:'b',bytes:1}],code:{url:'wasm',bytes:1},framework:{url:'framework',bytes:1},concurrency:1,retryDelay:0,fallbackBase:'https://example.invalid/fixed-revision/',fetchImpl});
 try{assert.deepEqual(calls,['a','https://example.invalid/fixed-revision/a','https://example.invalid/fixed-revision/b','https://example.invalid/fixed-revision/wasm','https://example.invalid/fixed-revision/framework']);assert.deepEqual([...new Uint8Array(await(await fetch(resources.dataUrl)).arrayBuffer())],[9,9]);}finally{resources.dispose();}
});
