#!/usr/bin/env node
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilePlan } from './build-cover-plan.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const catalog = JSON.parse(await readFile(path.join(root, 'assets/style-presets.json'), 'utf8'));
const temporary = await mkdtemp(path.join(os.tmpdir(), 'xiaowei-cover-plan-test-'));
const fixtures = path.join(temporary, 'fixtures');
await mkdir(fixtures);
after(async () => { await rm(temporary, { recursive: true, force: true }); });

// Small valid PNGs make the file-copy checks independent of model APIs and local portraits.
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const label = Buffer.from(type, 'ascii');
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length, 0);
  label.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([label, data])), data.length + 8);
  return result;
}
function png(color) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(12, 0); header.writeUInt32BE(8, 4);
  header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc((12 * 4 + 1) * 8);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) {
    const offset = y * 49 + 1 + x * 4;
    rows.set([...color, 255], offset);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
for (const [name, color] of [
  ['identity-primary.png', [20, 40, 60]], ['identity-support.png', [40, 60, 80]],
  ['board.png', [40, 120, 60]], ['camera.png', [140, 100, 80]],
]) await writeFile(path.join(fixtures, name), png(color));
await writeFile(path.join(fixtures, 'FACTS.md'), '# Facts\nThe article is a buying checklist for ESP32-S3 breadboard components. Advanced agent features are proposals, not verified results.\n');
await writeFile(path.join(fixtures, 'SOURCES.md'), '# Sources\nIdentity fixture and product fixtures are synthetic test inputs; the author supplies the editorial title.\n');
await writeFile(path.join(fixtures, 'article.md'), '# 小智 AI 硬件怎么买？\n\n基础方案采用 ESP32-S3 开发板、麦克风和扬声器，在面包板上搭建。摄像头、屏幕和 Personal Agent 是可选进阶方向，本文未提供实现验证。\n');

const sceneFields = ['subject', 'environment', 'mood', 'light', 'camera', 'typography'];
const compositionFields = ['focalSubject', 'portraitSide', 'poseCategory', 'sceneType', 'layoutGrammar'];
function item(id = 'workbench', styleId = 'workbench') {
  return {
    id, styleId,
    rationale: 'A concrete parts checklist helps a beginner distinguish the board from optional modules.',
    concept: {
      promise: 'Identify the core parts required for a breadboard build.',
      visualMetaphor: 'The parts laid out before assembly on a calm workbench.',
      focalSubject: 'product', readingOrder: 'title then board then presenter',
      portraitSide: 'left', poseCategory: 'arranging_parts', sceneType: 'physical_workbench',
      layoutGrammar: 'foreground_product_with_background_presenter',
    },
    scene: {
      subject: 'Xiaowei studies an ESP32-S3 board and three loose modules, without connecting a circuit.',
      environment: 'A pale wooden workbench with a softly blurred tool shelf behind it.',
      mood: 'Warm gray wood, graphite lettering and one green component accent.',
      light: 'Soft upper-left daylight with natural contact shadows.',
      camera: 'A low tabletop angle, presenter back-left and product front-right.',
      typography: 'A bold graphite Chinese headline, with a smaller subtitle and clear spaces.',
    },
    poseBrief: 'One hand steadies the board; the other rests naturally on the tabletop.',
    copy: { title: '小智 AI 硬件怎么买？', subtitle: 'ESP32-S3 · 面包板 DIY 选购清单', author: 'siuser小伟' },
    objectRefs: ['board'],
    surfacePlans: {
      '16:9': { composition: 'Title above the center, presenter left-back and board right-front; extend the workbench across the full canvas.' },
      '3.35:1': { composition: 'Short title in the central upper band, left-back presenter and right-front board, with continuous physical space to both edges.' },
    },
  };
}
function plan(overrides = {}) {
  return {
    schemaVersion: 2, mode: 'single', topic: '小智 AI 硬件选购', requestedCount: 1,
    channel: 'article', ratios: ['16:9', '3.35:1'],
    identity: { mode: 'generated_identity', primary: '../../fixtures/identity-primary.png', support: ['../../fixtures/identity-support.png'] },
    factsFile: '../../fixtures/FACTS.md', sourcesFile: '../../fixtures/SOURCES.md',
    assets: [
      { id: 'board', file: '../../fixtures/board.png', purpose: 'Board appearance reference; it is not working-wiring evidence.' },
      { id: 'camera', file: '../../fixtures/camera.png', purpose: 'Optional camera appearance reference, excluded from the basic build.' },
    ],
    items: [item()], ...overrides,
  };
}
function distinctDirection() {
  const other = item('diagram', 'blueprint');
  other.concept = {
    ...other.concept, visualMetaphor: 'A clearly labelled component relationship map.',
    focalSubject: 'process', portraitSide: 'right', poseCategory: 'pointing_sequence',
    sceneType: 'technical_diagram', layoutGrammar: 'diagram_left_presenter_right',
  };
  other.scene = {
    subject: 'Xiaowei explains a schematic relationship between the board, microphone and speaker.',
    environment: 'A flat paper engineering board with one legible diagram and generous empty space.',
    mood: 'Cool paper gray and dark ink, with a restrained orange route marker.',
    light: 'Even diffuse studio light; diagram lines remain crisp.',
    camera: 'Frontal editorial view, presenter right and the relationship diagram left.',
    typography: 'Compact engineering labels and a large plain headline above the diagram.',
  };
  other.poseBrief = 'Point at the explanatory sequence, keeping the hand outside the title and face.';
  for (const ratio of Object.keys(other.surfacePlans)) other.surfacePlans[ratio].composition = `At ${ratio}, arrange one component diagram left and the presenter right; keep a distinct title band and full-bleed paper background.`;
  return other;
}
function customDirection(id = 'custom-study', styleId = 'linen-object-story') {
  return {
    ...item(id, styleId),
    styleDefinition: {
      name: 'Linen object study', engine: 'imagegen',
      source: 'An independently authored neutral object-study grammar for this test project.',
      adaptation: 'Show the article components as a physical still life beside the presenter.',
      visual: 'Full-bleed woven linen, matte clay blocks and a single deep-green product accent.',
      portrait: 'A natural unoutlined portrait with restrained expression and coherent linen-room light.',
      typography: 'Plain graphite Chinese display type with open counters and no sticker carrier.',
      avoid: ['No neon rim light or plastic gradients.', 'No title carrier that covers the product.'],
    },
  };
}
async function fixtureCase(name, inputPlan) {
  const directory = path.join(temporary, name);
  const inputDirectory = path.join(directory, 'input');
  await mkdir(inputDirectory, { recursive: true });
  const planFile = path.join(inputDirectory, 'authored-plan.json');
  await writeFile(planFile, JSON.stringify(inputPlan, null, 2));
  return { directory, planFile, target: path.join(directory, 'result') };
}
async function rejectCase(name, inputPlan, expected) {
  const current = await fixtureCase(name, inputPlan);
  await assert.rejects(compilePlan(current.planFile, current.target), expected);
  assert.equal(await stat(current.target).catch(() => null), null, `${name}: rejected plan must not leave a project`);
  assert.deepEqual(await readdir(current.directory), ['input'], `${name}: rejected plan must not leave staging artifacts`);
}

test('one content-derived single plan produces complete ratio prompts, copied inputs and honest planned records', async () => {
  const authored = plan();
  const current = await fixtureCase('single-success', authored);
  const result = await compilePlan(current.planFile, current.target);
  assert.equal(result.project, current.target);
  assert.equal(result.items, 1);
  assert.equal(result.prompts, 2);
  assert.equal(result.status, 'planned');
  assert.match(result.visualValidation, /pending/);
  const compiled = JSON.parse(await readFile(path.join(current.target, 'COVER_PLAN.json'), 'utf8'));
  assert.equal(compiled.planningOnly, true);
  assert.equal(compiled.catalogVersion, catalog.version);
  assert.equal(compiled.items.length, 1, 'single mode must not silently add five options');
  assert.equal(compiled.items[0].styleSnapshot.id, 'workbench');
  for (const [relative, source] of [
    [compiled.identity.primary, 'identity-primary.png'], [compiled.identity.support[0], 'identity-support.png'],
    [compiled.assets.find(asset => asset.id === 'board').file, 'board.png'],
    [compiled.assets.find(asset => asset.id === 'camera').file, 'camera.png'],
    [compiled.factsFile, 'FACTS.md'], [compiled.sourcesFile, 'SOURCES.md'],
  ]) {
    assert.equal(path.isAbsolute(relative), false, 'compiled asset paths are project-relative');
    assert.deepEqual(await readFile(path.join(current.target, relative)), await readFile(path.join(fixtures, source)), `${relative}: exact input copy`);
  }
  assert.deepEqual(JSON.parse(await readFile(path.join(current.target, 'source/authored-plan.json'), 'utf8')), authored);
  const generation = JSON.parse(await readFile(path.join(current.target, 'generation.json'), 'utf8'));
  assert.equal(generation.status, 'planned');
  assert.equal(generation.calls.length, 2);
  for (const call of generation.calls) {
    assert.equal(call.status, 'planned');
    assert.equal(call.liveGeneration, false);
    assert.equal(call.itemId, 'workbench');
    assert.deepEqual(call.references.map(reference => reference.role).sort(), ['board', 'identity-primary', 'identity-support']);
    for (const reference of call.references) {
      assert.equal((await stat(path.join(current.target, reference.file))).isFile(), true);
      assert.equal((await stat(reference.original)).isFile(), true);
    }
    const prompt = await readFile(path.join(current.target, call.promptFile), 'utf8');
    assert.ok(prompt.includes(call.requestedRatio));
    assert.ok(prompt.includes(authored.items[0].copy.title));
    assert.ok(prompt.includes(authored.items[0].surfacePlans[call.requestedRatio].composition));
    for (const field of sceneFields) assert.ok(prompt.includes(authored.items[0].scene[field]), `missing ${field}`);
    for (const field of ['promise', 'visualMetaphor', 'focalSubject', 'readingOrder']) assert.ok(prompt.includes(authored.items[0].concept[field]), `missing ${field}`);
    assert.ok(prompt.includes(authored.items[0].poseBrief));
    assert.match(prompt, /requested values, not proof of tool capability or output dimensions/);
    assert.doesNotMatch(prompt, /\{\{[^}]+\}\}|\bTODO\b|\bTBD\b/);
  }
  assert.deepEqual(await readdir(path.join(current.target, 'covers')), [], 'planning must not create pretend rendered images');
  const review = JSON.parse(await readFile(path.join(current.target, 'OUTPUT_REVIEW.template.json'), 'utf8'));
  assert.equal(review.outputs.length, 2);
  for (const output of review.outputs) {
    assert.equal(output.sourceFile, null);
    assert.equal(output.review.inspected, false);
    assert.deepEqual(output.transforms, []);
    assert.equal(await stat(path.join(current.target, output.file)).catch(() => null), null);
  }
});

