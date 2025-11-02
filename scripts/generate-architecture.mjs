#!/usr/bin/env node
import { exec } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const pexec = promisify(exec);

const run = async () => {
  const projectRoot = resolve(process.cwd());
  const outDir = resolve(projectRoot, 'docs');
  const dotPath = resolve(outDir, 'architecture.dot');
  const svgPath = resolve(outDir, 'architecture.svg');

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const include = [
    'components',
    'services',
    'utils',
    'contracts',
    'server',
  ]
    .map(d => `^(./)?${d}(/|$)`) // regex for dependency-cruiser
    .join('|');

  const cmdCruise = `npx --yes dependency-cruiser --include-only '${include}' --exclude '^node_modules' --output-type dot .`;
  const cmdDot = `dot -Tsvg "${dotPath}" -o "${svgPath}"`;

  console.log('Generating dependency graph (DOT)...');
  const { stdout: dotOut } = await pexec(cmdCruise, { cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 });
  writeFileSync(dotPath, dotOut, 'utf8');

  console.log('Rendering SVG with graphviz...');
  await pexec(cmdDot, { cwd: projectRoot });

  console.log(`Architecture graph updated at docs/architecture.svg`);
};

await run();
