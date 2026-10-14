#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, link, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { readImageDimensions } from "./validate-cover-output.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const validator = path.join(root, "scripts/validate-cover-output.mjs");
const temporary = await mkdtemp(path.join(os.tmpdir(), "xiaowei-output-test-"));
let checks = 0;

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, payload) {
  const name = Buffer.from(type, "ascii");
  const result = Buffer.alloc(payload.length + 12);
  result.writeUInt32BE(payload.length, 0);
  name.copy(result, 4);
  payload.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, payload])), payload.length + 8);
  return result;
}

async function png(file, width, height, color) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      scanlines[offset] = color[0];
      scanlines[offset + 1] = color[1];
      scanlines[offset + 2] = color[2];
      scanlines[offset + 3] = 255;
    }
  }
  await writeFile(path.join(temporary, file), Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header), chunk("IDAT", deflateSync(scanlines)), chunk("IEND", Buffer.alloc(0)),
  ]));
}

const review = (changes = {}) => ({
  inspected: true, identityRecognizable: true, textCorrect: true, thumbnailReadable: true,
  fullBleed: true, evidenceFaithful: true, styleMatches: true,
  focalSubject: "title", portraitSide: "right", poseCategory: "open_palms",
  sceneType: "studio", layoutGrammar: "title_left_person_right", ...changes,
});

const output = (file, changes = {}) => ({
  file, engine: "html", requestedRatio: "3.35:1", sourceFile: null, transforms: [], review: review(), ...changes,
});

async function run(name, outputs, { mode = "single", expected = "validated", codes = [], extra = {}, writeReport = false } = {}) {
  const manifest = path.join(temporary, `${name}.json`);
  const reportFile = path.join(temporary, `${name}.report.json`);
  await writeFile(manifest, JSON.stringify({ schemaVersion: 2, mode, outputs, ...extra }));
  const args = [validator, manifest, ...(writeReport ? ["--out", reportFile] : [])];
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.ok(result.stdout.trim(), result.stderr || "Validator did not emit a JSON report");
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, expected, `${name}: ${result.stdout}`);
  assert.equal(result.status, expected === "validated" ? 0 : 1, `${name}: ${result.stderr}`);
  for (const code of codes) assert.ok(report.failures.some(failure => failure.code === code), `${name}: missing ${code}: ${result.stdout}`);
  if (writeReport) assert.deepEqual(JSON.parse(await readFile(reportFile, "utf8")), report);
  checks++;
  return report;
}

