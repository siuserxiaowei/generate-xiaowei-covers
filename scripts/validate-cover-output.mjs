#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const REVIEW_FLAGS = ["inspected", "identityRecognizable", "textCorrect", "thumbnailReadable", "fullBleed", "evidenceFaithful", "styleMatches"];
const COMPOSITION_FIELDS = ["focalSubject", "portraitSide", "poseCategory", "sceneType", "layoutGrammar"];
const CORE_COMPOSITION_FIELDS = ["portraitSide", "poseCategory", "layoutGrammar"];
const RATIO_TOLERANCE = 0.01;
const usage = "Usage: node validate-cover-output.mjs <manifest.json> [--out report.json]";
const normalized = value => typeof value === "string" ? value.trim().normalize("NFKC").toLowerCase().replace(/[\s_-]+/gu, "_") : "";
const nonempty = value => typeof value === "string" && value.trim().length > 0;
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngDimensions(bytes) {
  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("Invalid or truncated PNG signature.");
  if (bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") throw new Error("PNG must start with a 13-byte IHDR chunk.");
  if (crc32(bytes.subarray(12, 29)) !== bytes.readUInt32BE(29)) throw new Error("PNG IHDR checksum is invalid.");
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height || width > 0x7fffffff || height > 0x7fffffff) throw new Error("PNG dimensions must be positive and within the PNG limit.");
  let position = 8, hasImageData = false, hasEnd = false;
  while (position < bytes.length) {
    if (position + 12 > bytes.length) throw new Error("PNG contains a truncated chunk.");
    const length = bytes.readUInt32BE(position);
    const end = position + length + 12;
    if (end > bytes.length) throw new Error("PNG chunk exceeds the file length.");
    const type = bytes.toString("ascii", position + 4, position + 8);
    if (type === "IHDR" && position !== 8) throw new Error("PNG contains multiple IHDR chunks.");
    if (type === "IDAT" && length) hasImageData = true;
    position = end;
    if (type === "IEND") {
      if (length !== 0) throw new Error("PNG IEND chunk must be empty.");
      hasEnd = true;
      break;
    }
  }
  if (!hasImageData || !hasEnd) throw new Error("PNG is missing IDAT or IEND image structure.");
  return { format: "png", width, height, encodedWidth: width, encodedHeight: height, orientation: 1 };
}

function exifOrientation(payload) {
  if (payload.length < 14 || payload.toString("ascii", 0, 6) !== "Exif\0\0") return 1;
  const tiff = payload.subarray(6);
  const order = tiff.toString("ascii", 0, 2);
  if (!["II", "MM"].includes(order)) return 1;
  const short = offset => order === "II" ? tiff.readUInt16LE(offset) : tiff.readUInt16BE(offset);
  const long = offset => order === "II" ? tiff.readUInt32LE(offset) : tiff.readUInt32BE(offset);
  if (short(2) !== 42) return 1;
  const directory = long(4);
  if (directory + 2 > tiff.length) return 1;
  const count = short(directory);
  for (let index = 0; index < count; index++) {
    const entry = directory + 2 + index * 12;
    if (entry + 12 > tiff.length) return 1;
    if (short(entry) === 0x0112 && short(entry + 2) === 3 && long(entry + 4) === 1) {
      const orientation = short(entry + 8);
      return orientation >= 1 && orientation <= 8 ? orientation : 1;
    }
  }
  return 1;
}

