import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const packageRoot=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const pkg=JSON.parse(fs.readFileSync(path.join(packageRoot,'package.json'),'utf8'));
export const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
export class Failure extends Error {constructor(code,message,details={}){super(message);this.code=code;this.details=details;}}
export const readJSON=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export function fresh(p,data){if(fs.existsSync(p))throw new Failure('TARGET_EXISTS',`Target already exists: ${p}`);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,data,{flag:'wx',mode:0o600});}
export function files(root){const result=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isSymbolicLink())throw new Failure('SYMLINK_SOURCE','Skill snapshots must contain real files.');if(e.isDirectory())walk(p);else if(e.isFile())result.push(p);}}walk(root);return result.sort();}
export function targetRoot(flags={},platform=process.platform,home=os.homedir(),local=process.env.LOCALAPPDATA){
 if(flags.agent&&flags.agent!=='codex-own')throw new Failure('UNKNOWN_TARGET','Only codex-own is a receiving target. Original Codex is read-only.');
 if(!['darwin','win32'].includes(platform)&&!flags.home)throw new Failure('UNSUPPORTED_PLATFORM','This receiver supports macOS and Windows.');
 const root=path.resolve(flags.home|| (platform==='win32'?path.join(local||path.join(home,'AppData','Local'),'codex-own-independent','core'):path.join(home,'Library','Application Support','codex-own-independent','core')));
 const forbidden=[path.join(home,'.codex'),path.join(home,'.agents')].map(p=>path.resolve(p));
 let ancestor=root,tail=[];while(!fs.existsSync(ancestor)){tail.unshift(path.basename(ancestor));ancestor=path.dirname(ancestor);}
 const resolved=path.join(fs.realpathSync(ancestor),...tail);
 const normalize=p=>process.platform==='win32'?p.toLowerCase():p;
 if(forbidden.some(p=>[root,resolved].some(candidate=>normalize(candidate)===normalize(p)||normalize(candidate).startsWith(normalize(p+path.sep)))))throw new Failure('ORIGINAL_PROTECTED','Refusing to write original Codex or shared Agent directories.');
 if(fs.existsSync(root)&&fs.lstatSync(root).isSymbolicLink())throw new Failure('SYMLINK_TARGET','Receiving home must be a real directory.');
 return root;
}
export function safePath(root,relative){
 if(path.isAbsolute(relative)||relative.split(/[\\/]/).includes('..'))throw new Failure('INVALID_PATH','Invalid relative path.');
 const target=path.join(root,relative);let current=root;
 for(const part of relative.split(/[\\/]/)){current=path.join(current,part);let st;try{st=fs.lstatSync(current);}catch(e){if(e.code!=='ENOENT')throw e;}if(st?.isSymbolicLink())throw new Failure('SYMLINK_TARGET',`Refusing managed symlink: ${current}`);}
 return target;
}
const statePath=root=>safePath(root,'.agent-workbench/state.json');
export function state(root){const p=statePath(root);return fs.existsSync(p)?readJSON(p):null;}
function actual(root,rel){const p=safePath(root,rel);if(!fs.existsSync(p))return null;const st=fs.statSync(p);if(!st.isFile())throw new Failure('INVALID_TARGET',`Expected regular file: ${rel}`);return {sha256:sha(fs.readFileSync(p)),mode:st.mode&0o777,size:st.size};}
export function bundled(){
 const result=new Map([['AGENTS.md',fs.readFileSync(path.join(packageRoot,'profiles','AGENTS.md'))]]);
 for(const p of files(path.join(packageRoot,'skills'))){const rel=path.relative(packageRoot,p).split(path.sep).join('/');result.set(rel,fs.readFileSync(p));}
 const manifest=readJSON(path.join(packageRoot,'profiles','source-manifest.json'));
 for(const f of manifest.files){const p=path.join(packageRoot,f.path);if(!fs.existsSync(p)||sha(fs.readFileSync(p))!==f.sha256)throw new Failure('SOURCE_INTEGRITY','Bundled snapshot hash mismatch.',{path:f.path});}
 return result;
}
export function preview(root,desired=bundled(),{adopt=false}={}){
 const old=state(root),changes=[],conflicts=[],preserved=[];
 for(const [rel,data] of desired){const now=actual(root,rel),managed=old?.files[rel];
  if(managed&&now?.sha256!==managed.sha256){
   if(rel.endsWith('/agents/openai.yaml')&&now){desired.set(rel,fs.readFileSync(safePath(root,rel)));preserved.push(rel);continue;}
   conflicts.push({path:rel,reason:'LOCAL_EDIT'});continue;
  }
  if(!managed&&now&&!adopt){conflicts.push({path:rel,reason:'UNMANAGED_TARGET'});continue;}
  if(now?.sha256!==sha(data))changes.push({path:rel,action:now?'replace':'create',before:now,after:sha(data)});
 }
 for(const rel of Object.keys(old?.files||{}))if(!desired.has(rel)){
  const now=actual(root,rel);if(now?.sha256!==old.files[rel].sha256)conflicts.push({path:rel,reason:'LOCAL_EDIT'});
  else changes.push({path:rel,action:'remove',before:now,after:null});
 }
 return {ok:conflicts.length===0,root,version:pkg.version,changes,conflicts,preserved,requiresRestart:changes.length>0};
}
function put(root,rel,data,mode=0o600){const p=safePath(root,rel);fs.mkdirSync(path.dirname(p),{recursive:true});const temp=p+'.workbench-'+crypto.randomUUID();fresh(temp,data);
 try{fs.renameSync(temp,p);}catch(e){if(!['EPERM','EACCES','EBUSY'].includes(e.code)){fs.rmSync(temp,{force:true});throw e;}
  // Caller has already backed up and journaled the existing file. Some Windows hosts lock renames.
  safePath(root,rel);fs.writeFileSync(p,data,{mode});fs.rmSync(temp,{force:true});
 }fs.chmodSync(p,mode);
}
export function install(root,{yes=false,adopt=false,desired=bundled(),components}={}){
 const plan=preview(root,desired,{adopt});if(!yes)return {...plan,dryRun:true};
 if(!plan.ok)throw new Failure('INSTALL_CONFLICT','User files or local edits require reconciliation; no changes applied.',{conflicts:plan.conflicts});
 const old=state(root);
 if(!plan.changes.length&&old?.version===pkg.version&&(!components||JSON.stringify(components)===JSON.stringify(old.components)))return {...plan,changed:false};
 fs.mkdirSync(root,{recursive:true});const manager=safePath(root,'.agent-workbench');fs.mkdirSync(manager,{recursive:true});const lock=safePath(root,'.agent-workbench/lock.json');
 try{fresh(lock,JSON.stringify({pid:process.pid,started:new Date().toISOString()}));}catch(e){if(e.code==='TARGET_EXISTS')throw new Failure('ENVIRONMENT_LOCKED','Another operation owns the environment lock.');throw e;}
 const id=crypto.randomUUID(),txRel=`.agent-workbench/backups/${id}`,tx=safePath(root,txRel);fs.mkdirSync(tx,{recursive:true});
 const journal={id,version:pkg.version,root,changes:plan.changes,previous:old,created:new Date().toISOString()};
 try{
  if(old)fresh(path.join(tx,'state-before.json'),fs.readFileSync(statePath(root)));
  for(const c of plan.changes)if(c.before){const src=safePath(root,c.path);if(sha(fs.readFileSync(src))!==c.before.sha256)throw new Failure('TARGET_CHANGED','File changed after preflight.');fresh(path.join(tx,'files',c.path),fs.readFileSync(src));}
  fresh(path.join(tx,'journal.json'),JSON.stringify(journal,null,2));
  const applied=[];
  try{
   for(const c of plan.changes){applied.push(c);if(c.action==='remove')fs.unlinkSync(safePath(root,c.path));else put(root,c.path,desired.get(c.path),c.before?.mode||0o600);}
   const next={schema_version:1,package:pkg.name,version:pkg.version,transaction:id,previousTransaction:old?.transaction||null,files:{},components:components||old?.components||[],installedAt:new Date().toISOString()};
   for(const [rel] of desired)next.files[rel]=actual(root,rel);
   for(const [rel,data] of desired)if(next.files[rel]?.sha256!==sha(data))throw new Failure('VERIFY_FAILED','Installed file hash mismatch.',{path:rel});
   put(root,'.agent-workbench/state.json',JSON.stringify(next,null,2));
   return {...plan,changed:true,backup:tx,transaction:id,components:next.components};
  }catch(e){
   const failed=[];for(const c of applied.reverse())try{if(c.before)put(root,c.path,fs.readFileSync(path.join(tx,'files',c.path)),c.before.mode);else fs.rmSync(safePath(root,c.path),{force:true});}catch(err){failed.push({path:c.path,error:err.code});}
   try{if(old)put(root,'.agent-workbench/state.json',fs.readFileSync(path.join(tx,'state-before.json')));else fs.rmSync(statePath(root),{force:true});}catch(err){failed.push({path:'.agent-workbench/state.json',error:err.code});}
   if(failed.length)throw new Failure('RECOVERY_REQUIRED','Automatic recovery was incomplete. Preserve the backup.',{backup:tx,failed});throw e;
  }
 }finally{fs.rmSync(lock,{force:true});}
}
export function status(root){const s=state(root);const edits=[];for(const [rel,meta] of Object.entries(s?.files||{}))if(actual(root,rel)?.sha256!==meta.sha256)edits.push(rel);return {ok:edits.length===0,root,installed:!!s,version:s?.version||null,packageVersion:pkg.version,edited:edits,components:s?.components||[],transaction:s?.transaction||null};}
export function rollback(root,{yes=false}={}){
 const s=state(root);if(!s)throw new Failure('NOT_INSTALLED','No managed environment exists.');const current=status(root);if(!current.ok)throw new Failure('LOCAL_EDIT','Reconcile local edits before rollback.',{edited:current.edited});
 const tx=safePath(root,`.agent-workbench/backups/${s.transaction}`),j=readJSON(path.join(tx,'journal.json'));
 if(!yes)return {ok:true,dryRun:true,transaction:s.transaction,restoreVersion:j.previous?.version||null};
 const desired=new Map();for(const rel of Object.keys(j.previous?.files||{}))desired.set(rel,fs.readFileSync(safePath(root,rel)));
 for(const c of j.changes){if(c.before)desired.set(c.path,fs.readFileSync(path.join(tx,'files',c.path)));else desired.delete(c.path);}
 const restored=install(root,{yes:true,desired,components:j.previous?.components||[]});
 // Rollback is itself journaled. Keep an ownership receipt even when restoring an unmanaged baseline.
 const rs=state(root);rs.version=j.previous?.version||'restored-baseline';put(root,'.agent-workbench/state.json',JSON.stringify(rs,null,2));
 return {...restored,rolledBack:s.transaction,restoredVersion:rs.version};
}
