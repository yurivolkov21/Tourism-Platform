// Guardrail: no raw hex colors in hand-authored styles — use @tourism/tokens instead
// (CLAUDE.md: "no hex colors"). Scans authored .css only; excludes generated artifacts,
// vendored shadcn components, dependencies, and build output. Wire into CI / the gate.
//
// Run: node tools/check-no-hex.mjs   (or: pnpm check:no-hex)

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['apps', 'libs'];
const EXCLUDE_DIRS = new Set([
  'node_modules', '.next', 'dist', 'generated', 'out-tsc', '.nx', 'coverage',
]);
const EXCLUDE_PATH = ['components/ui']; // vendored shadcn (third-party defaults)
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

function walk(dir, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) walk(join(dir, entry.name), acc);
    } else if (entry.name.endsWith('.css')) {
      acc.push(join(dir, entry.name));
    }
  }
  return acc;
}

const files = ROOTS.flatMap((root) => walk(root, [])).filter(
  (f) => !EXCLUDE_PATH.some((p) => f.replaceAll('\\', '/').includes(p)),
);

const offenders = [];
for (const file of files) {
  readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    const hits = line.match(HEX);
    if (hits) offenders.push(`${file}:${i + 1}  ${hits.join(', ')}`);
  });
}

if (offenders.length > 0) {
  console.error('[no-hex] Raw hex found in authored CSS — use @tourism/tokens instead:');
  offenders.forEach((o) => console.error('  ' + o));
  process.exit(1);
}
console.log(`[no-hex] OK — scanned ${files.length} authored CSS file(s), no raw hex.`);