try {
  await png("old-2169x725.png", 2169, 725, [170, 200, 220]);
  await png("native-a.png", 3350, 1000, [244, 238, 222]);
  await png("native-b.png", 3350, 1000, [40, 120, 100]);
  await png("native-c.png", 3350, 1000, [160, 80, 140]);
  await png("near-ratio.png", 3330, 1000, [200, 100, 30]);
  await png("vertical.png", 300, 400, [210, 180, 200]);
  await png("vertical-b.png", 300, 400, [210, 170, 200]);
  await png("vertical-c.png", 300, 400, [200, 170, 200]);
  await png("exact-boundary.png", 99, 1, [200, 150, 100]);

  // Keep JPEG coverage on a real bundled photograph, copied only into this
  // temporary directory. Insert a valid EXIF orientation segment before SOS
  // to verify displayed dimensions without depending on an image library.
  const jpeg = await readFile(path.join(root, "assets/portrait/xiaowei-context.jpg"));
  const jpegSize = readImageDimensions(jpeg);
  assert.equal(jpegSize.format, "jpeg");
  await writeFile(path.join(temporary, "real-photo.jpg"), jpeg);
  const exif = Buffer.alloc(32);
  exif.write("Exif\0\0", 0, "ascii"); exif.write("II", 6, "ascii");
  exif.writeUInt16LE(42, 8); exif.writeUInt32LE(8, 10); exif.writeUInt16LE(1, 14);
  exif.writeUInt16LE(0x0112, 16); exif.writeUInt16LE(3, 18); exif.writeUInt32LE(1, 20); exif.writeUInt16LE(6, 24);
  const exifSegment = Buffer.alloc(exif.length + 4);
  exifSegment[0] = 0xff; exifSegment[1] = 0xe1; exifSegment.writeUInt16BE(exif.length + 2, 2); exif.copy(exifSegment, 4);
  const scanOffset = jpeg.indexOf(Buffer.from([0xff, 0xda]));
  assert.ok(scanOffset > 2);
  await writeFile(path.join(temporary, "oriented-photo.jpg"), Buffer.concat([jpeg.subarray(0, scanOffset), exifSegment, jpeg.subarray(scanOffset)]));

  const old = await run("old-dimensions", [output("old-2169x725.png", { width: 3350, height: 1000, cssDimensions: [3350, 1000] })], { expected: "rejected", codes: ["ratio_mismatch"] });
  assert.equal(old.outputs[0].actualWidth, 2169);
  assert.equal(old.outputs[0].actualHeight, 725);

  await run("padding", [output("native-a.png", { sourceFile: "old-2169x725.png", transforms: [{ type: "padding", width: 3350, height: 1000 }] })], { expected: "rejected", codes: ["transform_not_allowed", "source_dimensions_changed"] });
  for (const transform of ["stretch", "crop", "resize", "mystery"]) {
    await run(`transform-${transform}`, [output("native-a.png", { transforms: [transform] })], { expected: "rejected", codes: ["transform_not_allowed"] });
  }

  await run("no-review", [output("native-a.png", { review: undefined })], { expected: "rejected", codes: ["review_missing"] });
  await run("review-not-inspected", [output("native-a.png", { review: review({ inspected: false }) })], { expected: "rejected", codes: ["review_flag_not_true"] });
  await run("missing-file", [output("missing.png")], { expected: "rejected", codes: ["output_file_unreadable"] });
  await run("duplicate-path", [output("native-a.png"), output("./native-a.png")], { expected: "rejected", codes: ["duplicate_output"] });
  await copyFile(path.join(temporary, "native-a.png"), path.join(temporary, "duplicate-a.png"));
  await run("duplicate-pixels", [output("native-a.png"), output("duplicate-a.png")], { expected: "rejected", codes: ["duplicate_output_content"] });
  await run("missing-source", [output("native-a.png", { sourceFile: "gone.png" })], { expected: "rejected", codes: ["source_file_unreadable"] });
  await run("imagegen-needs-original", [output("native-a.png", { engine: "imagegen", sourceFile: null })], { expected: "rejected", codes: ["tool_original_required"] });
  await run("imagegen-original-kept", [output("duplicate-a.png", { engine: "imagegen", sourceFile: "native-a.png" })]);
  await run("missing-engine", [output("native-a.png", { engine: undefined })], { expected: "rejected", codes: ["engine_invalid"] });
  await run("hidden-change", [output("native-a.png", { sourceFile: "native-b.png" })], { expected: "rejected", codes: ["source_image_changed"] });
  await run("missing-transforms", [output("native-a.png", { transforms: undefined })], { expected: "rejected", codes: ["transforms_missing"] });
  await run("bad-ratio", [output("native-a.png", { requestedRatio: "0:1" })], { expected: "rejected", codes: ["requested_ratio_invalid"] });
  await writeFile(path.join(temporary, "fake.png"), "3350x1000");
  await run("invalid-image", [output("fake.png")], { expected: "rejected", codes: ["image_invalid"] });

  await run("style-id-only", [
    output("native-a.png", { itemId: "one", styleId: "oil" }),
    output("native-b.png", { itemId: "two", styleId: "series" }),
  ], { mode: "style_pack", expected: "rejected", codes: ["composition_repeated", "composition_distance_insufficient"] });
  await run("skin-change", [
    output("native-a.png", { itemId: "one" }),
    output("native-b.png", { itemId: "two", review: review({ focalSubject: "product", sceneType: "workbench" }) }),
  ], { mode: "style_pack", expected: "rejected", codes: ["composition_repeated"] });
  await run("only-one-field-changed", [
    output("native-a.png", { itemId: "one" }),
    output("native-b.png", { itemId: "two", review: review({ portraitSide: "left" }) }),
  ], { mode: "style_pack", expected: "rejected", codes: ["composition_distance_insufficient"] });
  await run("no-item-id", [output("native-a.png"), output("native-b.png")], { mode: "style_pack", expected: "rejected", codes: ["item_id_required"] });

  const varied = [
    output("native-a.png", { itemId: "one" }),
    output("native-b.png", { itemId: "two", review: review({ focalSubject: "product", portraitSide: "left", poseCategory: "holding_component", sceneType: "workbench", layoutGrammar: "product_center_person_left" }) }),
    output("native-c.png", { itemId: "three", review: review({ focalSubject: "process", portraitSide: "center", poseCategory: "pointing_sequence", sceneType: "diagram", layoutGrammar: "horizontal_process" }) }),
  ];
  const nativeBefore = createHash("sha256").update(await readFile(path.join(temporary, "native-a.png"))).digest("hex");
  const valid = await run("independent-compositions", varied, { mode: "style_pack", writeReport: true });
  assert.equal(valid.comparisons.length, 3);
  assert.ok(valid.comparisons.every(comparison => comparison.differenceCount >= 2));
  assert.equal(createHash("sha256").update(await readFile(path.join(temporary, "native-a.png"))).digest("hex"), nativeBefore, "Validator must not alter an image");

  await run("same-item-ratios", [
    ...varied,
    output("vertical.png", { itemId: "one", requestedRatio: "3:4" }),
    output("vertical-b.png", { itemId: "two", requestedRatio: "3:4", review: varied[1].review }),
    output("vertical-c.png", { itemId: "three", requestedRatio: "3:4", review: varied[2].review }),
  ], { mode: "style_pack" });
  await run("series-common-grammar", [output("native-a.png", { itemId: "episode-a" }), output("native-b.png", { itemId: "episode-b" })], { mode: "series" });
  await run("source-copy", [output("duplicate-a.png", { sourceFile: "native-a.png" })]);
  await run("ratio-within-one-percent", [output("near-ratio.png")]);
  await run("ratio-at-one-percent", [output("exact-boundary.png", { requestedRatio: "100:1" })]);
  const jpg = await run("jpeg-real-dimensions", [output("real-photo.jpg", { requestedRatio: `${jpegSize.width}:${jpegSize.height}` })]);
  assert.equal(jpg.outputs[0].actualWidth, jpegSize.width);
  assert.equal(jpg.outputs[0].actualHeight, jpegSize.height);
  const oriented = await run("jpeg-orientation", [output("oriented-photo.jpg", { requestedRatio: `${jpegSize.encodedHeight}:${jpegSize.encodedWidth}` })]);
  assert.equal(oriented.outputs[0].orientation, 6);
  assert.equal(oriented.outputs[0].actualWidth, jpegSize.encodedHeight);
  assert.equal(oriented.outputs[0].actualHeight, jpegSize.encodedWidth);
  await run("mixed-ratio-representatives", [varied[0], output("vertical-b.png", { itemId: "two", requestedRatio: "3:4", review: varied[1].review })], { mode: "style_pack" });
  await run("wrong-schema", [output("native-a.png")], { expected: "rejected", codes: ["schema_version_invalid"], extra: { schemaVersion: 1 } });
  await run("empty-output", [], { expected: "rejected", codes: ["outputs_missing"] });

  const conflictManifest = path.join(temporary, "report-conflict.json");
  const conflictText = JSON.stringify({ schemaVersion: 2, mode: "single", outputs: [output("native-a.png")] });
  await writeFile(conflictManifest, conflictText);
  const conflict = spawnSync(process.execPath, [validator, conflictManifest, "--out", conflictManifest], { encoding: "utf8" });
  assert.equal(conflict.status, 1);
  assert.ok(JSON.parse(conflict.stdout).failures.some(failure => failure.code === "report_path_conflict"));
  assert.equal(await readFile(conflictManifest, "utf8"), conflictText, "Report must never overwrite its input manifest");
  checks++;
  for (const kind of ["symlink", "hardlink"]) {
    const alias = path.join(temporary, `${kind}-report.json`);
    if (kind === "symlink") await symlink(path.join(temporary, "native-a.png"), alias);
    else await link(path.join(temporary, "native-a.png"), alias);
    const linkedConflict = spawnSync(process.execPath, [validator, conflictManifest, "--out", alias], { encoding: "utf8" });
    assert.equal(linkedConflict.status, 1);
    assert.ok(JSON.parse(linkedConflict.stdout).failures.some(failure => failure.code === "report_path_conflict"));
    assert.equal(createHash("sha256").update(await readFile(path.join(temporary, "native-a.png"))).digest("hex"), nativeBefore, "Report aliases must never modify an input image");
    checks++;
  }
  console.log(`Cover output tests passed: ${checks} cases; real dimensions, ratio limits, original-file provenance, rejected transforms, recorded visual review, cross-item composition, series compatibility and read-only validation.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
