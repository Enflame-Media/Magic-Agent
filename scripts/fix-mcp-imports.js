#!/usr/bin/env node

/**
 * Post-build script to fix import issues in pkgroll output
 *
 * Fixes:
 * 1. MCP SDK imports: pkgroll incorrectly transforms .js extensions to .ts
 * 2. CJS-to-ESM interop: pkgroll generates default imports for packages that
 *    only have named exports, causing runtime failures (HAP-964)
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = glob.sync('dist/**/*.{mjs,cjs}');

files.forEach(file => {
  let content = readFileSync(file, 'utf-8');
  const original = content;

  // Fix MCP SDK imports: .ts -> .js
  content = content.replace(
    /@modelcontextprotocol\/sdk\/([^'"]*)\.ts(['"])/g,
    '@modelcontextprotocol/sdk/$1.js$2'
  );

  // Fix CJS-to-ESM interop default imports in .mjs files (HAP-964)
  //
  // pkgroll uses rollup's CJS interop which generates patterns like:
  //   import require$$1, { named1, named2 } from 'pkg';
  //   import z__default, { z as z$1 } from 'zod';
  //
  // These fail at runtime because ESM packages may not have a default export,
  // or their default export doesn't match the CJS module namespace that the
  // bundled code expects (e.g., accessing `z__default.z` when z__default IS z).
  //
  // Fix: Convert `import NAME, { ... } from 'pkg'` to
  //      `import * as NAME from 'pkg'; import { ... } from 'pkg'`
  // This gives the code the full module namespace, matching CJS require() behavior.
  if (file.endsWith('.mjs')) {
    content = content.replace(
      /^(import\s+)(\w[\w$]*)(,\s*\{([^}]+)\}\s*from\s*('[^']+'|"[^"]+"))/gm,
      (match, importKw, defaultName, _rest, namedList, modulePath) => {
        // Only fix CJS interop patterns (require$$N or __default suffix)
        // Don't touch legitimate default imports from Node.js built-ins
        const isCjsInterop = /^require\$\$\d+/.test(defaultName) || defaultName.endsWith('__default');
        const isNodeBuiltin = /^['"]node:/.test(modulePath) || ['child_process', 'util', 'crypto', 'path', 'os', 'fs', 'url', 'http', 'https', 'stream', 'events', 'process'].some(m => modulePath === `'${m}'` || modulePath === `"${m}"`);

        if (!isCjsInterop || isNodeBuiltin) {
          return match; // Leave unchanged
        }

        return `import * as ${defaultName} from ${modulePath};\n${importKw}{${namedList}} from ${modulePath}`;
      }
    );
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf-8');
    console.log(`Fixed imports in ${file}`);
  }
});

console.log('MCP import fix complete');