test('requested pixel targets are present in prompts as requested dimensions, never certified output', async () => {
  const current = await fixtureCase('pixel-targets', plan());
  await compilePlan(current.planFile, current.target);
  const generation = JSON.parse(await readFile(path.join(current.target, 'generation.json'), 'utf8'));
  for (const call of generation.calls) {
    const prompt = await readFile(path.join(current.target, call.promptFile), 'utf8');
    assert.deepEqual(call.targetPixels, catalog.surfaces[call.requestedRatio].targetPixels);
    for (const pixel of call.targetPixels) assert.ok(prompt.includes(String(pixel)), `${call.requestedRatio}: requested pixel target ${pixel} is absent`);
    assert.match(prompt, /requested values, not proof of tool capability or output dimensions/);
    assert.doesNotMatch(prompt, /verified native output|native output verified|已验证原生输出/);
  }
});
test('an article source file is archived with identical bytes and a resolvable compiled path', async () => {
  const source = { file: '../../fixtures/article.md', url: 'https://example.test/hardware-buying-guide', revision: 'fixture-revision-1' };
  const authored = plan({ articleSource: source });
  const current = await fixtureCase('article-file-success', authored);
  await compilePlan(current.planFile, current.target);
  const compiled = JSON.parse(await readFile(path.join(current.target, 'COVER_PLAN.json'), 'utf8'));
  assert.deepEqual(compiled.articleSource, { ...source, file: 'source/article.md' });
  assert.equal(path.isAbsolute(compiled.articleSource.file), false);
  const archived = path.resolve(current.target, compiled.articleSource.file);
  assert.equal((await stat(archived)).isFile(), true);
  const originalBytes = await readFile(path.join(fixtures, 'article.md'));
  const archivedBytes = await readFile(archived);
  const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256(archivedBytes), sha256(originalBytes), 'archived article must match the complete source');
  assert.deepEqual(archivedBytes, originalBytes);
  assert.deepEqual(JSON.parse(await readFile(path.join(current.target, 'source/authored-plan.json'), 'utf8')), authored);
});
test('a missing article file rejects before writes even when a URL is also supplied', async () => {
  await rejectCase('missing-article-file', plan({ articleSource: { file: '../../fixtures/missing-article.md', url: 'https://example.test/hardware-buying-guide', revision: 'fixture-revision-1' } }), /articleSource\.file|file not found/);
  await rejectCase('article-without-file-or-url', plan({ articleSource: { revision: 'fixture-revision-1' } }), /articleSource/);
});
test('a URL-only article source is preserved without claiming or creating an archived article', async () => {
  const source = { url: 'https://example.test/hardware-buying-guide', revision: 'fixture-revision-1' };
  const current = await fixtureCase('article-url-only', plan({ articleSource: source }));
  await compilePlan(current.planFile, current.target);
  const compiled = JSON.parse(await readFile(path.join(current.target, 'COVER_PLAN.json'), 'utf8'));
  assert.deepEqual(compiled.articleSource, source, 'URL provenance must not grow a fabricated local file or archive status');
  assert.deepEqual(await readdir(path.join(current.target, 'source')), ['authored-plan.json']);
});

