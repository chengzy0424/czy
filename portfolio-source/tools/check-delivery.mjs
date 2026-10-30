import fs from 'node:fs';
import path from 'node:path';
import {games,films,gameMedia} from '../src/portfolio.js';
const base=process.argv[2]||'http://127.0.0.1:4175/';
const root=path.resolve(import.meta.dirname,'..','release-oct30');
const media=[...Object.values(gameMedia).flatMap(m=>m.levels.map(l=>l[2])),...Object.keys(films).flatMap(id=>[id+'-720.mp4',id+'-1080.mp4'])];
const checks=[];
const catalog=JSON.parse(fs.readFileSync(new URL('../src/stream-catalog.json',import.meta.url),'utf8'));
const streams=[];
for(const [id,entry] of Object.entries(catalog)){
 const master=await fetch(new URL(entry.path,base));
 if(!master.ok||(await master.text()).indexOf('#EXTM3U')!==0)throw Error('Missing stream '+id);
 for(const level of entry.levels){
  const prefix=entry.path.replace('master.m3u8',level.level+'/');
  const playlist=fs.readFileSync(path.join(root,prefix,'index.m3u8'),'utf8');
  for(const line of playlist.split('\n').filter(s=>s&&!s.startsWith('#'))){if(!fs.existsSync(path.join(root,prefix,line.trim())))throw Error('Missing fragment '+line);}
  const init=fs.readFileSync(path.join(root,prefix,'init.mp4'));
  if(!init.includes(Buffer.from('avc1'))||!init.includes(Buffer.from('mp4a')))throw Error('Expected audio/video init '+id);
  const first=await fetch(new URL(prefix+'part-000.m4s',base));
  if(!first.ok||(await first.arrayBuffer()).byteLength===0)throw Error('First segment failed '+id);
  streams.push({id,level:level.level,firstBytes:level.firstBytes,parts:level.parts});
 }
}
for(const file of media){
 const data=fs.readFileSync(path.join(root,'media',file));let offset=0,moov=-1,mdat=-1;
 while(offset+8<data.length){let size=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);if(size===1)size=Number(data.readBigUInt64BE(offset+8));if(type==='moov')moov=offset;if(type==='mdat')mdat=offset;if(size<8)break;offset+=size;}
 if(moov<0||mdat<0||moov>mdat)throw Error('Not faststart: '+file);
 if(!data.includes(Buffer.from('avc1')))throw Error('Expected H.264: '+file);
 if(!data.includes(Buffer.from('mp4a')))throw Error('Audio track missing: '+file);
 const response=await fetch(new URL('media/'+file,base),{headers:{Range:'bytes=0-2047'}});const bytes=(await response.arrayBuffer()).byteLength;
 if(response.status!==206||bytes!==2048)throw Error('Range request failed: '+file+' '+response.status);
 checks.push({file,bytes:data.length,faststart:true,audio:true,range:response.status});
}
for(const id of [...Object.keys(games),...Object.keys(films)])for(const width of [480,960,1440]){const response=await fetch(new URL(`art/${id}-${width}.webp`,base));if(!response.ok)throw Error('Missing cover '+id);await response.arrayBuffer();}
if(fs.existsSync(path.join(root,'games')))throw Error('Retired game build still in dist');
console.log(JSON.stringify({base,streams,media:checks,covers:27,gameBuildsPresent:false},null,2));
