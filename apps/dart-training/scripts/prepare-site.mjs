import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const source=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const destination=process.argv[2];
if(!destination||!path.isAbsolute(destination))throw new Error('Provide an absolute path to the opened Site checkout.');
const target=path.resolve(destination);
if(target===source||source.startsWith(target+path.sep)||target.startsWith(source+path.sep))throw new Error('Source and Site checkout must be separate.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const baseline=JSON.parse(await readFile(path.join(source,'source-baseline.json'),'utf8'));
const manifest=JSON.parse(await readFile(path.join(target,'.openai/hosting.json'),'utf8'));
if(manifest.project_id!==baseline.siteProjectId)throw new Error('Wrong Site: no files changed.');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
if(git(target,'rev-parse','--show-toplevel')!==target)throw new Error('Use the opened Site Git root.');
if(git(target,'status','--porcelain'))throw new Error('Site checkout has uncommitted changes; no files changed.');
let expected=baseline.files;
try{expected=JSON.parse(await readFile(path.join(target,'.openai/github-source.json'),'utf8')).files;}
catch(error){if(error.code!=='ENOENT')throw error;}
const targetFiles=git(target,'ls-files','-z').split('\0').filter(Boolean);
for(const name of targetFiles){
 if(name==='.openai/github-source.json')continue;
 const wanted=expected[name];
 if(!wanted||hash(await readFile(path.join(target,name)))!==wanted)throw new Error('Site source diverged: '+name+'. Compare and reconcile before publishing. No files changed.');
}
for(const name of Object.keys(expected))if(!targetFiles.includes(name))throw new Error('Site file is missing: '+name+'. No files changed.');
const names=git(source,'ls-files','-z','--','.').split('\0').filter(Boolean);
if(!names.length)throw new Error('No tracked GitHub source files found.');
const entries=[];
for(const name of names){
 if(name.startsWith('dist/')||name.includes('..')||name.startsWith('/'))throw new Error('Unexpected tracked file: '+name);
 const raw=await readFile(path.join(source,name));
 entries.push([name.endsWith('.png.base64')?name.slice(0,-7):name,name.endsWith('.png.base64')?Buffer.from(raw.toString().trim(),'base64'):raw]);
 // Keep base64 sources too: the GitHub build must work after transfer.
 if(name.endsWith('.png.base64'))entries.push([name,raw]);
}
const files=Object.fromEntries(entries.map(([name,bytes])=>[name,hash(bytes)]));
for(const [name,bytes] of entries){const out=path.join(target,name);await mkdir(path.dirname(out),{recursive:true});await writeFile(out,bytes);}
const commit=git(source,'rev-parse','HEAD');
await writeFile(path.join(target,'.openai/github-source.json'),JSON.stringify({repository:'Lars1eighty/HESTENG',directory:'apps/dart-training',commit,files},null,2)+'\n');
console.log('Prepared existing Site source from GitHub '+commit+'. Run tests/build and the Sites packaging workflow; nothing is deployed.');
