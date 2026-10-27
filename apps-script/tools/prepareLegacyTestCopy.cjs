#!/usr/bin/env node
"use strict";

// Build a PRIVATE JSON copy of the audited Google Apps Script project.
// This tool never reaches production and refuses changes to unknown code.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");

const OLD_NAME = "123";
const SAFE_NAME = "dartconnectLegacyImport.";
const OLD_START = "function buildDCMatches() {";
const OLD_END = "function opdaterEloKlubaften() {";
const VERIFIED_OLD_SHA = "4cf8bc487bf755e9d2930386caf6fc168650d72d71dcad14b3af545a648e5ed1";
const OLD_WIN_TOKENS = '"y", "win",';
const NEW_WIN_TOKENS = '"y", "w", "win",';

// Menus are resolved in the private test copy only. Both audited blocks
// are checksum-pinned so unrelated/updated production code is never changed.
const LIVE_OPEN_END = "function copyLiveFormatting() {";
const MENU_OPEN_END = "function chooseImportSource() {";
const ON_OPEN = "function onOpen() {";
const VERIFIED_LIVE_OPEN_SHA = "1e13a1679933f3ad7d8ea93d2296f387ab9bcf2d02fc1d64da975dcf86b3fda6";
const VERIFIED_MENU_OPEN_SHA = "6ddbbf9b9c8b6804104325a68f5b1e1492a5ac7a0c43758252f8df069958d5d1";
const MERGED_ON_OPEN = [
  "function onOpen() {",
  "  const ui = SpreadsheetApp.getUi();",
  '  ui.createMenu("🎯 Dart")',
  '    .addItem("Opdater turnering", "runTournamentUpdate")',
  "    .addToUi();",
  '  ui.createMenu("🎯 DartConnect")',
  '    .addItem("Importer...", "chooseImportSource")',
  "    .addToUi();",
  "}",
  "",
  "",
].join("\n");

function digest(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function replaceVerifiedBlock(source, startMarker, endMarker, expectedHash, replacement) {
  const start = source.indexOf(startMarker);
  if (start < 0 || source.indexOf(startMarker, start + 1) >= 0) {
    throw new Error("Expected exactly one legacy match builder");
  }
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0 || source.indexOf(endMarker, end + 1) >= 0) {
    throw new Error("Expected exactly one following function boundary");
  }
  const original = source.slice(start, end);
  if (digest(original) !== expectedHash) {
    throw new Error("Legacy builder source differs from the audited version; review required");
  }
  return source.slice(0, start) + replacement + source.slice(end);
}

