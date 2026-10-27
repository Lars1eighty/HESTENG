#!/usr/bin/env node
"use strict";

/**
 * Offline, read-only inspection for exported Google Apps Script files.
 * Never loads or executes user code. Finds obvious top-level collisions;
 * this is a guardrail, not a substitute for checking the live script project.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function maskCommentsAndStrings(source) {
  // Keep positions, braces and newlines intact. JS template interpolation and
  // regex literals make this a heuristic, so the report requires human review.
  return source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,
    (token) => token.replace(/[^\n]/g, " "),
  );
}

function topLevelNames(source) {
  const clean = maskCommentsAndStrings(source);
  const lines = clean.split("\n");
  const result = [];
  let depth = 0;

  lines.forEach((line, index) => {
    if (depth === 0) {
      const declaration = line.match(
        /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/,
      );
      if (declaration) result.push({ kind: "function", name: declaration[1], line: index + 1 });

      const binding = line.match(
        /^\s*(?:const|let|class)\s+([A-Za-z_$][\w$]*)\b/,
      );
      if (binding) result.push({ kind: "binding", name: binding[1], line: index + 1 });
    }
    for (const char of line) {
      if (char === "{") depth += 1;
      if (char === "}") depth = Math.max(0, depth - 1);
    }
  });
  return result;
}

function inspect(files) {
  const declarations = new Map();
  const syntaxErrors = [];
  let scanned = 0;

  Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).forEach(([file, source]) => {
    scanned += 1;
    try {
      new vm.Script(source, { filename: file });
    } catch (error) {
      syntaxErrors.push({ file, problem: String(error.message) });
    }
    topLevelNames(source).forEach((entry) => {
      const occurrences = declarations.get(entry.name) || [];
      occurrences.push({ file, line: entry.line, kind: entry.kind });
      declarations.set(entry.name, occurrences);
    });
  });

  const duplicateDeclarations = [...declarations.entries()]
    .filter(([, occurrences]) => occurrences.length > 1)
    .map(([name, occurrences]) => ({ name, occurrences }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const entrypoints = [...(declarations.get("doGet") || []), ...(declarations.get("doPost") || [])];
  const criticalFunctions = [
    "doGet", "doPost", "onOpen", "buildDCMatches", "importRecapStats",
    "updateEloFromDCMatches", "opdaterKlubaften", "opdaterEloKlubaften",
  ];
  const foundCritical = Object.fromEntries(criticalFunctions
    .filter((name) => declarations.has(name))
    .map((name) => [name, declarations.get(name)]));

  return {
    scanned,
    duplicateDeclarations,
    syntaxErrors,
    entrypoints,
    criticalFunctions: foundCritical,
    note: "Only supplied files were inspected. The active Apps Script project was NOT queried.",
  };
}

function walk(folder) {
  const files = {};
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) Object.assign(files, walk(full));
    else if (entry.isFile() && /\.gs(?:\.gs)?$/.test(entry.name)) {
      files[full] = fs.readFileSync(full, "utf8");
    }
  }
  return files;
}

if (require.main === module) {
  const folder = path.resolve(process.argv[2] || path.join(__dirname, ".."));
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    process.stderr.write("Usage: node apps-script/tools/auditLegacySource.cjs [script-export-directory]\n");
    process.exitCode = 2;
  } else {
    const report = inspect(walk(folder));
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    if (report.syntaxErrors.length || report.duplicateDeclarations.length) process.exitCode = 1;
  }
}

module.exports = { inspect, topLevelNames, maskCommentsAndStrings };
