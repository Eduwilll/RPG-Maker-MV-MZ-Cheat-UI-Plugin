import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const scanRoots = [
  path.join(projectRoot, "cheat-engine", "www", "cheat"),
  path.join(projectRoot, "cheat-engine", "www", "_cheat_initialize"),
];

const ignoredDirNames = new Set(["libs", ".git", "node_modules"]);
const allowedExtensions = new Set([".js", ".mjs"]);

const checks = [
  {
    id: "optional-chaining",
    description: "Optional chaining is not safe for older MV parsers",
    pattern: /\?\.(?!\d)/g,
  },
  {
    id: "nullish-coalescing",
    description: "Nullish coalescing is not safe for older MV parsers",
    pattern: /\?\?(?![=])/g,
  },
  {
    id: "logical-assignment",
    description: "Logical assignment operators are not safe for older MV parsers",
    pattern: /(\|\|=|&&=|\?\?=)/g,
  },
  {
    id: "catch-no-binding",
    description: "catch without a binding can break older MV parsers",
    pattern: /catch\s*\{\s*/g,
  },
  {
    id: "array-flat",
    description: "Array.prototype.flat can fail in older MV runtimes",
    pattern: /\.flat\(/g,
  },
  {
    id: "array-flat-map",
    description: "Array.prototype.flatMap can fail in older MV runtimes",
    pattern: /\.flatMap\(/g,
  },
];

/**
 * @param {string} dirPath
 * @param {string[]} filePaths
 * @returns {void}
 */
function collectFiles(dirPath, filePaths) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredDirNames.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      collectFiles(absolutePath, filePaths);
      continue;
    }

    if (!allowedExtensions.has(path.extname(entry.name))) {
      continue;
    }

    filePaths.push(absolutePath);
  }
}

/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function getLineNumber(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
    }
  }
  return line;
}

/**
 * @param {string} text
 * @param {number} index
 * @returns {string}
 */
function getLineText(text, index) {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  let lineEnd = text.indexOf("\n", index);
  if (lineEnd === -1) {
    lineEnd = text.length;
  }
  return text.slice(lineStart, lineEnd).trim();
}

const filePaths = [];
for (const scanRoot of scanRoots) {
  collectFiles(scanRoot, filePaths);
}

const findings = [];

for (const filePath of filePaths) {
  const text = fs.readFileSync(filePath, "utf8");

  for (const check of checks) {
    check.pattern.lastIndex = 0;
    let match = check.pattern.exec(text);

    while (match) {
      findings.push({
        filePath,
        line: getLineNumber(text, match.index),
        check,
        snippet: getLineText(text, match.index),
      });
      match = check.pattern.exec(text);
    }
  }
}

if (findings.length === 0) {
  console.log(`MV compatibility check passed for ${filePaths.length} files.`);
  process.exit(0);
}

console.error("MV compatibility check failed:");
for (const finding of findings) {
  const relativePath = path.relative(projectRoot, finding.filePath);
  console.error(
    `- ${relativePath}:${finding.line} [${finding.check.id}] ${finding.check.description}`,
  );
  console.error(`  ${finding.snippet}`);
}

process.exit(1);
