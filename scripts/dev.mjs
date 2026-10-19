import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { createServer } from 'vite';
import { catalogPort, getProjects, npm, root } from './projects.mjs';
import { writeDownloads } from './downloads.mjs';

const projects = await getProjects();
const children = [];
let server;
let stopping = false;

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  await server?.close();
  for (const child of children) {
    if (!child.pid) continue;
    try {
      // Each process group was created by this script. No unrelated server is
      // stopped, even if the desired port was already in use.
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        process.kill(-child.pid, 'SIGTERM');
      }
    } catch (error) {
      if (error.code !== 'ESRCH') console.error(error.message);
    }
  }
  process.exitCode = code;
}

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', () => reject(new Error(`Port ${port} is already in use. Stop that server or choose another session; no process was stopped.`)));
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}

async function waitForProject(project, child) {
  const deadline = Date.now() + 20000;
  while (!stopping && child.exitCode === null && Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${project.port}${project.base}`, { signal: AbortSignal.timeout(500) });
      await response.body?.cancel();
      if (response.ok) return;
    } catch { /* The child server may still be starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${project.slug} did not become ready. Check its startup output.`);
}

process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());

try {
  for (const port of [catalogPort, ...projects.map((project) => project.port)]) await assertPortAvailable(port);
  await writeDownloads();
  for (const project of projects) {
    const child = spawn(npm, [
      'run', 'dev', '--', '--host', '127.0.0.1', '--port', String(project.port),
      '--strictPort', `--base=${project.base}`,
    ], {
      cwd: project.directory,
      stdio: 'inherit',
      env: { ...process.env, VITE_OPENCARTEL_COMPOSED: '1' },
      detached: process.platform !== 'win32',
      shell: process.platform === 'win32',
    });
    children.push(child);
    child.once('error', (error) => { console.error(error.message); void stop(1); });
    child.once('exit', (code) => {
      if (!stopping) {
        console.error(`${project.slug} stopped (${code ?? 'signal'}). Closing the catalog.`);
        void stop(1);
      }
    });
    await waitForProject(project, child);
  }
  server = await createServer({ configFile: path.join(root, 'vite.config.mjs') });
  if (!stopping) {
    await server.listen();
    server.printUrls();
  } else {
    await server.close();
  }
} catch (error) {
  console.error(error.message);
  await stop(1);
}
