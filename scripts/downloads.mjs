import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { zipSync } from 'fflate';
import { getProjects, root } from './projects.mjs';

const requiredFiles = ['README.md', 'INTEGRATE.md', 'LICENSE', 'ATTRIBUTION.md', 'project.json', 'package.json', 'package-lock.json', 'index.html'];
const sourceDirectories = new Set(['src', 'public', 'assets', 'styles', 'components', 'lib', 'scripts', 'tests']);
const omittedDirectories = new Set(['node_modules', 'dist', 'build', 'coverage', '__pycache__']);
const rootConfiguration = /^(?:vite\.config\.[cm]?[jt]s|tsconfig(?:\.[\w-]+)?\.json|(?:postcss|tailwind)\.config\.[cm]?[jt]s)$/;
const rootSource = /^[\w-]+\.(?:[cm]?[jt]sx?|css|scss|svg)$/;
const fixedTime = new Date(2000, 0, 1);

export async function createProjectArchive(project) {
  const entries = {};
  const addFile = async (relative) => {
    const filename = path.join(project.directory, relative);
    const info = await lstat(filename);
    if (!info.isFile() || info.isSymbolicLink()) {
      throw new Error(`${project.slug}/${relative}: downloads require regular files.`);
    }
    const archivePath = `${project.slug}/${relative.split(path.sep).join('/')}`;
    entries[archivePath] = [new Uint8Array(await readFile(filename)), { mtime: fixedTime }];
  };
  const addDirectory = async (relative) => {
    for (const entry of (await readdir(path.join(project.directory, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || omittedDirectories.has(entry.name) || /\.(?:log|pem|key|p12|pfx|zip)$/i.test(entry.name)) continue;
      const child = path.join(relative, entry.name);
      if (child.split(path.sep).join('/') === 'public/integrate.md') continue; // Generated from INTEGRATE.md.
      if (entry.isDirectory()) await addDirectory(child);
      else await addFile(child);
    }
  };
  for (const filename of requiredFiles) await addFile(filename);
  for (const entry of (await readdir(project.directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (requiredFiles.includes(entry.name)) continue;
    if (sourceDirectories.has(entry.name)) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error(`Invalid source directory: ${project.slug}/${entry.name}`);
      await addDirectory(entry.name);
    } else if (entry.name === '.gitignore' || rootConfiguration.test(entry.name) || rootSource.test(entry.name)) {
      await addFile(entry.name);
    }
  }
  const files = {};
  for (const archivePath of Object.keys(entries).sort()) {
    const bytes = entries[archivePath][0];
    files[archivePath.slice(project.slug.length + 1)] = {
      sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.byteLength,
    };
  }
  const manifest = `${JSON.stringify({ schemaVersion: 1, project: project.slug, algorithm: 'sha256', files }, null, 2)}\n`;
  entries[`${project.slug}/SOURCE-MANIFEST.json`] = [new TextEncoder().encode(manifest), { mtime: fixedTime }];
  return zipSync(Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))), { level: 6 });
}

export async function writeDownloads(destination = path.join(root, '.cache', 'downloads')) {
  await mkdir(destination, { recursive: true });
  for (const project of await getProjects()) {
    const archive = await createProjectArchive(project);
    await writeFile(path.join(destination, `${project.slug}.zip`), archive);
    console.log(`Source archive: ${project.slug}.zip (${archive.byteLength.toLocaleString()} bytes)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await writeDownloads();
}
