#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const indexHtmlPath = path.join(root, 'index.html');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = String(packageJson.version || '').trim();

if (!version) {
  throw new Error('package.json is missing a version');
}

const releaseDate = new Date().toISOString().slice(0, 10);
const versionToken = `v${version}`;

let html = fs.readFileSync(indexHtmlPath, 'utf8');
html = html.replace(/\.\/styles\.css\?v=[^"]+/g, `./styles.css?v=${version}`);
html = html.replace(/<footer class="site-meta">.*?<\/footer>/, `<footer class="site-meta">${versionToken} | ${releaseDate}</footer>`);
html = html.replace(/\.\/js\/main\.js\?v=[^"]+/g, `./js/main.js?v=${version}`);

fs.writeFileSync(indexHtmlPath, html);
console.log(`Stamped ${path.relative(root, indexHtmlPath)} with ${versionToken} | ${releaseDate}`);
