#!/usr/bin/env node
// Benchmark CIL compression on synthetic-but-realistic samples for each tool.
// Run after `npm run build`. Reports % reduction for lite / full / ultra modes.

import { compress } from '../dist/lib/compress.js';

const samples = {
  'git diff (50 hunks)': buildGitDiff(50),
  'npm install (with deprecation noise)': buildNpmInstall(),
  'pytest (200 passes, 3 failures)': buildPytest(200, 3),
  'docker build (12 steps + layer pulls)': buildDocker(),
  'cargo build (50 crates + warnings)': buildCargo(50),
  'tsc (40 errors across 5 files)': buildTsc(40),
  'pip install (50 already satisfied + 5 new)': buildPip(50, 5),
  'generic (mixed warnings)': buildGenericNoisy(),
};

const modes = ['lite', 'full', 'ultra'];

console.log('CIL compression benchmark\n');
console.log('Sample'.padEnd(42), 'Lines  Lite%   Full%   Ultra%');
console.log('-'.repeat(78));

for (const [name, raw] of Object.entries(samples)) {
  const inLines = raw.split('\n').length;
  const ratios = modes.map((m) => ratio(raw, compress(raw, 1000, m)));
  console.log(
    name.padEnd(42),
    String(inLines).padStart(5),
    ...ratios.map((r) => (r + '%').padStart(8)),
  );
}

function ratio(input, output) {
  if (input.length === 0) return 0;
  return Math.round((1 - output.length / input.length) * 100);
}

function buildGitDiff(hunks) {
  const out = [];
  for (let i = 0; i < hunks; i++) {
    out.push(`diff --git a/src/file${i}.ts b/src/file${i}.ts`);
    out.push(`index 1234567..89abcde 100644`);
    out.push(`--- a/src/file${i}.ts`);
    out.push(`+++ b/src/file${i}.ts`);
    out.push(`@@ -1,3 +1,3 @@`);
    out.push(` import { foo } from './foo';`);
    out.push(`-const old = 1;`);
    out.push(`+const fresh = 1;`);
    out.push(` export default fresh;`);
    out.push(`\\ No newline at end of file`);
  }
  return out.join('\n');
}

function buildNpmInstall() {
  const out = [
    'npm timing fetch took 412ms',
    'npm http fetch GET 200 https://registry.npmjs.org/react',
    'npm http fetch GET 200 https://registry.npmjs.org/react-dom',
  ];
  for (let i = 0; i < 30; i++) {
    out.push('npm WARN deprecated lodash.get@4.4.2 use optional chaining');
  }
  out.push('npm WARN deprecated request@2.88.2 deprecated package');
  out.push('npm WARN deprecated har-validator@5.1.5 deprecated');
  out.push('npm sill idealTree buildDeps');
  out.push('added 1234 packages in 12s');
  out.push('found 0 vulnerabilities');
  return out.join('\n');
}

function buildPytest(passes, failures) {
  const out = ['===== test session starts ====='];
  out.push('platform linux -- Python 3.11.0, pytest-7.4.0');
  out.push('collected ' + (passes + failures) + ' items');
  out.push('');
  for (let i = 0; i < passes; i++) {
    out.push(`tests/test_module_${i % 10}.py::test_case_${i} PASSED        [ ${Math.round(((i + 1) / (passes + failures)) * 100)}%]`);
  }
  out.push('===== FAILURES =====');
  for (let i = 0; i < failures; i++) {
    out.push(`_____ test_failure_${i} _____`);
    out.push(`AssertionError: expected X but got Y`);
    out.push(`    at tests/test_failure.py:42`);
  }
  out.push('===== short test summary info =====');
  for (let i = 0; i < failures; i++) {
    out.push(`FAILED tests/test_failure.py::test_failure_${i}`);
  }
  out.push(`===== ${passes} passed, ${failures} failed in 4.32s =====`);
  return out.join('\n');
}

function buildDocker() {
  const out = [];
  for (let i = 0; i < 8; i++) {
    out.push(`${('a' + i).padEnd(12, '0')}: Pulling fs layer`);
  }
  for (let i = 0; i < 8; i++) {
    out.push(`${('a' + i).padEnd(12, '0')}: Pull complete`);
  }
  out.push('Status: Downloaded newer image for node:20');
  for (let i = 1; i <= 12; i++) {
    out.push(`Step ${i}/12 : RUN apt-get install -y package${i}`);
    out.push(` ---> Running in abcdef${i}`);
    out.push(` ---> 0123456789ab`);
    out.push(` ---> Using cache`);
  }
  out.push('Successfully built deadbeef1234');
  out.push('Successfully tagged myapp:latest');
  return out.join('\n');
}

function buildCargo(crates) {
  const out = ['   Updating crates.io index'];
  for (let i = 0; i < crates; i++) {
    out.push(`   Compiling crate_${i} v0.${i}.0`);
  }
  out.push('warning: unused variable: `x`');
  out.push('  --> src/main.rs:42:9');
  out.push('error[E0382]: borrow of moved value: `y`');
  out.push('  --> src/lib.rs:13:5');
  out.push('   Finished `dev` profile [unoptimized + debuginfo] target(s) in 14.32s');
  return out.join('\n');
}

function buildTsc(errors) {
  const out = [];
  const files = ['src/foo.ts', 'src/bar.ts', 'src/baz.ts', 'src/qux.ts', 'src/quux.ts'];
  for (let i = 0; i < errors; i++) {
    const file = files[i % files.length];
    const code = i % 3 === 0 ? 'TS2322' : i % 3 === 1 ? 'TS2304' : 'TS2345';
    out.push(`${file}(${i + 1},${(i % 30) + 1}): error ${code}: Type mismatch.`);
  }
  out.push(`Found ${errors} errors in ${files.length} files.`);
  return out.join('\n');
}

function buildPip(satisfied, neu) {
  const out = [];
  for (let i = 0; i < satisfied; i++) {
    out.push(`Requirement already satisfied: pkg_${i} in /usr/local/lib/python3.11/site-packages (1.0.${i})`);
  }
  for (let i = 0; i < neu; i++) {
    out.push(`Collecting new_pkg_${i}`);
    out.push(`  Downloading new_pkg_${i}-1.0.0-py3-none-any.whl (12 kB)`);
  }
  out.push(`Successfully installed ${Array.from({ length: neu }, (_, i) => 'new_pkg_' + i + '-1.0.0').join(' ')}`);
  return out.join('\n');
}

function buildGenericNoisy() {
  const out = ['build started'];
  for (let i = 0; i < 20; i++) {
    out.push('warning: unused variable foo');
  }
  for (let i = 0; i < 15; i++) {
    out.push('    at fn1 (file.js:10)');
  }
  out.push('\x1b[31merror!\x1b[0m something failed');
  for (let i = 0; i < 5; i++) {
    out.push('---------------');
  }
  out.push('build done');
  return out.join('\n');
}
