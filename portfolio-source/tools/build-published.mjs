import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
for(const entry of ['art','media','licenses','mark.svg']){const from=path.resolve(root,'..',entry);if(fs.existsSync(from))fs.cpSync(from,path.join(root,'public',entry),{recursive:true});}
execFileSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build'],{cwd:root,stdio:'inherit'});