function jpegDimensions(bytes) {
  if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Invalid or truncated JPEG signature.");
  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let position = 2, frame, orientation = 1, foundScan = false;
  while (position < bytes.length) {
    if (bytes[position++] !== 0xff) throw new Error("JPEG marker boundary is invalid.");
    while (bytes[position] === 0xff) position++;
    const marker = bytes[position++];
    if (marker === undefined || marker === 0) throw new Error("JPEG marker is truncated or invalid.");
    if (marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (position + 2 > bytes.length) throw new Error("JPEG segment length is truncated.");
    const length = bytes.readUInt16BE(position);
    if (length < 2 || position + length > bytes.length) throw new Error("JPEG segment exceeds the file length.");
    const payload = bytes.subarray(position + 2, position + length);
    if (marker === 0xe1) orientation = exifOrientation(payload);
    if (frameMarkers.has(marker)) {
      if (payload.length < 6 || !payload[5] || payload.length < 6 + payload[5] * 3) throw new Error("JPEG frame dimensions are truncated.");
      frame = { encodedHeight: payload.readUInt16BE(1), encodedWidth: payload.readUInt16BE(3) };
      if (!frame.encodedWidth || !frame.encodedHeight) throw new Error("JPEG dimensions must be positive.");
    }
    position += length;
    if (marker === 0xda) { foundScan = true; break; }
  }
  if (!frame || !foundScan || bytes.lastIndexOf(Buffer.from([0xff, 0xd9])) < position) throw new Error("JPEG is missing a frame, scan or end marker.");
  const swapped = orientation >= 5 && orientation <= 8;
  return { format: "jpeg", ...frame, orientation, width: swapped ? frame.encodedHeight : frame.encodedWidth, height: swapped ? frame.encodedWidth : frame.encodedHeight };
}

export function readImageDimensions(bytes) {
  if (bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return pngDimensions(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegDimensions(bytes);
  throw new Error("Only real PNG and JPEG files are supported; filenames and declared dimensions are not image evidence.");
}

function requestedRatio(value) {
  if (!nonempty(value)) throw new Error("requestedRatio must be a positive colon-separated ratio, such as 3.35:1.");
  const match = value.trim().match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/u);
  if (!match) throw new Error("requestedRatio must use two positive numbers separated by a colon.");
  const width = Number(match[1]), height = Number(match[2]);
  const ratio = width / height;
  if (!Number.isFinite(ratio) || width <= 0 || height <= 0 || ratio <= 0) throw new Error("requestedRatio numbers must be finite and greater than zero.");
  return { value: ratio, key: ratio.toPrecision(12) };
}

async function imageFile(file) {
  const info = await stat(file);
  if (!info.isFile()) throw new Error("Path is not a regular image file.");
  const bytes = await readFile(file);
  return { ...readImageDimensions(bytes), bytes: bytes.length, sha256: sha256(bytes), resolvedFile: await realpath(file) };
}

export async function validateManifest(manifest, manifestPath) {
  const base = path.dirname(path.resolve(manifestPath));
  const report = {
    schemaVersion: 2, manifest: path.resolve(manifestPath), mode: manifest?.mode ?? null,
    status: "rejected", ratioTolerance: RATIO_TOLERANCE, failures: [], outputs: [], comparisons: [],
    verificationScope: "Image-file dimensions and provenance plus explicitly recorded visual review. No pixel-semantic, identity, text or style recognition is performed by this script.",
  };
  const failure = (code, message, extra = {}) => report.failures.push({ code, message, ...extra });
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest) || manifest.schemaVersion !== 2) failure("schema_version_invalid", "The cover-output manifest must be an object with schemaVersion: 2.");
  if (!["single", "style_pack", "series"].includes(manifest?.mode)) failure("mode_invalid", "mode must be single, style_pack or series.");
  if (!Array.isArray(manifest?.outputs) || !manifest.outputs.length) failure("outputs_missing", "outputs must contain at least one actual image file.");
  const outputs = Array.isArray(manifest?.outputs) ? manifest.outputs : [];
  const seenFiles = new Map(), seenHashes = new Map(), seenSurfaces = new Set();
  const reviewedOutputs = [];
  for (const [index, output] of outputs.entries()) {
    const context = { outputIndex: index, itemId: nonempty(output?.itemId) ? output.itemId.trim() : null, file: output?.file ?? null };
    const result = { ...context, engine: output?.engine ?? null, requestedRatio: output?.requestedRatio ?? null, sourceFile: output?.sourceFile ?? null, reviewAccepted: false };
    report.outputs.push(result);
    if (!output || typeof output !== "object" || Array.isArray(output)) { failure("output_invalid", "Each output must be an object.", context); continue; }
    if (!["imagegen", "html"].includes(output.engine)) failure("engine_invalid", "Record the actual imagegen or html engine; source provenance cannot be inferred from a filename.", context);
    if (output.engine === "imagegen" && !nonempty(output.sourceFile)) failure("tool_original_required", "An imagegen cover must retain and reference its actual tool original; null sourceFile is reserved for an independently authored HTML canvas.", context);
    if (manifest?.mode === "style_pack" && !context.itemId) failure("item_id_required", "Each style_pack output needs itemId so sibling ratios are not mistaken for different styles.", context);
    if (!Array.isArray(output.transforms)) failure("transforms_missing", "transforms must be explicitly recorded as an array; an original cover uses [].", context);
    else if (output.transforms.length) failure("transform_not_allowed", "Original-cover validation rejects every declared transform, including padding, stretch, crop and resize. Compose an independent full canvas.", { ...context, transforms: output.transforms });
    if (!Object.hasOwn(output, "sourceFile") || (output.sourceFile != null && output.sourceFile !== "" && !nonempty(output.sourceFile))) {
      failure("source_file_invalid", "Record sourceFile as the unmodified tool-original path, or null/empty for an independent HTML canvas.", context);
    }

    let ratio;
    try { ratio = requestedRatio(output.requestedRatio); result.expectedRatio = ratio.value; }
    catch (error) { failure("requested_ratio_invalid", error.message, context); }
    if (context.itemId && ratio) {
      const surface = JSON.stringify([context.itemId, ratio.key]);
      if (seenSurfaces.has(surface)) failure("duplicate_item_surface", "The same itemId and ratio appear more than once; record a separate item or deliver only one final surface.", context);
      seenSurfaces.add(surface);
    }

    let actual;
    if (!nonempty(output.file)) failure("output_file_invalid", "file must be an actual local PNG/JPEG path.", context);
    else {
      const resolved = path.resolve(base, output.file);
      result.absoluteFile = resolved;
      try {
        actual = await imageFile(resolved);
        result.actualWidth = actual.width; result.actualHeight = actual.height;
        result.encodedWidth = actual.encodedWidth; result.encodedHeight = actual.encodedHeight;
        result.orientation = actual.orientation; result.format = actual.format;
        result.actualRatio = actual.width / actual.height;
        result.sha256 = actual.sha256; result.bytes = actual.bytes; result.realFile = actual.resolvedFile;
        if (seenFiles.has(actual.resolvedFile)) failure("duplicate_output", "The same actual image file is repeated through a path or symlink.", { ...context, previousOutputIndex: seenFiles.get(actual.resolvedFile) });
        else if (seenHashes.has(actual.sha256)) failure("duplicate_output_content", "Two output paths contain the same complete image bytes; a renamed copy is not a new cover.", { ...context, previousOutputIndex: seenHashes.get(actual.sha256) });
        seenFiles.set(actual.resolvedFile, index); seenHashes.set(actual.sha256, index);
        if (ratio) {
          result.ratioRelativeError = Math.abs(result.actualRatio / ratio.value - 1);
          if (result.ratioRelativeError > RATIO_TOLERANCE + 1e-12) failure("ratio_mismatch", `Actual image is ${actual.width}×${actual.height} (${result.actualRatio.toFixed(6)}:1), requested ${output.requestedRatio}; relative error ${(result.ratioRelativeError * 100).toFixed(3)}% exceeds 1%.`, context);
        }
      } catch (error) {
        failure(error.code || /regular image file/u.test(error.message) ? "output_file_unreadable" : "image_invalid", error.message, context);
      }
    }
    if (nonempty(output.sourceFile)) {
      const sourcePath = path.resolve(base, output.sourceFile);
      result.absoluteSourceFile = sourcePath;
      try {
        const source = await imageFile(sourcePath);
        result.source = source;
        if (actual && (source.width !== actual.width || source.height !== actual.height)) failure("source_dimensions_changed", `The original is ${source.width}×${source.height}, but the output is ${actual.width}×${actual.height}; do not validate a transformed image as an original.`, context);
        if (actual && source.sha256 !== actual.sha256) failure("source_image_changed", "The output bytes differ from sourceFile; this gate accepts an unchanged tool original or its byte-for-byte copy, not an undeclared edit.", context);
      } catch (error) { failure("source_file_unreadable", `Cannot verify sourceFile: ${error.message}`, context); }
    }

    if (!output.review || typeof output.review !== "object" || Array.isArray(output.review)) failure("review_missing", "A complete recorded visual review is required even when dimensions are correct.", context);
    else {
      let reviewComplete = true;
      for (const field of REVIEW_FLAGS) {
        if (output.review[field] !== true) {
          reviewComplete = false;
          failure("review_flag_not_true", `review.${field} must explicitly be true after inspection; the script cannot inspect this visually.`, { ...context, field });
        }
      }
      const composition = {};
      for (const field of COMPOSITION_FIELDS) {
        if (!nonempty(output.review[field])) {
          reviewComplete = false;
          failure("composition_field_missing", `review.${field} must describe the actual rendered cover, not the planned preset.`, { ...context, field });
        } else composition[field] = normalized(output.review[field]);
      }
      result.reviewAccepted = reviewComplete;
      result.recordedComposition = composition;
      if (reviewComplete && context.itemId && ratio) reviewedOutputs.push({ ...context, ratioKey: ratio.key, requestedRatio: output.requestedRatio, composition });
    }
  }

  if (manifest?.mode === "style_pack") {
    const items = new Map();
    for (const output of reviewedOutputs) {
      if (!items.has(output.itemId)) items.set(output.itemId, []);
      items.get(output.itemId).push(output);
    }
    if (items.size < 2) failure("style_pack_items_insufficient", "A style_pack needs at least two distinct, fully reviewed itemIds.");
    const groups = [...items.entries()];
    for (let leftIndex = 0; leftIndex < groups.length; leftIndex++) {
      for (let rightIndex = leftIndex + 1; rightIndex < groups.length; rightIndex++) {
        const [leftId, left] = groups[leftIndex], [rightId, right] = groups[rightIndex];
        const pairs = [];
        for (const a of left) {
          const b = right.find(output => output.ratioKey === a.ratioKey);
          if (b) pairs.push([a, b]);
        }
        if (!pairs.length) pairs.push([left[0], right[0]]);
        for (const [a, b] of pairs) {
          const differingFields = COMPOSITION_FIELDS.filter(field => a.composition[field] !== b.composition[field]);
          const repeatedCore = CORE_COMPOSITION_FIELDS.every(field => a.composition[field] === b.composition[field]);
          const comparison = { leftItemId: leftId, rightItemId: rightId, leftOutputIndex: a.outputIndex, rightOutputIndex: b.outputIndex, ratios: [a.requestedRatio, b.requestedRatio], comparableRatio: a.ratioKey === b.ratioKey, differingFields, differenceCount: differingFields.length, repeatedCore, basis: "recorded_visual_review_fields" };
          report.comparisons.push(comparison);
          if (differingFields.length < 2) failure("composition_distance_insufficient", `Items ${leftId} and ${rightId} differ in only ${differingFields.length} recorded composition fields; at least two are required. Different style IDs do not satisfy this gate.`, { leftItemId: leftId, rightItemId: rightId, outputIndices: [a.outputIndex, b.outputIndex] });
          if (repeatedCore) failure("composition_repeated", `Items ${leftId} and ${rightId} repeat portraitSide, poseCategory and layoutGrammar; color/material or object swaps do not create an independent composition.`, { leftItemId: leftId, rightItemId: rightId, outputIndices: [a.outputIndex, b.outputIndex] });
        }
      }
    }
  }
  report.status = report.failures.length ? "rejected" : "validated";
  report.failureCount = report.failures.length;
  return report;
}

