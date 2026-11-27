import { mkdir, readFile, writeFile } from 'node:fs/promises';

const assetTypes = {
  'index.html': 'text/html; charset=utf-8',
  'training.css': 'text/css; charset=utf-8',
  'training.js': 'text/javascript; charset=utf-8',
  'safety.js': 'text/javascript; charset=utf-8',
  'goals.js': 'text/javascript; charset=utf-8',
  'sync.js': 'text/javascript; charset=utf-8',
  'manifest.webmanifest': 'application/manifest+json; charset=utf-8',
  'icon-192.png': 'image/png',
  'icon-512.png': 'image/png',
};
const assets = await Promise.all(Object.entries(assetTypes).map(async ([name, type]) => {
  const binary = type.startsWith('image/');
  const body = binary
    ? (await readFile(new URL('../app/' + name + '.base64', import.meta.url), 'utf8')).trim()
    : await readFile(new URL('../app/' + name, import.meta.url), 'utf8');
  return [name === 'index.html' ? '/' : '/' + name, { type, body, binary }];
}));
const worker = await readFile(new URL('../worker/index.js', import.meta.url), 'utf8');
const output = new URL('../dist/server/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('index.js', output), 'const ASSETS = ' +
  JSON.stringify(Object.fromEntries(assets)) + ';\n' + worker);
