import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({
  base:'./',
  publicDir:'public-recruit',
  plugins:[{
    name:'portfolio-shared-media-preview',
    configureServer(server){
      server.middlewares.use((req,res,next)=>{
        let pathname;
        try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return next();}
        if(!/^\/(art|media|licenses)\//.test(pathname)&&pathname!=='/mark.svg')return next();
        const local=path.resolve(root,'public-recruit','.'+pathname);
        if(fs.existsSync(local))return next();
        res.writeHead(302,{Location:'https://chengzy0424.github.io/czy'+pathname});res.end();
      });
    }
  }],
  build:{
    outDir:'release-lab',target:'es2022',
    rollupOptions:{
      input:{main:path.join(root,'index.html'),exhibition:path.join(root,'exhibition.html')},
      output:{manualChunks:{three:['three']}}
    }
  }
});
