import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Failure,packageRoot,pkg,readJSON,files,bundled,state,safePath,fresh,sha} from './environment.mjs';
export const registry=()=>readJSON(path.join(packageRoot,'profiles','components.json')).components;
export function npmRun(args,{timeout=300000}={}){
 const exe=path.dirname(process.execPath);
 const candidates=[process.env.AGENT_WORKBENCH_NPM_CLI,path.join(exe,'node_modules/npm/bin/npm-cli.js'),path.join(exe,'../lib/node_modules/npm/bin/npm-cli.js'),path.join(exe,'../node_modules/npm/bin/npm-cli.js')].filter(Boolean);
 const cli=candidates.find(p=>fs.existsSync(p));
 const r=spawnSync(cli?process.execPath:'npm',cli?[cli,...args]:args,{encoding:'utf8',timeout,windowsHide:true,maxBuffer:10*1024*1024});
 if(r.error||r.status!==0)throw new Failure('NPM_FAILED','npm operation failed. Check network, npm installation and registry access.',{status:r.status,reason:r.error?.code||null});
 return r.stdout;
}
export function latest(name){if(!/^@petercjl\/[a-z0-9-]+$/.test(name))throw new Failure('INVALID_PACKAGE','Only declared personal-scope components are accepted.');const version=JSON.parse(npmRun(['view',name,'dist-tags.latest','--json','--registry=https://registry.npmjs.org/'],{timeout:30000}));if(!/^\d+\.\d+\.\d+$/.test(version))throw new Failure('INVALID_VERSION','Expected a stable registry version.');return version;}
export function withInstalledComponents(root,desired=bundled()){
 const s=state(root);
 for(const c of s?.components||[])for(const rel of c.files){if(desired.has(rel))throw new Failure('SKILL_COLLISION','Component collides with a bundled Skill.',{path:rel});desired.set(rel,fs.readFileSync(safePath(root,rel)));}
 return desired;
}
export function prepareComponents(root,names,{refresh=false}={}){
 const old=state(root),selected=new Set(names);if(refresh)for(const c of old?.components||[])selected.add(c.package);
 const records=registry();for(const name of selected)if(!records.some(c=>c.package===name))throw new Failure('UNKNOWN_COMPONENT','Component is not registered.',{package:name});
 const desired=bundled(),components=[];
 for(const c of old?.components||[])if(!selected.has(c.package)){components.push(c);for(const rel of c.files)desired.set(rel,fs.readFileSync(safePath(root,rel)));}
 if(!selected.size)return {desired,components};
 const versions=[...selected].map(name=>({name,version:latest(name)}));
 const stage=safePath(root,`.agent-workbench/toolsets/${crypto.randomUUID()}`);fs.mkdirSync(stage,{recursive:true});
 process.stderr.write(`Downloading ${versions.length} component package(s) from npm…\n`);
 npmRun(['install','--prefix',stage,'--ignore-scripts','--no-audit','--no-fund','--registry=https://registry.npmjs.org/',...versions.map(v=>`${v.name}@${v.version}`)]);
 for(const v of versions){const item=records.find(c=>c.package===v.name),componentRoot=path.join(stage,'node_modules',...v.name.split('/')),meta=readJSON(path.join(componentRoot,'package.json'));
  const bin=typeof meta.bin==='string'?meta.bin:Object.values(meta.bin||{})[0];if(!bin)throw new Failure('NO_COMPONENT_CLI','Component has no declared CLI.');
  const entry=path.resolve(componentRoot,bin);if(!entry.startsWith(componentRoot+path.sep))throw new Failure('INVALID_COMPONENT','Component CLI escapes its package.');
  const installed=[];
  for(const name of item.skills){
   let source;for(const args of [['skill','source','--name',name,'--json'],['skill','source','--json']]){
    const r=spawnSync(process.execPath,[entry,...args],{encoding:'utf8',timeout:20000,windowsHide:true});
    if(r.status!==0)continue;try{const info=JSON.parse(r.stdout);source=info.source||info.skills?.find(x=>x.name===name)?.source;if(source)break;}catch{}
   }
   if(!source)throw new Failure('COMPONENT_CONTRACT','Component must expose its canonical Skill source.',{package:v.name,skill:name});
   source=fs.realpathSync(source);if(!source.startsWith(fs.realpathSync(componentRoot)+path.sep))throw new Failure('INVALID_COMPONENT_SOURCE','Canonical source must be inside its installed npm component.');
   const skill=fs.readFileSync(path.join(source,'SKILL.md'),'utf8');if(!new RegExp(`^name:\\s*["']?${name}["']?\\s*$`,'m').test(skill))throw new Failure('SKILL_IDENTITY','Returned source does not match requested Skill.');
   for(const file of files(source)){const rel=`skills/${name}/`+path.relative(source,file).split(path.sep).join('/');if(desired.has(rel))throw new Failure('SKILL_COLLISION','Two components own the same Skill.',{path:rel});desired.set(rel,fs.readFileSync(file));installed.push(rel);}
  }
  components.push({package:v.name,version:v.version,source:componentRoot,files:installed});
 }
 return {desired,components};
}
export function inventory(sourceHome=path.join(os.homedir(),'.codex')){
 const roots=[path.join(sourceHome,'skills'),path.join(os.homedir(),'.agents','skills')];const entries=[];
 for(const root of roots)if(fs.existsSync(root))for(const e of fs.readdirSync(root,{withFileTypes:true})){
  if(e.name.startsWith('.')||/backup|deprecated|\.pre-/.test(e.name))continue;
  const p=path.join(root,e.name);if(!fs.existsSync(path.join(p,'SKILL.md')))continue;
  const real=fs.realpathSync(p);const component=registry().find(c=>c.skills.includes(e.name));entries.push({name:e.name,root:root===roots[0]?'codex':'shared-agents',linked:e.isSymbolicLink(),distribution:component?'npm-component':'review-required',package:component?.package||null,source:real});
 }
 return {ok:true,sourceHome,entries,warning:'Inventory is local diagnostic data. It is not automatically included in public packages.'};
}
export function privacyFindings(root){const findings=[];const patterns=[['absolute-user-path',/\/(?:Users|home)\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\[^\\\s]+\\/],['credential-value',/(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----)/],['credential-file',/(?:^|\/)(?:auth\.json|\.env|config\.toml|state_\d+\.sqlite|.*\.jsonl)$/]];
 for(const f of files(root)){if(fs.statSync(f).size>2*1024*1024){findings.push({file:path.relative(root,f),kind:'large-file-review'});continue;}const rel=path.relative(root,f).split(path.sep).join('/'),text=fs.readFileSync(f,'utf8');for(const [kind,re] of patterns)if(re.test(kind==='credential-file'?rel:text))findings.push({file:rel,kind});}
 return findings;
}
export function exportSnapshot(sourceHome,out){
 if(!out)throw new Failure('OUTPUT_REQUIRED','Provide a new --out directory for a reviewed export.');out=path.resolve(out);if(fs.existsSync(out))throw new Failure('TARGET_EXISTS','Export output must be a new directory.');
 const baseline=readJSON(path.join(packageRoot,'profiles','source-manifest.json')),names=baseline.skills,sourceRoot=path.resolve(sourceHome);
 if(out===sourceRoot||out.startsWith(sourceRoot+path.sep)||sourceRoot.startsWith(out+path.sep))throw new Failure('INVALID_OUTPUT','Export must be separate from the source home.');
 fs.mkdirSync(out,{recursive:true});const manifest=[],payload=new Map(),originalHashes=new Map();
 for(const name of names){const source=path.join(sourceRoot,'skills',name);if(!fs.existsSync(path.join(source,'SKILL.md')))throw new Failure('SOURCE_MISSING','Allowlisted source Skill is missing.',{skill:name});
  for(const file of files(fs.realpathSync(source))){const rel=path.relative(fs.realpathSync(source),file).split(path.sep).join('/');if(/(^|\/)(__pycache__|test_[^/]+|[^/]+\.test\.mjs|\.DS_Store)(\/|$)|\.pyc$/.test(rel))continue;const key=`skills/${name}/${rel}`,data=fs.readFileSync(file);payload.set(key,data);originalHashes.set(key,sha(data));}
 }
 for(const rel of baseline.overrides||[])payload.set(rel,fs.readFileSync(path.join(packageRoot,rel)));
 for(const [rel,data] of payload){fresh(path.join(out,rel),data);manifest.push({path:rel,sha256:sha(data),...(originalHashes.has(rel)?{original_sha256:originalHashes.get(rel)}:{})});}
 const findings=privacyFindings(out);fresh(path.join(out,'source-manifest.json'),JSON.stringify({schema_version:1,origin:'user-approved original Codex work methods',mode:'reviewed-release-snapshot',skills:names,overrides:baseline.overrides||[],files:manifest},null,2));
 return {ok:findings.length===0,out,files:manifest.length,findings,next:'Review and promote the exported snapshot into the source repository, run checks, then publish through GitHub Actions. Global rules require explicit human-readable extraction; raw AGENTS.md is never automatically exported.'};
}
