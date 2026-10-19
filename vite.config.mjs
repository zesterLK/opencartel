import { defineConfig } from 'vite';
import path from 'node:path';
import { catalogPort, getProjects, root } from './scripts/projects.mjs';
import { createProjectArchive } from './scripts/downloads.mjs';

const projects = await getProjects();

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
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirectProjectRoute);
    },
  }],
});
