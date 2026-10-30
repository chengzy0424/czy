import { defineConfig } from 'vite';
import fs from 'node:fs';
import {games,films} from './src/portfolio.js';
const publicRoot=new URL('./public/',import.meta.url);
const files=['mark.svg',...Object.keys(games).map(id=>'media/'+id+'-demo.mp4'),...Object.keys(films).flatMap(id=>['media/'+id+'-720.mp4','media/'+id+'-1080.mp4']),...[...Object.keys(games),...Object.keys(films)].flatMap(id=>[480,960,1440].map(width=>'art/'+id+'-'+width+'.webp'))];
const allowed=new Set(files);
export default defineConfig({
 base:'./',publicDir:false,
 plugins:[{
  name:'portfolio-public-allowlist',
  configureServer(server){
   server.middlewares.use((req,res,next)=>{
    let file;try{file=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);}catch{return next();}
    if(!allowed.has(file)||!['GET','HEAD'].includes(req.method))return next();
    const source=new URL(file,publicRoot);if(!fs.existsSync(source))return next();
    const {size}=fs.statSync(source);let start=0,end=size-1;
    res.setHeader('Content-Type',file.endsWith('.mp4')?'video/mp4':file.endsWith('.webp')?'image/webp':'image/svg+xml');
    res.setHeader('Accept-Ranges','bytes');
    if(req.headers.range){
     const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
     if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end();}
     if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end);}
     else start=Math.max(0,size-Number(match[2]));
     if(start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end();}
     res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);
    }
    res.setHeader('Content-Length',end-start+1);
    if(req.method==='HEAD')return res.end();
    const stream=fs.createReadStream(source,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
   });
  },
  closeBundle(){
   const outRoot=new URL('./release-oct30/',import.meta.url);
   for(const file of files){const from=new URL(file,publicRoot),to=new URL(file,outRoot);fs.mkdirSync(new URL('.',to),{recursive:true});fs.copyFileSync(from,to);}
  }
 }],
 build:{outDir:'release-oct30',target:'es2022',rollupOptions:{output:{manualChunks:{three:['three']}}}}
});