function parse(args) {
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) return { help: true };
  const result = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--out") {
      if (result.out || !args[index + 1] || args[index + 1].startsWith("--")) throw new Error("--out requires one report path and may appear only once.");
      result.out = path.resolve(args[++index]);
    } else if (arg.startsWith("-")) throw new Error(`Unknown option ${arg}. ${usage}`);
    else if (!result.manifest) result.manifest = path.resolve(arg);
    else throw new Error(usage);
  }
  if (!result.manifest) throw new Error(usage);
  return result;
}

async function main() {
  let args, report;
  try { args = parse(process.argv.slice(2)); }
  catch (error) { report = { schemaVersion: 2, status: "rejected", failureCount: 1, failures: [{ code: "cli_invalid", message: error.message }], outputs: [], comparisons: [] }; }
  if (args?.help) { console.log(usage); return; }
  if (args) {
    let manifest;
    try { manifest = JSON.parse(await readFile(args.manifest, "utf8")); }
    catch (error) { report = { schemaVersion: 2, manifest: args.manifest, status: "rejected", failureCount: 1, failures: [{ code: "manifest_unreadable", message: error.message }], outputs: [], comparisons: [] }; }
    if (!report) report = await validateManifest(manifest, args.manifest);
    if (args.out) {
      const protectedPaths = new Set([args.manifest, ...report.outputs.flatMap(output => [output.absoluteFile, output.realFile, output.absoluteSourceFile, output.source?.resolvedFile]).filter(Boolean)]);
      for (const protectedPath of [...protectedPaths]) protectedPaths.add(await realpath(protectedPath).catch(() => protectedPath));
      const actualOut = await realpath(args.out).catch(() => args.out);
      const protectedIdentities = new Set();
      for (const protectedPath of protectedPaths) {
        const info = await stat(protectedPath).catch(() => null);
        if (info?.isFile()) protectedIdentities.add(`${info.dev}:${info.ino}`);
      }
      const reportInfo = await stat(args.out).catch(() => null);
      const reportAliasesInput = reportInfo?.isFile() && protectedIdentities.has(`${reportInfo.dev}:${reportInfo.ino}`);
      if (path.extname(args.out).toLowerCase() !== ".json" || protectedPaths.has(args.out) || protectedPaths.has(actualOut) || reportAliasesInput) {
        report.failures.push({ code: "report_path_conflict", message: "--out must be a JSON report path distinct from the manifest and every original/output image. No input was overwritten." });
        report.status = "rejected"; report.failureCount = report.failures.length;
      } else {
        try { await writeFile(args.out, JSON.stringify(report, null, 2) + "\n"); }
        catch (error) { report.failures.push({ code: "report_write_failed", message: error.message }); report.status = "rejected"; report.failureCount = report.failures.length; }
      }
    }
  }
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === "validated" ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    console.log(JSON.stringify({ schemaVersion: 2, status: "rejected", failureCount: 1, failures: [{ code: "validation_error", message: error.message }], outputs: [], comparisons: [] }, null, 2));
    process.exitCode = 1;
  });
}
