#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export const sha256 = data => createHash('sha256').update(data).digest('hex');

export function pngSize(data) {
  assert.ok(data.length >= 33 && data.subarray(0, 8).equals(pngSignature), 'Invalid PNG');
  assert.equal(data.toString('ascii', 12, 16), 'IHDR', 'Missing PNG IHDR');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

async function filesUnder(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Symlink in case: ${entry.name}`);
    if (entry.isDirectory()) found.push(...await filesUnder(target));
    else if (entry.isFile()) found.push(target);
  }
  return found;
}

export async function verifyCases(manifest, repositoryRoot = root) {
  assert.equal(manifest.schemaVersion, 1, 'Unsupported case schema');
  assert.ok(Array.isArray(manifest.cases) && manifest.cases.length > 0, 'No cases');
  const seenIds = new Set();
  let files = 0;
  let images = 0;
  for (const item of manifest.cases) {
    assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Unsafe case id');
    assert.ok(!seenIds.has(item.id), 'Duplicate case id');
    seenIds.add(item.id);
    assert.equal(item.kind, 'historical-maintainer-task', 'Case category changed');
    assert.equal(item.liveModelTraceAvailable, false, 'No live trace in these historical cases');
    assert.equal(item.publicationMetricsAvailable, false, 'No publication metrics in these cases');
    const prefix = `docs/cases/${item.id}/`;
    const caseRoot = path.join(repositoryRoot, prefix);
    const indexed = new Set();
    for (const artifact of item.artifacts) {
      assert.ok(artifact.path.startsWith(prefix) && !artifact.path.includes('\\') &&
        !artifact.path.split('/').includes('..') && path.posix.normalize(artifact.path) === artifact.path,
      'Unsafe artifact path');
      assert.ok(!indexed.has(artifact.path), 'Duplicate artifact');
      indexed.add(artifact.path);
      const file = path.join(repositoryRoot, artifact.path);
      const resolved = await realpath(file);
      assert.ok(resolved.startsWith(`${await realpath(caseRoot)}${path.sep}`), 'Artifact escapes case');
      const data = await readFile(file);
      assert.equal(sha256(data), artifact.sha256, `Hash mismatch: ${artifact.path}`);
      if (artifact.path.endsWith('.png')) {
        assert.deepEqual(pngSize(data), [artifact.width, artifact.height], `PNG dimensions: ${artifact.path}`);
        assert.ok(item.originals.some(original => original.publicCopyModified === false && original.sha256 === artifact.sha256),
          'Historical PNG differs from recorded original');
        images++;
      } else {
        const text = data.toString('utf8');
        assert.doesNotMatch(text, /\/Users\/|\/home\/|[A-Za-z]:\\Users\\|https?:\/\/[^\s/]+\.feishu\.cn\/|\bsk-[A-Za-z0-9_-]{20,}/u,
          `Private path, draft URL or key pattern: ${artifact.path}`);
        if (artifact.path.endsWith('.html')) {
          assert.equal((text.match(/\bdata-export(?=[ >])/g) || []).length, 3, 'Case must contain only 3 exports');
          for (const match of text.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
            assert.ok(!/^(?:[a-z]+:|\/)/i.test(match[1]), 'Case image must be a local asset');
            const asset = await realpath(path.resolve(path.dirname(file), match[1]));
            assert.ok(asset.startsWith(`${await realpath(repositoryRoot)}${path.sep}`), 'Image escapes repository');
            assert.ok((await stat(asset)).isFile(), 'Missing image asset');
          }
        }
      }
      files++;
    }
    for (const name of ['README.md', 'SOURCE.md', 'COVER_PROMPT.md', 'FACTS.md', 'cover.html', '21x9.png', '1x1.png', 'pair-preview.png']) {
      assert.ok(indexed.has(prefix + name), `Missing case artifact: ${name}`);
    }
    const actual = (await filesUnder(caseRoot)).map(file => path.relative(repositoryRoot, file).split(path.sep).join('/')).sort();
    assert.deepEqual(actual, [...indexed].sort(), 'Unindexed or missing case files');
  }
  return { cases: seenIds.size, files, images };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const manifest = JSON.parse(await readFile(path.join(root, 'docs/cases/manifest.json'), 'utf8'));
    const result = await verifyCases(manifest);
    console.log(`Case evidence verified: ${result.cases} historical tasks, ${result.images} unchanged PNGs, ${result.files} indexed files.`);
  } catch (error) {
    console.error(`verify-case-studies: ${error.message}`);
    process.exitCode = 1;
  }
}
