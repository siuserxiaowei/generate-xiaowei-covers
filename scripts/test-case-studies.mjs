#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCases, pngSize, sha256 } from './verify-case-studies.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(path.join(root, 'docs/cases/manifest.json'), 'utf8'));
const temporary = await mkdtemp(path.join(os.tmpdir(), 'claim2cover-cases-'));
try {
  await verifyCases(manifest, root);
  const changedHash = structuredClone(manifest);
  changedHash.cases[0].artifacts[0].sha256 = '0'.repeat(64);
  await assert.rejects(verifyCases(changedHash, root), /Hash mismatch/);
  const unsafePath = structuredClone(manifest);
  unsafePath.cases[0].artifacts[0].path = 'docs/cases/../private.txt';
  await assert.rejects(verifyCases(unsafePath, root), /Unsafe artifact path/);
  const wrongPixels = structuredClone(manifest);
  wrongPixels.cases[0].artifacts.find(a => a.path.endsWith('.png')).width++;
  await assert.rejects(verifyCases(wrongPixels, root), /PNG dimensions/);
  const missingArtifact = structuredClone(manifest);
  missingArtifact.cases[0].artifacts = missingArtifact.cases[0].artifacts.filter(a => !a.path.endsWith('/FACTS.md'));
  await assert.rejects(verifyCases(missingArtifact, root), /Missing case artifact/);

  const isolated = path.join(temporary, 'privacy-fixture');
  await cp(path.join(root, 'docs/cases'), path.join(isolated, 'docs/cases'), { recursive: true });
  await cp(path.join(root, 'assets/portrait'), path.join(isolated, 'assets/portrait'), { recursive: true });
  const privateCopy = structuredClone(manifest);
  const record = privateCopy.cases[0].artifacts.find(a => a.path.endsWith('/COVER_PROMPT.md'));
  const injected = Buffer.from('Private draft: https://example.feishu.cn/wiki/private-test');
  await writeFile(path.join(isolated, record.path), injected);
  record.sha256 = sha256(injected);
  await assert.rejects(verifyCases(privateCopy, isolated), /Private path, draft URL or key pattern/);
  console.log('Case evidence negative tests passed: hash, path, dimensions, missing record, private draft URL.');

  let renders = 0;
  for (const item of manifest.cases) {
    const folder = path.join(root, 'docs/cases', item.id);
    const out = path.join(temporary, item.id);
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/render-covers.mjs'), path.join(folder, 'cover.html'), out, '--only', 'workflow'],
      { cwd: root, encoding: 'utf8', env: process.env });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const html = await readFile(path.join(folder, 'cover.html'), 'utf8');
    const names = [...html.matchAll(/data-file="([^"]+)"/g)].map(match => match[1]);
    assert.equal(names.length, 3);
    for (const name of names) {
      const expected = name.endsWith('-21x9.png') ? [2100, 900] : name.endsWith('-1x1.png') ? [1080, 1080] : [1944, 620];
      assert.deepEqual(pngSize(await readFile(path.join(out, name))), expected);
      renders++;
    }
    console.log(`Historical case re-rendered: ${item.id}, 3 PNG dimensions verified.`);
  }
  console.log(`Case studies passed: 5 negative checks and ${renders} freshly rendered PNGs. No model API calls.`);
} finally {
  await rm(temporary, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
}
