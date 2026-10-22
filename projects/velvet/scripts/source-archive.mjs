import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, sep } from 'node:path';
import { zipSync } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
const slug = 'velvet';
const fixedTime = new Date(2000, 0, 1);
const required = ['README.md', 'INTEGRATE.md', 'LICENSE', 'ATTRIBUTION.md', 'project.json', 'package.json', 'package-lock.json', 'index.html'];
const sourceDirectories = new Set(['src', 'public', 'assets', 'styles', 'components', 'lib', 'scripts', 'tests']);
const omittedDirectories = new Set(['node_modules', 'dist', 'build', 'coverage', '__pycache__']);
const rootConfiguration = /^(?:vite\.config\.[cm]?[jt]s|tsconfig(?:\.[\w-]+)?\.json|(?:postcss|tailwind)\.config\.[cm]?[jt]s)$/;
const rootSource = /^[\w-]+\.(?:[cm]?[jt]sx?|css|scss|svg)$/;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function verifySnapshot() {
  const manifest = JSON.parse(await readFile(join(root, 'SOURCE-MANIFEST.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.project !== slug || manifest.algorithm !== 'sha256') {
    throw new Error('Unsupported source manifest.');
  }
  const errors = [];
  for (const [relative, expected] of Object.entries(manifest.files)) {
    if (relative.startsWith('/') || relative.includes('\\') || relative.split('/').some((part) => !part || part === '..' || part === '.')) {
      throw new Error('Invalid file path in source manifest.');
    }
    try {
      const filename = join(root, relative);
      const info = await lstat(filename);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error('Not a regular file');
      const bytes = await readFile(filename);
      if (hash(bytes) !== expected.sha256 || bytes.byteLength !== expected.bytes) errors.push(`Changed: ${relative}`);
    } catch { errors.push(`Missing or unreadable: ${relative}`); }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Verified ${Object.keys(manifest.files).length} source files against the downloaded snapshot.`);
}

async function createArchive() {
  const entries = {};
  async function include(relative) {
    const filename = join(root, relative);
    const info = await lstat(filename);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`${relative}: source downloads require regular files.`);
    entries[`${slug}/${relative.split(sep).join('/')}`] = [new Uint8Array(await readFile(filename)), { mtime: fixedTime }];
  }
  async function walk(relative) {
    for (const entry of (await readdir(join(root, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || omittedDirectories.has(entry.name) || /\.(?:log|pem|key|p12|pfx|zip)$/i.test(entry.name)) continue;
      const child = join(relative, entry.name);
      if (child.split(sep).join('/') === 'public/integrate.md') continue; // Generated below; INTEGRATE.md is canonical.
      if (entry.isDirectory()) await walk(child);
      else await include(child);
    }
  }
  for (const filename of required) await include(filename);
  for (const entry of (await readdir(root, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (required.includes(entry.name)) continue;
    if (sourceDirectories.has(entry.name)) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error(`Invalid source directory: ${entry.name}`);
      await walk(entry.name);
    } else if (entry.name === '.gitignore' || rootConfiguration.test(entry.name) || rootSource.test(entry.name)) {
      await include(entry.name);
    }
  }
  const files = {};
  for (const archivePath of Object.keys(entries).sort()) {
    const bytes = entries[archivePath][0];
    files[archivePath.slice(slug.length + 1)] = { sha256: hash(bytes), bytes: bytes.byteLength };
  }
  const manifest = `${JSON.stringify({ schemaVersion: 1, project: slug, algorithm: 'sha256', files }, null, 2)}\n`;
  entries[`${slug}/SOURCE-MANIFEST.json`] = [new TextEncoder().encode(manifest), { mtime: fixedTime }];
  await writeFile(join(root, 'public/integrate.md'), await readFile(join(root, 'INTEGRATE.md')));
  await writeFile(join(root, 'public/velvet-source.zip'), zipSync(Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))), { level: 6 }));
  console.log(`Prepared standalone source (${Object.keys(files).length} source files and a SHA-256 manifest).`);
}

if (process.argv.includes('--verify')) await verifySnapshot();
else await createArchive();
