import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url)),repo=path.resolve(process.env.TEST_MEDIA_ROOT||path.resolve(root,'..'));
// Full checkouts use their own media. A partial checkout may explicitly opt in to
// the unchanged public media; reports must state this is local code + public media.
const origin=process.env.TEST_MEDIA_ORIGIN;
const server=await createServer({configFile:false,root,publicDir:false,
 server:{host:'127.0.0.1',port:4186,strictPort:true,
  proxy:origin?Object.fromEntries(['/media/','/art/','/mark.svg'].map(p=>[p,{target:origin,changeOrigin:true}])):undefined},
 plugins:origin?[]:[{name:'test-repository-media',configureServer(server){
  server.middlewares.use((req,res,next)=>{
   const url=new URL(req.url,'http://localhost');
   if(!/^\/(media\/|art\/|mark\.svg$)/.test(url.pathname))return next();
   let name;try{name=decodeURIComponent(url.pathname);}catch{return next();}
   const file=path.resolve(repo,'.'+name);
   if(!file.startsWith(repo+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return next();
   const size=fs.statSync(file).size;let start=0,end=size-1;
   res.setHeader('Content-Type',file.endsWith('.m3u8')?'application/vnd.apple.mpegurl':/\.(m4s|mp4)$/.test(file)?'video/mp4':file.endsWith('.webp')?'image/webp':'image/svg+xml');
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
   const stream=fs.createReadStream(file,{start,end});res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);
  });
 }}]
});
await server.listen();server.printUrls();