for (const field of sceneFields) test(`missing scene.${field} fails before project creation`, async () => {
  const authored = plan(); delete authored.items[0].scene[field];
  await rejectCase(`missing-scene-${field}`, authored, new RegExp(`scene\\.${field}`));
});
for (const field of ['promise', 'visualMetaphor', 'readingOrder', ...compositionFields]) test(`missing concept.${field} fails before project creation`, async () => {
  const authored = plan(); delete authored.items[0].concept[field];
  await rejectCase(`missing-concept-${field}`, authored, new RegExp(`concept\\.${field}`));
});
test('missing title and missing per-ratio composition fail before project creation', async () => {
  const noTitle = plan(); noTitle.items[0].copy.title = '';
  await rejectCase('missing-title', noTitle, /copy\.title/);
  const noSurface = plan(); delete noSurface.items[0].surfacePlans['3.35:1'];
  await rejectCase('missing-surface', noSurface, /surfacePlans/);
});
test('placeholder text is rejected, including per-ratio overrides', async () => {
  const basePlaceholder = plan(); basePlaceholder.items[0].scene.camera = 'TODO';
  await rejectCase('base-placeholder', basePlaceholder, /scene\.camera/);
  const overridePlaceholder = plan(); overridePlaceholder.items[0].surfacePlans['16:9'].copy = { title: '待填写' };
  await rejectCase('override-placeholder', overridePlaceholder, /title|copy|concrete/);
});
test('a per-ratio title override cannot erase the validated title', async () => {
  const authored = plan(); authored.items[0].surfacePlans['16:9'].copy = { title: '' };
  await rejectCase('empty-title-override', authored, /title|copy|concrete/);
});
test('all allowed per-ratio copy fields require concrete nonempty text when overridden', async () => {
  for (const field of ['title', 'subtitle', 'author', 'kicker']) {
    for (const [label, invalid] of [['null', null], ['empty', ''], ['placeholder', 'TODO']]) {
      const authored = plan(); authored.items[0].surfacePlans['16:9'].copy = { [field]: invalid };
      await rejectCase(`invalid-copy-${field}-${label}`, authored, new RegExp(`copy\\.${field}|concrete`));
    }
  }
});
test('copy accepts only title, subtitle, author and kicker at both plan and surface levels', async () => {
  const invalidBase = plan(); invalidBase.items[0].copy.instructions = 'A hidden unrequested copy field.';
  await rejectCase('unknown-base-copy-field', invalidBase, /copy|unsupported/);
  const invalidSurface = plan(); invalidSurface.items[0].surfacePlans['16:9'].copy = { instructions: 'A hidden unrequested copy field.' };
  await rejectCase('unknown-surface-copy-field', invalidSurface, /copy|unsupported/);
});
test('valid per-ratio copy overrides appear only in the requested surface and preserve inherited copy', async () => {
  const authored = plan();
  authored.items[0].surfacePlans['16:9'].copy = { title: '先把基础硬件买齐', kicker: '基础选购' };
  const current = await fixtureCase('valid-copy-override', authored);
  await compilePlan(current.planFile, current.target);
  const generation = JSON.parse(await readFile(path.join(current.target, 'generation.json'), 'utf8'));
  const promptPath = ratio => path.join(current.target, generation.calls.find(call => call.requestedRatio === ratio).promptFile);
  const wide = await readFile(promptPath('16:9'), 'utf8');
  assert.ok(wide.includes('先把基础硬件买齐'));
  assert.ok(wide.includes('基础选购'));
  assert.ok(wide.includes(authored.items[0].copy.subtitle));
  assert.ok(wide.includes(authored.items[0].copy.author));
  const banner = await readFile(promptPath('3.35:1'), 'utf8');
  assert.ok(banner.includes(authored.items[0].copy.title));
  assert.equal(banner.includes('先把基础硬件买齐'), false);
  assert.equal(banner.includes('基础选购'), false);
});
test('counts and modes fail closed without adding unsolicited variants', async () => {
  await rejectCase('count-mismatch', plan({ requestedCount: 5 }), /requestedCount/);
  await rejectCase('fractional-count', plan({ requestedCount: 1.5 }), /requestedCount/);
  await rejectCase('single-two-items', plan({ requestedCount: 2, items: [item(), distinctDirection()] }), /single/);
  await rejectCase('pack-one-item', plan({ mode: 'style_pack' }), /style_pack/);
  await rejectCase('unknown-mode', plan({ mode: 'auto' }), /mode|schemaVersion/);
  await rejectCase('wrong-schema', plan({ schemaVersion: 1 }), /schemaVersion/);
});
test('different style labels cannot conceal the same composition', async () => {
  const other = item('second', 'blueprint');
  await rejectCase('same-composition', plan({ mode: 'style_pack', requestedCount: 2, items: [item(), other] }), /Composition collision/);
  other.concept.focalSubject = 'process'; other.concept.sceneType = 'technical_diagram';
  await rejectCase('same-main-triple', plan({ mode: 'style_pack', requestedCount: 2, items: [item(), other] }), /Composition collision/);
  const oneField = item('second', 'blueprint'); oneField.concept.portraitSide = 'right';
  await rejectCase('one-composition-field', plan({ mode: 'style_pack', requestedCount: 2, items: [item(), oneField] }), /Composition collision/);
});
test('style_pack accepts two genuinely independent directions and preserves explicit count', async () => {
  const authored = plan({ mode: 'style_pack', requestedCount: 2, items: [item(), distinctDirection()] });
  const current = await fixtureCase('pack-success', authored);
  const result = await compilePlan(current.planFile, current.target);
  assert.equal(result.items, 2); assert.equal(result.prompts, 4);
  const compiled = JSON.parse(await readFile(path.join(current.target, 'COVER_PLAN.json'), 'utf8'));
  assert.deepEqual(compiled.items.map(entry => entry.styleId), ['workbench', 'blueprint']);
  assert.equal(compiled.requestedCount, 2);
  assert.equal((await readdir(path.join(current.target, 'prompts'))).length, 4);
});
test('complete project-only styles compile their own grammar without changing the global catalog', async () => {
  const catalogFile = path.join(root, 'assets/style-presets.json');
  const before = await readFile(catalogFile);
  for (const engine of ['imagegen', 'html']) {
    const direction = customDirection(); direction.styleDefinition.engine = engine;
    const current = await fixtureCase(`custom-style-${engine}`, plan({ items: [direction] }));
    const result = await compilePlan(current.planFile, current.target);
    assert.equal(result.items, 1); assert.equal(result.prompts, 2);
    const compiled = JSON.parse(await readFile(path.join(current.target, 'COVER_PLAN.json'), 'utf8'));
    assert.deepEqual(compiled.items[0].styleSnapshot, { ...direction.styleDefinition, id: direction.styleId, planningOnly: true, projectOnly: true });
    const generation = JSON.parse(await readFile(path.join(current.target, 'generation.json'), 'utf8'));
    for (const call of generation.calls) {
      assert.equal(call.engine, engine);
      const prompt = await readFile(path.join(current.target, call.promptFile), 'utf8');
      for (const field of ['name', 'visual', 'portrait', 'typography']) assert.ok(prompt.includes(direction.styleDefinition[field]), `custom prompt misses ${field}`);
      for (const condition of direction.styleDefinition.avoid) assert.ok(prompt.includes(condition));
    }
    assert.deepEqual(await readFile(catalogFile), before, 'project styles must not mutate global catalog bytes');
  }
});
test('incomplete or overriding project styles reject without residue and cannot bypass pack composition checks', async () => {
  for (const field of ['name', 'engine', 'source', 'adaptation', 'visual', 'portrait', 'typography', 'avoid']) {
    const direction = customDirection(); delete direction.styleDefinition[field];
    await rejectCase(`custom-style-missing-${field}`, plan({ items: [direction] }), /styleDefinition/);
  }
  const unsupportedEngine = customDirection(); unsupportedEngine.styleDefinition.engine = 'svg';
  await rejectCase('custom-style-invalid-engine', plan({ items: [unsupportedEngine] }), /styleDefinition\.engine/);
  const emptyAvoid = customDirection(); emptyAvoid.styleDefinition.avoid = [];
  await rejectCase('custom-style-empty-avoid', plan({ items: [emptyAvoid] }), /styleDefinition\.avoid/);
  const blankAvoid = customDirection(); blankAvoid.styleDefinition.avoid = [''];
  await rejectCase('custom-style-blank-avoid', plan({ items: [blankAvoid] }), /styleDefinition\.avoid/);
  await rejectCase('custom-style-unsafe-id', plan({ items: [customDirection('custom-study', 'custom/path')] }), /safe new styleId/);
  await rejectCase('custom-style-catalog-override', plan({ items: [customDirection('custom-study', 'workbench')] }), /override an existing catalog styleId/);
  const first = customDirection('first-study', 'linen-object-story');
  const second = customDirection('second-study', 'clay-object-story');
  second.styleDefinition.name = 'Clay object study';
  second.styleDefinition.visual = 'Full-bleed matte clay geometry, pale paper and one cobalt product accent.';
  await rejectCase('custom-style-same-composition', plan({ mode: 'style_pack', requestedCount: 2, items: [first, second] }), /Composition collision/);
});
test('a custom style pack cannot rename identical visual, portrait and typography rules', async () => {
  const first = customDirection('first-study', 'linen-object-story');
  const second = {
    ...distinctDirection(), styleId: 'renamed-linen-story',
    styleDefinition: { ...first.styleDefinition, name: 'Renamed linen study' },
  };
  await rejectCase('custom-pack-renamed-grammar', plan({ mode: 'style_pack', requestedCount: 2, items: [first, second] }), /cannot rename identical visual\/portrait\/typography/);
});
test('a custom series cannot quietly change visual, portrait or typography rules under the same style ID', async () => {
  for (const field of ['visual', 'portrait', 'typography']) {
    const first = customDirection('first-study');
    const second = customDirection('second-study');
    second.styleDefinition[field] = `A deliberately different ${field} rule for the second episode.`;
    await rejectCase(`custom-series-changed-${field}`, plan({ mode: 'series', requestedCount: 2, items: [first, second] }), /series keeps one complete style definition/);
  }
});
test('style_pack rejects repeated styles and series rejects mixed styles', async () => {
  await rejectCase('pack-repeat-style', plan({ mode: 'style_pack', requestedCount: 2, items: [item(), { ...distinctDirection(), styleId: 'workbench' }] }), /distinct complete styles/);
  await rejectCase('series-mixed-style', plan({ mode: 'series', requestedCount: 2, items: [item(), distinctDirection()] }), /series keeps one/);
});
test('series retains a common style and can share composition grammar', async () => {
  const current = await fixtureCase('series-success', plan({ mode: 'series', requestedCount: 2, items: [item(), item('episode-two')] }));
  const result = await compilePlan(current.planFile, current.target);
  assert.equal(result.items, 2); assert.equal(result.prompts, 4);
});
test('every required input file must exist and rejection leaves no target or staging files', async () => {
  for (const missing of ['primary', 'support', 'facts', 'sources', 'asset']) {
    const authored = plan();
    if (missing === 'primary') authored.identity.primary = '../../fixtures/missing.png';
    if (missing === 'support') authored.identity.support = ['../../fixtures/missing.png'];
    if (missing === 'facts') authored.factsFile = '../../fixtures/missing.md';
    if (missing === 'sources') authored.sourcesFile = '../../fixtures/missing.md';
    if (missing === 'asset') authored.assets[0].file = '../../fixtures/missing.png';
    await rejectCase(`missing-file-${missing}`, authored, /file not found/);
  }
  const directoryInput = plan(); directoryInput.identity.primary = '../../fixtures';
  await rejectCase('directory-not-file', directoryInput, /file not found/);
});
test('unresolved documentary references and unsupported ratios are rejected before writes', async () => {
  const unresolved = plan(); unresolved.items[0].objectRefs = ['fictional-board'];
  await rejectCase('unresolved-reference', unresolved, /objectRefs/);
  await rejectCase('unsupported-ratio', plan({ ratios: ['5:2'] }), /supported target ratios/);
  await rejectCase('duplicate-ratio', plan({ ratios: ['16:9', '16:9'] }), /unique supported/);
});
test('source_locked and optional identity support are respected without a style pack', async () => {
  const authored = plan(); authored.identity.mode = 'source_locked'; delete authored.identity.support;
  const current = await fixtureCase('source-locked', authored);
  await compilePlan(current.planFile, current.target);
  const compiled = JSON.parse(await readFile(path.join(current.target, 'COVER_PLAN.json'), 'utf8'));
  assert.deepEqual(compiled.identity.support, []);
  const prompt = await readFile(path.join(current.target, 'prompts/workbench-16x9.md'), 'utf8');
  assert.match(prompt, /Keep the supplied photo and its documented pose/);
});
test('an existing destination is rejected without replacing or modifying its files', async () => {
  const current = await fixtureCase('existing-target', plan());
  await mkdir(current.target);
  const sentinel = Buffer.from('User-owned project; do not overwrite.\n');
  await writeFile(path.join(current.target, 'sentinel.md'), sentinel);
  await assert.rejects(compilePlan(current.planFile, current.target), /Target exists/);
  assert.deepEqual(await readdir(current.target), ['sentinel.md']);
  assert.deepEqual(await readFile(path.join(current.target, 'sentinel.md')), sentinel);
  assert.deepEqual((await readdir(current.directory)).sort(), ['input', 'result']);
});
