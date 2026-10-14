#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { suiteCoherent } from './suite-contract.mjs';

const argv = process.argv.slice(2);
const option = (name) => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
const rootArg = option('--root');
if (!rootArg || !option('--targets')) {
  console.error('Usage: node audit-package.mjs --root REPO --targets agent:os[,agent:os] [--json]');
  process.exit(2);
}
const root = path.resolve(rootArg);
const targets = option('--targets').split(',').map(s => s.trim()).filter(Boolean);
const findings = [];
const add = (id, status, evidence, next) => findings.push({ id, status, evidence, ...(next ? { next } : {}) });
const exists = async p => Boolean(await fs.stat(p).catch(() => null));
const read = async p => fs.readFile(p, 'utf8').catch(() => '');
const json = async p => JSON.parse(await fs.readFile(p, 'utf8'));

let pkg;
try { pkg = await json(path.join(root, 'package.json')); }
catch (e) { console.error(`Cannot read package.json: ${e.message}`); process.exit(2); }
add('package.name', pkg.name?.startsWith('@') ? 'pass' : 'fail', pkg.name || '(missing)', 'Use the requested npm scope and explicit visibility.');
add('package.bin', pkg.bin && Object.keys(pkg.bin).length ? 'pass' : 'fail', pkg.bin || null, 'Declare a stable CLI entry in package.json bin.');

const validTargets = targets.every(t => /^(codex|sealseek):(macos|windows)$/.test(t));
if (!validTargets) { console.error(`Unsupported target list: ${targets.join(',')}`); process.exit(2); }

const possible = [];
for (const container of ['skill', 'skills']) {
  const folder = path.join(root, container);
  for (const entry of await fs.readdir(folder, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory() && await exists(path.join(folder, entry.name, 'SKILL.md'))) possible.push(path.join(folder, entry.name));
  }
}
const suite = await json(path.join(root, 'suite-manifest.json')).catch(() => null);
const registered = suite?.nodes?.map(n => n.skill) || [];
const discovered = possible.map(p => path.basename(p));
const coherent = suiteCoherent(suite, discovered);
add('skill.canonical', possible.length && coherent ? 'pass' : 'fail', possible.map(p => path.relative(root, p)), 'Ship each Skill once and keep suite registry/source identities consistent.');
if (possible.length > 1 || suite) add('suite.registry', suite && coherent ? 'pass' : 'warn', { registered, discovered, components: suite?.components || null }, 'Register local Skills and independent component identities with complete dependency closure.');
for (const source of possible) {
  const rel = path.relative(root, source).replaceAll(path.sep, '/');
  const files = pkg.files || [];
  const packed = files.some(entry => {
    const normalized = entry.replace(/\*\*?$/, '').replace(/\/$/, '');
    return rel === normalized || rel.startsWith(`${normalized}/`) || normalized.startsWith(`${rel}/`);
  });
  add(`skill.${path.basename(source)}.packed`, packed ? 'pass' : 'fail', { source: rel, files }, 'Include each canonical Skill in npm packed files.');
  const capsPath = path.join(source, 'capabilities.json');
  const caps = await json(capsPath).catch(() => null);
  add('skill.capabilities', caps ? 'pass' : 'fail', capsPath && path.relative(root, capsPath), 'Add a machine-readable capability contract.');
  for (const agent of [...new Set(targets.map(t => t.split(':')[0]))]) {
    const adapter = path.join(source, 'adapters', `${agent}.json`);
    const present = await exists(adapter);
    const declared = caps?.target_platforms?.includes(agent);
    add(`adapter.${agent}`, present && declared ? 'pass' : 'fail', { file: path.relative(root, adapter), present, declared: Boolean(declared) }, 'Declare the target and a truthful adapter; mark untested mappings implemented or unresolved.');
  }
  const text = await read(path.join(source, 'SKILL.md'));
  add('skill.utf8', !text.includes('\uFFFD') ? 'pass' : 'fail', !text.includes('\uFFFD') ? 'No replacement characters' : 'Replacement character found', 'Save source text as valid UTF-8 and test it in a Windows terminal and file read.');
}

const testFiles = (await fs.readdir(path.join(root, 'test')).catch(() => [])).filter(n => /\.(test|spec)\.[cm]?[jt]s$/.test(n) || /^test_.*\.py$/.test(n));
add('tests.present', testFiles.length ? 'pass' : 'fail', testFiles.length, 'Include runnable package and lifecycle tests.');
const testText = (await Promise.all(testFiles.map(n => read(path.join(root, 'test', n))))).join('\n');
for (const word of ['install', 'update', 'doctor']) {
  add(`tests.${word}`, testText.toLowerCase().includes(word) ? 'pass' : 'warn', `Coverage marker ${word}: ${testText.toLowerCase().includes(word)}`, `Exercise ${word} behavior with positive and negative cases; text presence is only a structural hint.`);
}
const lifecycleMarkers = [
  ['locked-update', /forceInPlace|locked.?(?:directory|rename|update)/i, 'Exercise a recoverable in-place update when an Agent locks directory rename.'],
  ['ui-metadata', /\.install-meta\.json|ui.?metadata/i, 'Verify first-install UI metadata and preservation of customized metadata on update.'],
  ['managed-runtime', /pythonCandidatesFor|managed.?(?:python|runtime)/i, 'Verify discovery of an Agent-managed runtime without a user override.'],
];
for (const [id, marker, next] of lifecycleMarkers) {
  add(`tests.${id}`, marker.test(testText) ? 'pass' : 'warn', marker.test(testText) ? 'Test marker present' : 'No test marker', `${next} Text presence is a structural hint, not execution proof.`);
}

const workflows = await fs.readdir(path.join(root, '.github', 'workflows')).catch(() => []);
const workflowText = (await Promise.all(workflows.filter(n => /\.ya?ml$/.test(n)).map(n => read(path.join(root, '.github', 'workflows', n))))).join('\n');
for (const os of [...new Set(targets.map(t => t.split(':')[1]))]) {
  const needle = os === 'macos' ? /macos-(?:latest|\d+)/i : /windows-(?:latest|\d+)/i;
  add(`ci.${os}`, needle.test(workflowText) ? 'pass' : 'fail', needle.test(workflowText) ? 'Runner declared' : 'No runner declared', `Add a ${os} package QA job before publication.`);
}
const oidc = /id-token:\s*write/.test(workflowText);
add('ci.oidc', oidc ? 'pass' : 'fail', oidc ? 'OIDC permission present' : 'OIDC permission absent', 'Publish through GitHub Actions Trusted Publishing.');
const gated = /needs:\s*(?:\[[^\]]*\bqa\b[^\]]*\]|qa\b)/m.test(workflowText);
add('ci.qa-gate', gated ? 'pass' : 'fail', gated ? 'A job needs qa' : 'No explicit qa dependency found', 'Make the publish job depend on cross-platform QA; inspect YAML semantics after changing it.');

const result = { root, package: pkg.name, version: pkg.version, targets, status: findings.some(x => x.status === 'fail') ? 'fail' : findings.some(x => x.status === 'warn') ? 'review' : 'structural-pass', findings, note: 'Structural audit only. Run platform installs, updates, doctor and business-output smoke separately.' };
if (argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`${result.package}@${result.version}: ${result.status}`);
  for (const x of findings) console.log(`${x.status.toUpperCase()} ${x.id}: ${JSON.stringify(x.evidence)}`);
}
if (result.status === 'fail') process.exitCode = 1;
