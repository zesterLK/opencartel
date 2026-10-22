import { defineConfig } from 'vite';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { catalogPort, getProjects, root } from './scripts/projects.mjs';
import { createProjectArchive } from './scripts/downloads.mjs';

const projects = await getProjects();

async function hasStaticPage(directory, requestUrl) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname); }
  catch { return false; }
  const file = path.resolve(directory, `.${pathname}`);
  if (file !== directory && !file.startsWith(`${directory}${path.sep}`)) return false;
  for (const candidate of [file, path.join(file, 'index.html'), `${file}.html`]) {
    try { if ((await stat(candidate)).isFile()) return true; }
    catch { /* Let the custom 404 handle missing files. */ }
  }
  return false;
}

function redirectProjectRoute(request, response, next) {
  const url = new URL(request.url, 'http://localhost');
  const project = projects.find((item) => url.pathname === `/${item.slug}`);
  if (!project) return next();
  response.writeHead(308, { Location: `${project.base}${url.search}` });
  response.end();
}

export default defineConfig({
  root: path.join(root, 'site'),
  appType: 'mpa',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        index: path.join(root, 'site/index.html'),
        license: path.join(root, 'site/license.html'),
        notFound: path.join(root, 'site/404.html'),
      },
    },
  },
  preview: {
    // Preview defaults to server.proxy in Vite. Explicitly disable it so this
    // server verifies the composed build even while development is running.
    proxy: {},
  },
  server: {
    host: '127.0.0.1',
    port: catalogPort,
    strictPort: true,
    proxy: Object.fromEntries(projects.map((project) => [project.base, {
      target: `http://127.0.0.1:${project.port}`,
      ws: true,
    }])),
  },
  plugins: [{
    name: 'opencartel-project-routes',
    configureServer(server) {
      server.middlewares.use(redirectProjectRoute);
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url, 'http://localhost');
        const project = projects.find((item) => url.pathname === `/downloads/${item.slug}.zip`);
        if (!project || !['GET', 'HEAD'].includes(request.method)) return next();
        try {
          // Rebuild on request so a development download reflects the source
          // currently being reviewed, including edits made after server startup.
          const archive = await createProjectArchive(project);
          response.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${project.slug}.zip"`,
            'Content-Length': archive.byteLength,
            'Cache-Control': 'no-store',
          });
          response.end(request.method === 'HEAD' ? undefined : archive);
        } catch (error) {
          next(error);
        }
      });
      return () => server.middlewares.use(async (request, response, next) => {
        if (!['GET', 'HEAD'].includes(request.method)) return next();
        try {
          if (await hasStaticPage(path.join(root, 'site'), request.url)) return next();
          const source = await readFile(path.join(root, 'site/404.html'), 'utf8');
          const html = await server.transformIndexHtml('/404.html', source);
          response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          response.end(request.method === 'HEAD' ? undefined : html);
        } catch (error) { next(error); }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirectProjectRoute);
      return () => server.middlewares.use(async (request, response, next) => {
        if (!['GET', 'HEAD'].includes(request.method)) return next();
        try {
          if (await hasStaticPage(path.join(root, 'dist'), request.url)) return next();
          const html = await readFile(path.join(root, 'dist/404.html'));
          response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          response.end(request.method === 'HEAD' ? undefined : html);
        } catch (error) { next(error); }
      });
    },
  }],
});
