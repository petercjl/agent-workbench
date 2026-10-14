import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {packageRoot,pkg,Failure,targetRoot,readJSON,bundled,preview,install,status,rollback,state,safePath} from './environment.mjs';
import {registry,npmRun,latest,withInstalledComponents,prepareComponents,inventory,exportSnapshot} from './tools.mjs';
const help=`agent-workbench — original Codex publishes; codex-own receives
  version | capabilities --json
  inventory [--source-home PATH] --json
  export --out NEW_DIRECTORY [--source-home PATH] --json
  install [--yes] [--adopt] [--agent codex-own] [--home PATH]
  status | doctor --json | rollback [--yes]
  skill source [--name NAME] --json
  skill status|install|update [--yes] [--agent codex-own]
  components list | components install --name @petercjl/PACKAGE [--yes]
  update check | update install [--yes]
Default install is a preview. --yes applies. --adopt backs up existing unmanaged
targets before adopting them; local edits to managed files always stop updates.
No account, API configuration, conversation or original Codex file is migrated.
See docs/receiver.md and docs/publisher.md in the npm package.`;
function parse(argv){const positional=[],flags={};for(let i=0;i<argv.length;i++){const x=argv[i];if(!x.startsWith('--'))positional.push(x);else{const key=x.slice(2);if(['yes','adopt','json','refresh-components','help'].includes(key))flags[key]=true;else{if(!argv[i+1]||argv[i+1].startsWith('--'))throw new Failure('ARGUMENT_REQUIRED',`Value required for ${x}`);flags[key]=argv[++i];}}}return {positional,flags};}
const output=v=>process.stdout.write(JSON.stringify(v,null,2)+'\n');
export async function main(argv){try{const {positional:[command,sub],flags}=parse(argv);
 if(!command||['help','--help','-h'].includes(command)){process.stdout.write(help+'\n');return;}
 if(command==='version'){output({ok:true,name:pkg.name,version:pkg.version});return;}
 if(command==='capabilities'){output(readJSON(path.join(packageRoot,'capabilities.json')));return;}
 if(command==='inventory'){output(inventory(flags['source-home']));return;}
 if(command==='export'){output(exportSnapshot(flags['source-home']||path.join(os.homedir(),'.codex'),flags.out));return;}
 if(command==='skill'&&sub==='source'){
  const skills=fs.readdirSync(path.join(packageRoot,'skills')).map(name=>({name,source:path.join(packageRoot,'skills',name)}));
  if(flags.name){const skill=skills.find(s=>s.name===flags.name);if(!skill)throw new Failure('UNKNOWN_SKILL','Skill is not bundled.');output({ok:true,version:pkg.version,...skill});}else output({ok:true,version:pkg.version,source:path.join(packageRoot,'skills','agent-workbench'),skills});return;
 }
 if(command==='components'&&sub==='list'){output({ok:true,components:registry(),automatic:false});return;}
 const root=targetRoot(flags);
 if(command==='status'||command==='skill'&&sub==='status'){output(status(root));return;}
 if(command==='doctor'){
  bundled();const current=status(root),warnings=[];
  for(const name of ['skill-creator'])if(!fs.existsSync(path.join(root,'skills',name,'SKILL.md'))&&!fs.existsSync(path.join(root,'skills','.system',name,'SKILL.md')))warnings.push({code:'NESTED_SKILL_REQUIRED',skill:name,affects:'portable-skill-creator',message:'Resolve the host-advertised base creator before Skill authoring. It is not redistributed by this package.'});
  const python=spawnSync(process.platform==='win32'?'python':'python3',['--version'],{encoding:'utf8',windowsHide:true,timeout:5000});if(python.status!==0)warnings.push({code:'PYTHON_MISSING',affects:'portable Skill validation scripts'});
  output({...current,ok:current.ok,node:process.versions.node,platform:process.platform,warnings,nativeCapabilities:'image generation, browser automation and service accounts require separate host adapters/authentication',discovery:'Restart codex-own or create a new conversation after installing.'});return;
 }
 if(command==='install'||command==='skill'&&['install','update'].includes(sub)){
  const prepared=flags['refresh-components']&&flags.yes?prepareComponents(root,[],{refresh:true}):{desired:withInstalledComponents(root),components:state(root)?.components};
  output(install(root,{yes:!!flags.yes,adopt:!!flags.adopt,...prepared}));return;
 }
 if(command==='rollback'){output(rollback(root,{yes:!!flags.yes}));return;}
 if(command==='components'&&sub==='install'){
  if(!registry().some(c=>c.package===flags.name))throw new Failure('UNKNOWN_COMPONENT','Use components list to select a registered npm package.');
  if(!flags.yes){output({ok:true,dryRun:true,package:flags.name,root,action:'Download from npm and deploy canonical Skills with backups. Package lifecycle scripts are disabled.'});return;}
  if(!state(root))throw new Failure('NOT_INSTALLED','Install the baseline before adding components.');
  const prepared=prepareComponents(root,[flags.name]);output(install(root,{yes:true,...prepared}));return;
 }
 if(command==='update'){
  const version=latest(pkg.name),current=status(root),components=[];
  for(const c of current.components){const latestVersion=latest(c.package);components.push({package:c.package,current:c.version,latest:latestVersion,available:c.version!==latestVersion});}
  if(sub==='check'||!flags.yes){output({ok:true,root,current:current.version,manager:pkg.version,latest:version,available:current.version!==version||pkg.version!==version||components.some(c=>c.available),components,dryRun:sub!=='check'});return;}
  if(sub!=='install')throw new Failure('UNKNOWN_COMMAND','Use update check or update install.');
  if(!current.ok)throw new Failure('LOCAL_EDIT','Reconcile local edits before downloading an update.');
  const stage=safePath(root,`.agent-workbench/managers/${crypto.randomUUID()}`);fs.mkdirSync(stage,{recursive:true});process.stderr.write(`Downloading work environment ${version} from npm…\n`);
  npmRun(['install','--prefix',stage,`${pkg.name}@${version}`,'--ignore-scripts','--no-audit','--no-fund','--registry=https://registry.npmjs.org/']);
  const entry=path.join(stage,'node_modules','@petercjl','agent-workbench','bin','agent-workbench.mjs');
  const r=spawnSync(process.execPath,[entry,'install','--home',root,'--yes','--refresh-components'],{encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:10*1024*1024});
  if(r.status!==0)throw new Failure('UPDATE_FAILED','Downloaded package could not apply the update. Existing backups are retained.',{result:r.stdout});
  process.stderr.write(r.stderr||'');process.stdout.write(r.stdout);return;
 }
 throw new Failure('UNKNOWN_COMMAND',help);
 }catch(e){output({ok:false,error:{code:e.code||'UNEXPECTED_ERROR',message:e.message,details:e.details||{}}});process.exitCode=1;}}
