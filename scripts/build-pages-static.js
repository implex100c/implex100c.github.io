#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'dist');

function resetDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyIntoDist(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const destinationPath = path.join(outDir, relativePath);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.cpSync(sourcePath, destinationPath, { recursive: true });
}

resetDir(outDir);
copyIntoDist('index.html');
copyIntoDist('styles.css');
copyIntoDist('js');

console.log(`Prepared Cloudflare Pages assets in ${outDir}`);
