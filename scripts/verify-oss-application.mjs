#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fields = JSON.parse(await readFile(path.join(root, 'docs/oss/application-fields.json'), 'utf8'));
const markdown = await readFile(path.join(root, 'docs/oss/application.md'), 'utf8');
assert.equal(fields.characterLimit, 500);
assert.equal(fields.submitted, false, 'This repository holds a draft, not proof of submission');
for (const key of ['eligibility', 'api_usage', 'additional']) {
  for (const language of ['en', 'zh']) {
    const value = fields.fields[key][language];
    assert.equal(typeof value, 'string');
    assert.ok(value.length > 0 && value.length <= 500, `${key}/${language} exceeds form limit`);
    assert.ok(markdown.includes(`\n${value}\n`), `${key}/${language} differs from copy-ready Markdown`);
    console.log(`Application ${key}/${language}: ${value.length}/500 characters.`);
  }
}
