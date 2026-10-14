import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {install,preview,status,state,rollback,targetRoot,packageRoot,bundled} from '../src/environment.mjs';
import {exportSnapshot,privacyFindings,withInstalledComponents,componentEntry} from '../src/tools.mjs';
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'工作环境-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
const desired=v=>new Map([['AGENTS.md',Buffer.from('中文规则 '+v)],['skills/demo/SKILL.md',Buffer.from('demo '+v)]]);
test('OS paths and original/shared directories protected',()=>{
 assert.equal(targetRoot({},'win32','C:\\Users\\sample','C:\\Users\\sample\\AppData\\Local').endsWith(path.join('codex-own-independent','core')),true);
 assert.equal(targetRoot({},'darwin','/home/sample').endsWith(path.join('Library','Application Support','codex-own-independent','core')),true);
 assert.throws(()=>targetRoot({home:path.join(os.homedir(),'.codex','skills')}),{code:'ORIGINAL_PROTECTED'});
 assert.throws(()=>targetRoot({agent:'codex'}),{code:'UNKNOWN_TARGET'});
});
test('fresh, repeat, update, rollback and UTF-8',t=>{
 const root=fixture(t);assert.equal(install(root,{desired:desired('一')}).dryRun,true);assert.equal(fs.existsSync(path.join(root,'AGENTS.md')),false);
 const one=install(root,{yes:true,desired:desired('一')});assert.equal(status(root).ok,true);assert.equal(fs.readFileSync(path.join(root,'AGENTS.md'),'utf8'),'中文规则 一');
 assert.equal(install(root,{yes:true,desired:desired('一')}).changed,false);
 const two=install(root,{yes:true,desired:desired('二')});assert.notEqual(two.transaction,one.transaction);assert.equal(fs.readFileSync(path.join(two.backup,'files/AGENTS.md'),'utf8'),'中文规则 一');
 rollback(root,{yes:true});assert.equal(fs.readFileSync(path.join(root,'AGENTS.md'),'utf8'),'中文规则 一');assert.equal(status(root).ok,true);
});
test('unmanaged target refusal, explicit adoption backs up exact bytes',t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'AGENTS.md'),'my rules');assert.throws(()=>install(root,{yes:true,desired:desired('new')}),{code:'INSTALL_CONFLICT'});
 const result=install(root,{yes:true,adopt:true,desired:desired('new')});assert.equal(fs.readFileSync(path.join(result.backup,'files/AGENTS.md'),'utf8'),'my rules');
 rollback(root,{yes:true});assert.equal(fs.readFileSync(path.join(root,'AGENTS.md'),'utf8'),'my rules');assert.equal(fs.existsSync(path.join(root,'skills/demo/SKILL.md')),false);
});
test('local changes stop update and rollback; private files untouched',t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'auth.json'),'synthetic credential');fs.writeFileSync(path.join(root,'config.toml'),'synthetic config');
 install(root,{yes:true,desired:desired('first')});fs.writeFileSync(path.join(root,'AGENTS.md'),'edited');assert.equal(status(root).ok,false);
 assert.throws(()=>install(root,{yes:true,adopt:true,desired:desired('second')}),{code:'INSTALL_CONFLICT'});assert.throws(()=>rollback(root,{yes:true}),{code:'LOCAL_EDIT'});
 assert.equal(fs.readFileSync(path.join(root,'auth.json'),'utf8'),'synthetic credential');assert.equal(fs.readFileSync(path.join(root,'config.toml'),'utf8'),'synthetic config');
});
test('failure during switch restores earlier files and receipt',t=>{
 const root=fixture(t);install(root,{yes:true,desired:desired('old')});const before=state(root);let calls=0;
 const original=fs.renameSync;t.mock.method(fs,'renameSync',(a,b)=>{if(++calls===2)throw Object.assign(Error('injected'),{code:'EIO'});return original(a,b);});
 assert.throws(()=>install(root,{yes:true,desired:desired('new')}),/injected/);
 assert.deepEqual(state(root),before);assert.equal(fs.readFileSync(path.join(root,'AGENTS.md'),'utf8'),'中文规则 old');assert.equal(status(root).ok,true);
});
test('Windows rename lock fallback preserves complete backup',t=>{
 const root=fixture(t);install(root,{yes:true,desired:desired('old')});const original=fs.renameSync;let once=true;
 t.mock.method(fs,'renameSync',(a,b)=>{if(once){once=false;throw Object.assign(Error('locked'),{code:'EPERM'});}return original(a,b);});
 const r=install(root,{yes:true,desired:desired('new')});assert.equal(status(root).ok,true);assert.equal(fs.readFileSync(path.join(r.backup,'files/AGENTS.md'),'utf8'),'中文规则 old');
});
test('customized host metadata survives, other local edits stop',t=>{
 const root=fixture(t),d=desired('one');d.set('skills/demo/agents/openai.yaml',Buffer.from('display_name: default'));install(root,{yes:true,desired:d});
 fs.writeFileSync(path.join(root,'skills/demo/agents/openai.yaml'),'display_name: customized');const next=desired('two');next.set('skills/demo/agents/openai.yaml',Buffer.from('display_name: new'));
 install(root,{yes:true,desired:next});assert.equal(fs.readFileSync(path.join(root,'skills/demo/agents/openai.yaml'),'utf8'),'display_name: customized');assert.equal(status(root).ok,true);
});
test('symlink target and competing lock are refused',t=>{
 const root=fixture(t);fs.mkdirSync(path.join(root,'.agent-workbench'));fs.writeFileSync(path.join(root,'.agent-workbench/lock.json'),'{}');
 assert.throws(()=>install(root,{yes:true,desired:desired('one')}),{code:'ENVIRONMENT_LOCKED'});
 if(process.platform!=='win32'){fs.symlinkSync('/nonexistent/workbench-target',path.join(root,'AGENTS.md'));assert.throws(()=>preview(root,desired('two')),{code:'SYMLINK_TARGET'});}
});
test('npm package entry, canonical sources, integrity, Unicode output',t=>{
 const root=fixture(t),entry=path.join(packageRoot,'bin/agent-workbench.mjs');const run=args=>spawnSync(process.execPath,[entry,...args],{encoding:'utf8'});
 assert.equal(JSON.parse(run(['version']).stdout).name,'@petercjl/agent-workbench');
 assert.equal(JSON.parse(run(['skill','source','--name','visual-project-planner','--json']).stdout).source,path.join(packageRoot,'skills/visual-project-planner'));
 const r=run(['install','--home',root,'--yes']);assert.equal(r.status,0,r.stdout);assert.equal(JSON.parse(r.stdout).ok,true);assert.equal(bundled().size>60,true);
 const doctor=JSON.parse(run(['doctor','--home',root,'--json']).stdout);assert.equal(doctor.ok,true);assert.equal(doctor.warnings.some(w=>w.code==='NESTED_SKILL_REQUIRED'),true);
 assert.equal(run(['skill','source','--name','unknown']).status,1);assert.match(run(['--help']).stdout,/codex-own/);
});
test('export only allowlist, collision refusal, privacy scanner',t=>{
 const root=fixture(t),source=path.join(root,'producer'),out=path.join(root,'export');fs.mkdirSync(source);fs.cpSync(path.join(packageRoot,'skills'),path.join(source,'skills'),{recursive:true});
 fs.writeFileSync(path.join(source,'auth.json'),'never export');const r=exportSnapshot(source,out);assert.equal(r.ok,true);assert.equal(fs.existsSync(path.join(out,'auth.json')),false);
 assert.throws(()=>exportSnapshot(source,out),{code:'TARGET_EXISTS'});fs.writeFileSync(path.join(out,'private.txt'),'/Users/private-name/company/file');assert.equal(privacyFindings(out).some(f=>f.kind==='absolute-user-path'),true);
});
test('component runtime resolves inside receiver, preserves arguments without shell',t=>{
 const root=fixture(t),source=path.join(root,'.agent-workbench/toolsets/demo/node_modules/@petercjl/npm-release-kit');fs.mkdirSync(source,{recursive:true});
 fs.writeFileSync(path.join(source,'package.json'),JSON.stringify({name:'@petercjl/npm-release-kit',version:'1.0.0',bin:{'npm-release-kit':'cli.cjs'}}));
 fs.writeFileSync(path.join(source,'cli.cjs'),'process.stdout.write(JSON.stringify(process.argv.slice(2)))');
 install(root,{yes:true,desired:desired('first'),components:[{package:'@petercjl/npm-release-kit',version:'1.0.0',source,files:[]}]});
 assert.equal(componentEntry(root,'@petercjl/npm-release-kit'),fs.realpathSync(path.join(source,'cli.cjs')));
 const r=spawnSync(process.execPath,[path.join(packageRoot,'bin/agent-workbench.mjs'),'components','run','--home',root,'--name','@petercjl/npm-release-kit','--','doctor','literal $(not-a-command)','中文'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stdout);assert.deepEqual(JSON.parse(r.stdout),['doctor','literal $(not-a-command)','中文']);
 assert.throws(()=>componentEntry(root,'@petercjl/unknown'),{code:'COMPONENT_NOT_INSTALLED'});
});
