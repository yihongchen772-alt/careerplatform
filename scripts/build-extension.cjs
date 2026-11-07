// Assembles the Chrome/Edge extension into public/jobcompass-extension.zip for
// download from 设置 → 浏览器插件. Run after changing extension/ or extension-core/
// and commit the zip: the build server doesn't need to know how to make it.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "jobcompass-extension-"));
const out = path.join(work, "jobcompass-extension");
fs.cpSync(path.join(root, "extension"), out, { recursive: true });

const manifestFile = path.join(out, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
manifest.version = process.argv[2] || "1.63.2";
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");

const core = fs.readFileSync(path.join(root, "extension-core", "autofill-core.js"), "utf8");
fs.mkdirSync(path.join(out, "lib"), { recursive: true });
fs.writeFileSync(
  path.join(out, "lib", "autofill-core.js"),
  `// Generated from extension-core/autofill-core.js by scripts/build-extension.cjs — do not edit.\n(function () {\nconst module = { exports: {} };\nconst exports = module.exports;\n${core}\nself.JobCompassCore = module.exports;\n})();\n`
);

const zip = path.join(root, "public", "jobcompass-extension.zip");
fs.rmSync(zip, { force: true });
execFileSync("zip", ["-qr", zip, "jobcompass-extension"], { cwd: work });
console.log(out);
