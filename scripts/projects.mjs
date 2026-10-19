import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
export const catalogPort = Number(process.env.OPENCARTEL_PORT || 5180);
if (!Number.isInteger(catalogPort) || catalogPort < 1024 || catalogPort > 65534) {
  throw new Error('OPENCARTEL_PORT must be an integer from 1024 to 65534.');
}

// The catalog metadata is the public record. Documentation-only project folders
// are allowed; runnable apps opt in by including an independent package.json.
export async function getProjects() {
  const directories = await readdir(path.join(root, 'projects'), { withFileTypes: true });
  const projects = [];
  for (const entry of directories.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const directory = path.join(root, 'projects', entry.name);
    try {
      await access(path.join(directory, 'package.json'));
    } catch {
      continue;
    }
    const metadata = JSON.parse(await readFile(path.join(directory, 'project.json'), 'utf8'));
    const manifest = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name) || metadata.slug !== entry.name) {
      throw new Error(`Invalid project slug: ${entry.name}`);
    }
    if (!manifest.scripts?.dev || !manifest.scripts?.build) {
      throw new Error(`${entry.name} must provide dev and build scripts.`);
    }
    const port = catalogPort + 1 + projects.length;
    if (port > 65535) throw new Error('Project development ports exceed 65535. Choose a lower OPENCARTEL_PORT.');
    projects.push({
      slug: entry.name,
      directory,
      base: `/${entry.name}/`,
      port,
    });
  }
  return projects;
}

export function runNpm(directory, args, environment = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, args, {
      cwd: directory,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, ...environment },
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`npm ${args.join(' ')} failed (${signal || code}).`));
    });
  });
}
