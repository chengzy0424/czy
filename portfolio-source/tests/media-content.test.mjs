import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {games,gameMedia,films} from '../src/portfolio.js';
import {CARD_SPECS} from '../src/space-path.js';
import catalog from '../src/stream-catalog.json' with {type:'json'};
import startup from '../src/stream-startup.json' with {type:'json'};

test('all portfolio entry points include six games and the replaced film collections',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.equal(Object.keys(games).length,6);
 assert.equal(Object.values(films).filter(f=>f.group==='ae').length,6);
 assert.equal(Object.values(films).filter(f=>f.group==='aigc').length,3);
 for(const [id,g] of Object.entries(games)){
  assert.ok(html.includes(`data-detail="${id}"`),id+' missing static entry');
  assert.ok(html.includes(g.title)&&html.includes(g.subtitle));
  assert.equal(CARD_SPECS.find(c=>c.id===id)?.titleZh,g.subtitle);
 }
 for(const id of Object.keys(films))assert.ok(html.includes(`data-film="${id}"`));
 assert.doesNotMatch(html,/ARPG 处于计划阶段|尚未开始/);
});

test('every new film and game has matching playable manifests, duration and init metadata',()=>{
 for(const id of [...Object.keys(films),'goose','echo','ash']){
  const item=catalog[id];assert.ok(item?.fallback,id+' missing compatibility video');
  assert.match(item.path,/stream-v2-20261106/);
  const master=startup[item.path]?.data;assert.ok(master?.includes('#EXTM3U'));
  const declared=(films[id]||gameMedia[id]).duration.split(':').map(Number);
  for(const level of item.levels){
   assert.ok(Math.abs(level.seconds-declared[0]*60-declared[1])<1,id+' wrong duration');
   assert.ok(master.includes(level.level+'/index.m3u8'));
   const prefix=item.path.replace('master.m3u8',level.level+'/');
   const playlist=startup[prefix+'index.m3u8']?.data;
   assert.ok(playlist?.includes('#EXT-X-ENDLIST'),id+' incomplete playlist');
   assert.equal((playlist.match(/#EXTINF/g)||[]).length,level.parts);
   assert.ok(startup[prefix+'init.mp4']?.binary);
  }
 }
});
