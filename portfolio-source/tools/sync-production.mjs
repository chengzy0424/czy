import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const source=path.resolve(import.meta.dirname,'..'),repo=path.resolve(source,'..'),built=path.join(source,'release-oct30');
const check=process.argv.includes('--check');
const files=['index.html',...fs.readdirSync(path.join(built,'assets'),{withFileTypes:true}).filter(entry=>entry.isFile()&&!entry.name.startsWith('.')).map(entry=>'assets/'+entry.name)];
for(const file of files){
 const from=path.join(built,file),to=path.join(repo,file);
 if(check){
  if(!fs.existsSync(to)||!fs.readFileSync(from).equals(fs.readFileSync(to)))throw new Error(`Production file differs from fresh build: ${file}`);
 }else{fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);}
}
// Build media must remain byte-identical to the repository; never re-encode it.
let mediaCount=0;const digest=createHash('sha256');
function verify(dir){
 for(const entry of fs.readdirSync(path.join(built,dir),{withFileTypes:true})){
  if(entry.name.startsWith('.'))continue;
  const relative=path.posix.join(dir,entry.name);
  if(entry.isDirectory()){verify(relative);continue;}
  const data=fs.readFileSync(path.join(built,relative));
  if(!data.equals(fs.readFileSync(path.join(repo,relative))))throw new Error(`Media mismatch: ${relative}`);
  digest.update(relative+'\0').update(createHash('sha256').update(data).digest());mediaCount++;
 }
}
for(const dir of ['media','art','licenses'])verify(dir);
console.log(JSON.stringify({operation:check?'check':'sync',files,mediaCount,mediaDigest:digest.digest('hex')},null,2));
