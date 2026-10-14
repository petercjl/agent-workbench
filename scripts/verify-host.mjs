import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {targetRoot,sha,packageRoot,fresh} from '../src/environment.mjs';
const args=process.argv.slice(2),install=args.includes('--install'),entry=args.includes('--entry')?args[args.indexOf('--entry')+1]:path.join(packageRoot,'bin/agent-workbench.mjs');
const root=targetRoot(),original=path.join(os.homedir(),'.codex');
const protect=()=>Object.fromEntries([original,root].flatMap(home=>['AGENTS.md','auth.json','config.toml'].map(name=>path.join(home,name))).filter(p=>fs.existsSync(p)).map(p=>[p,sha(fs.readFileSync(p))]));
const before=protect();let result;
if(install){const run=spawnSync(process.execPath,[entry,'install','--yes'],{encoding:'utf8',timeout:60000});if(run.status!==0)throw Error(run.stdout);result=JSON.parse(run.stdout);}
const after=protect();const preserved=Object.entries(before).every(([p,h])=>after[p]===h);
let cli;
if(process.platform==='darwin')cli='/Applications/codex-own.app/Contents/Resources/codex-own-cli';
else{
 const resources=path.join(process.env.LOCALAPPDATA,'Programs','codex-own','current','resources');
 const manifest=JSON.parse(fs.readFileSync(path.join(resources,'codex-own-runtime.json'),'utf8'));cli=path.join(resources,manifest.cli);
}
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'workbench-discovery-'));const run=spawnSync(cli,['debug','prompt-input','work environment discovery'],{cwd:scratch,env:{...process.env,CODEX_HOME:root},encoding:'utf8',timeout:60000,maxBuffer:20*1024*1024});
const discovered=['agent-workbench','portable-skill-creator','cross-agent-npm-package-development','visual-project-planner','skill-forward-test'].map(name=>({name,found:run.stdout.includes(name)}));
const report={platform:process.platform,installed:install,version:result?.version,preserved,root,discoveryExit:run.status,discovered,baseCreatorAdvertised:/name: skill-creator|\bskill-creator:/.test(run.stdout),privateAuthAndConfigUnchanged:preserved};
fs.rmSync(scratch,{recursive:true,force:true});
if(args.includes('--out'))fresh(args[args.indexOf('--out')+1],JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(!preserved||run.status!==0||discovered.some(x=>!x.found))process.exitCode=1;
