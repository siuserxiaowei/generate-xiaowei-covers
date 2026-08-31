#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_COUNT = 9;
const DEFAULT_WIDTH = 1280;
const DEFAULT_START = 0.04;
const DEFAULT_END = 0.96;

function usage() {
  return [
    "Usage: node extract-video-frames.mjs <video> [output-dir] [options]",
    "",
    "Extracts evenly distributed cover candidates and a contact sheet without API calls.",
    "The output directory must not already exist.",
    "",
    "Options:",
    `  --count <3-24>       Candidate count (default: ${DEFAULT_COUNT})`,
    `  --width <640-2560>   Maximum candidate width (default: ${DEFAULT_WIDTH})`,
    `  --start <0-1>        Start position as a fraction of duration (default: ${DEFAULT_START})`,
    `  --end <0-1>          End position as a fraction of duration (default: ${DEFAULT_END})`,
    "  -h, --help           Show this help",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function parseNumber(raw, label) {
  const value = Number(raw);
  if (!Number.isFinite(value)) fail(`${label} must be a number.`);
  return value;
}

function parseArgs(args) {
  const positionals = [];
  const options = {
    count: DEFAULT_COUNT,
    width: DEFAULT_WIDTH,
    start: DEFAULT_START,
    end: DEFAULT_END,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (["--count", "--width", "--start", "--end"].includes(arg)) {
      const raw = args[index + 1];
      if (raw == null || raw.startsWith("--")) fail(`${arg} requires a value.`);
      options[arg.slice(2)] = parseNumber(raw, arg);
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) fail(`Unknown option: ${arg}\n${usage()}`);
    positionals.push(arg);
  }

  if (positionals.length < 1 || positionals.length > 2) fail(usage());
  if (!Number.isInteger(options.count) || options.count < 3 || options.count > 24) {
    fail("--count must be an integer from 3 to 24.");
  }
  if (!Number.isInteger(options.width) || options.width < 640 || options.width > 2560) {
    fail("--width must be an integer from 640 to 2560.");
  }
  if (options.start < 0 || options.start >= 1) fail("--start must be at least 0 and less than 1.");
  if (options.end <= 0 || options.end > 1) fail("--end must be greater than 0 and at most 1.");
  if (options.start >= options.end) fail("--start must be smaller than --end.");

  return {
    help: false,
    videoArg: positionals[0],
    outputArg: positionals[1],
    ...options,
  };
}

function run(executable, args, label) {
  const result = spawnSync(executable, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error?.code === "ENOENT") fail(`${executable} is required but was not found in PATH.`);
  if (result.error) fail(`${label} failed: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "unknown error").trim();
    fail(`${label} failed${detail ? `: ${detail}` : "."}`);
  }
  return result.stdout.trim();
}

function probeDuration(videoPath) {
  const output = run(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ],
    "Video duration probe",
  );
  const duration = Number(output);
  if (!Number.isFinite(duration) || duration <= 0) fail(`Could not read a positive duration from ${videoPath}.`);
  return duration;
}

export function candidateTimestamps(duration, count, startFraction, endFraction) {
  if (!Number.isFinite(duration) || duration <= 0) fail("duration must be positive.");
  const first = duration * startFraction;
  const last = Math.max(first, Math.min(duration - 0.05, duration * endFraction));
  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0.5 : index / (count - 1);
    return Number((first + (last - first) * ratio).toFixed(3));
  });
}

function safeStem(filePath) {
  const stem = path.basename(filePath, path.extname(filePath));
  return stem.replace(/[^\p{Letter}\p{Number}._-]+/gu, "-").replace(/^-+|-+$/gu, "") || "video";
}

function timestampLabel(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}-${remainder.toFixed(2).padStart(5, "0")}`;
}

function reviewMarkdown(videoPath, duration, frames) {
  const lines = [
    "# Video Cover Frame Review",
    "",
    `- Source: \`${videoPath}\``,
    `- Duration: ${duration.toFixed(2)} seconds`,
    `- Candidates: ${frames.length}`,
    "",
    "Open `contact-sheet.jpg` first, then inspect the strongest 2–3 original JPEGs.",
    "",
    "## Selection criteria",
    "",
    "1. The frame must explain the topic, not merely look attractive.",
    "2. Prefer sharp UI, readable evidence, complete gestures, and useful title space.",
    "3. Reject intros, loading states, motion blur, duplicate poses, and accidental expressions.",
    "4. Keep a real frame as evidence; do not repaint it into a fake product screen.",
    "",
    "## Candidates",
    "",
    "| Candidate | Timestamp | File | Decision |",
    "|---|---:|---|---|",
    ...frames.map((frame) => `| ${frame.index} | ${frame.timestamp.toFixed(2)}s | \`${frame.file}\` |  |`),
    "",
    "## Selected frame",
    "",
    "- File:",
    "- Why it represents the content:",
    "- Crop / safe-area note:",
    "",
  ];
  return lines.join("\n");
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    console.log(usage());
    return;
  }

  const videoPath = path.resolve(parsed.videoArg);
  const videoInfo = await stat(videoPath).catch(() => null);
  if (!videoInfo?.isFile()) fail(`Video file does not exist: ${videoPath}`);

  const stem = safeStem(videoPath);
  const outputDir = path.resolve(
    parsed.outputArg || path.join(path.dirname(videoPath), `${stem}.cover-frames`),
  );
  if (outputDir === path.parse(outputDir).root) fail("Refusing to use a filesystem root as output.");
  if (outputDir === videoPath) fail("Output directory cannot be the input video.");
  try {
    await access(outputDir);
    fail(`Output directory already exists; nothing was changed: ${outputDir}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  run("ffmpeg", ["-version"], "ffmpeg check");
  const duration = probeDuration(videoPath);
  const timestamps = candidateTimestamps(
    duration,
    parsed.count,
    parsed.start,
    parsed.end,
  );

  const parentDir = path.dirname(outputDir);
  await mkdir(parentDir, { recursive: true });
  const tempDir = await mkdtemp(path.join(parentDir, `.${stem}.cover-frames-`));

  try {
    const frames = [];
    for (const [offset, timestamp] of timestamps.entries()) {
      const index = offset + 1;
      const file = `candidate-${String(index).padStart(2, "0")}-${timestampLabel(timestamp)}s.jpg`;
      const outputPath = path.join(tempDir, file);
      run(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-ss",
          timestamp.toFixed(3),
          "-i",
          videoPath,
          "-frames:v",
          "1",
          "-vf",
          `scale=${parsed.width}:-2:force_original_aspect_ratio=decrease`,
          "-q:v",
          "2",
          outputPath,
        ],
        `Frame extraction at ${timestamp.toFixed(2)}s`,
      );
      frames.push({ index, timestamp, file });
    }

    const columns = Math.ceil(Math.sqrt(frames.length));
    const rows = Math.ceil(frames.length / columns);
    run(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-framerate",
        "1",
        "-pattern_type",
        "glob",
        "-i",
        path.join(tempDir, "candidate-*.jpg"),
        "-vf",
        `scale=360:-2,tile=${columns}x${rows}:padding=12:margin=12:color=0xf7f4ec`,
        "-frames:v",
        "1",
        path.join(tempDir, "contact-sheet.jpg"),
      ],
      "Contact sheet generation",
    );

    const manifest = {
      schemaVersion: 1,
      source: videoPath,
      durationSeconds: Number(duration.toFixed(3)),
      strategy: "even-temporal-sampling",
      range: { startFraction: parsed.start, endFraction: parsed.end },
      maximumWidth: parsed.width,
      frames,
    };
    await writeFile(path.join(tempDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(path.join(tempDir, "REVIEW.md"), reviewMarkdown(videoPath, duration, frames));
    await rename(tempDir, outputDir);
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }

  console.log(`Extracted ${parsed.count} cover candidates to ${outputDir}`);
  console.log(`Contact sheet: ${path.join(outputDir, "contact-sheet.jpg")}`);
  console.log(`Review guide: ${path.join(outputDir, "REVIEW.md")}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = path.resolve(fileURLToPath(import.meta.url));
if (invokedPath === modulePath) {
  main().catch((error) => {
    console.error(`extract-video-frames: ${error.message}`);
    process.exitCode = 1;
  });
}