function prepareTestCopy(original) {
  if (!original || !Array.isArray(original.files)) {
    throw new Error("Expected an Apps Script JSON export containing files");
  }
  const scripts = original.files.filter((f) => f && f.type === "server_js");
  const old = scripts.filter((f) => f.name === OLD_NAME);
  const safe = scripts.filter((f) => f.name === SAFE_NAME);
  const live = scripts.filter((f) => f.name === "Live");
  const menu = scripts.filter((f) => f.name === "Menu");
  if (old.length !== 1 || safe.length !== 1 || live.length !== 1 || menu.length !== 1) {
    throw new Error("Expected exactly one each of 123, dartconnectLegacyImport., Live and Menu");
  }
  // Never guess which implementation will win in Apps Script.
  const globals = scripts.flatMap((f) =>
    [...f.source.matchAll(/^function buildDCMatches\s*\(/gm)].map(() => f.name));
  if (globals.length !== 2 || !globals.includes(OLD_NAME) || !globals.includes(SAFE_NAME)) {
    throw new Error("Unexpected number/location of global buildDCMatches functions");
  }
  const openEntrypoints = scripts.flatMap((f) =>
    [...f.source.matchAll(/^function onOpen\s*\(/gm)].map(() => f.name));
  if (openEntrypoints.length !== 2 || !openEntrypoints.includes("Live") ||
      !openEntrypoints.includes("Menu")) {
    throw new Error("Unexpected number/location of global onOpen functions");
  }
  if (!safe[0].source.includes("function buildDCMatches(options) {") ||
      safe[0].source.split(OLD_WIN_TOKENS).length !== 2) {
    throw new Error("Safe importer differs from audited source; review required");
  }
  const replacement =
    "// Destructive ELO-flag-resetting builder retired in this PRIVATE test copy.\n" +
    "// The original is preserved in the untouched source export.\n\n";
  const oldPatched = replaceVerifiedBlock(
    old[0].source, OLD_START, OLD_END, VERIFIED_OLD_SHA, replacement,
  );
  const safePatched = safe[0].source.replace(OLD_WIN_TOKENS, NEW_WIN_TOKENS);
  const livePatched = replaceVerifiedBlock(
    live[0].source, ON_OPEN, LIVE_OPEN_END, VERIFIED_LIVE_OPEN_SHA,
    "// onOpen merged into Menu in this PRIVATE test copy.\n\n",
  );
  const menuPatched = replaceVerifiedBlock(
    menu[0].source, ON_OPEN, MENU_OPEN_END, VERIFIED_MENU_OPEN_SHA, MERGED_ON_OPEN,
  );
  const result = {
    ...original,
    files: original.files.map((file) => {
      if (file === old[0]) return { ...file, source: oldPatched };
      if (file === safe[0]) return { ...file, source: safePatched };
      if (file === live[0]) return { ...file, source: livePatched };
      if (file === menu[0]) return { ...file, source: menuPatched };
      return { ...file };
    }),
  };
  const allScripts = result.files.filter((f) => f.type === "server_js");
  for (const file of allScripts) {
    new vm.Script(file.source, { filename: file.name + ".gs" });
  }
  const remaining = allScripts.flatMap((f) =>
    [...f.source.matchAll(/^function buildDCMatches\s*\(/gm)].map(() => f.name));
  if (remaining.length !== 1 || remaining[0] !== SAFE_NAME) {
    throw new Error("Expected one remaining data-preserving buildDCMatches");
  }
  const remainingOpen = allScripts.flatMap((f) =>
    [...f.source.matchAll(/^function onOpen\s*\(/gm)].map(() => f.name));
  if (remainingOpen.length !== 1 || remainingOpen[0] !== "Menu") {
    throw new Error("Expected one merged onOpen entrypoint in Menu");
  }
  return result;
}

function insideRepository(filePath) {
  for (let current = path.dirname(filePath);; current = path.dirname(current)) {
    if (fs.existsSync(path.join(current, ".git"))) return true;
    if (current === path.dirname(current)) return false;
  }
}

if (require.main === module) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    process.stderr.write(
      "Usage: node prepareLegacyTestCopy.cjs <PRIVATE-original.json> <PRIVATE-new-test.json>\n");
    process.exitCode = 2;
  } else {
    try {
      const src = path.resolve(input);
      const dst = path.resolve(output);
      if (src === dst) throw new Error("Input and output must be different");
      if (insideRepository(dst)) throw new Error("Refusing to put private source in a Git checkout");
      const project = JSON.parse(fs.readFileSync(src, "utf8"));
      const prepared = prepareTestCopy(project);
      fs.writeFileSync(dst, JSON.stringify(prepared, null, 2) + "\n",
        { encoding: "utf8", flag: "wx", mode: 0o600 });
      process.stdout.write(
        "Private test copy created; one safe buildDCMatches and one merged onOpen remain; W recognized.\n");
    } catch (err) {
      process.stderr.write("Stopped without modifying input: " + err.message + "\n");
      process.exitCode = 1;
    }
  }
}

module.exports = { digest, replaceVerifiedBlock, prepareTestCopy, insideRepository, MERGED_ON_OPEN, VERIFIED_LIVE_OPEN_SHA, VERIFIED_MENU_OPEN_SHA };
