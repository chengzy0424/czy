import test from 'node:test';import assert from 'node:assert/strict';
import {repositoryMediaURL} from '../src/stream-player.js';
const page='https://chengzy0424.github.io/czy/?inspect=1#works';
test('a relative HLS manifest resolves on published Pages before a route retry',()=>{
 assert.equal(repositoryMediaURL('./media/stream-v1/tower/master.m3u8',page),'https://chengzy0424.github.io/czy/media/stream-v1/tower/master.m3u8');
 assert.equal(repositoryMediaURL('./media/stream-v1/tower/master.m3u8',page,true),'https://raw.githubusercontent.com/chengzy0424/czy/main/media/stream-v1/tower/master.m3u8');
});
test('a fragment requested from the repository fallback can return to Pages',()=>{
 assert.equal(repositoryMediaURL('https://raw.githubusercontent.com/chengzy0424/czy/main/media/stream-v1/town/low/part-003.m4s',page),'https://chengzy0424.github.io/czy/media/stream-v1/town/low/part-003.m4s');
});
test('local previews and unrelated assets never route to the public repository',()=>{
 assert.equal(repositoryMediaURL('./media/stream-v1/arc/master.m3u8','http://127.0.0.1:4181/',true),'http://127.0.0.1:4181/media/stream-v1/arc/master.m3u8');
 assert.equal(repositoryMediaURL('./art/town-960.webp',page,true),'https://chengzy0424.github.io/czy/art/town-960.webp');
});
