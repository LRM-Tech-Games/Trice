// Workaround for a @capacitor/cli bug (v7.6.x): `cap add ios --packagemanager SPM`
// lowercases the flag value before comparing it to the literal string 'SPM', so the
// check never matches and the CLI falls back to CocoaPods (which needs Ruby 3.x).
// This makes the two comparisons case-insensitive. Idempotent; safe to re-run.
// Only relevant when (re)generating the ios/ project — an existing ios/App/CapApp-SPM
// folder is auto-detected as SPM without this.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const target = new URL('../node_modules/@capacitor/cli/dist/index.js', import.meta.url);
if (!existsSync(target)) process.exit(0);

let src = readFileSync(target, 'utf8');
const original = src;
src = src.replace(
  "if (packageManager === 'SPM') {",
  "if (packageManager && String(packageManager).toUpperCase() === 'SPM') {"
);
src = src.replace(
  "if (packagemanager === 'SPM') {",
  "if (packagemanager && String(packagemanager).toUpperCase() === 'SPM') {"
);
if (src !== original) {
  writeFileSync(target, src);
  console.log('[fix-capacitor-spm] patched @capacitor/cli for case-insensitive --packagemanager SPM');
}
