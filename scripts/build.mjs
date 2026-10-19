import { access, cp } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'vite';
import { getProjects, root, runNpm } from './projects.mjs';
import { writeDownloads } from './downloads.mjs';

await build({ configFile: path.join(root, 'vite.config.mjs') });
for (const project of await getProjects()) {
  console.log(`\nBuilding ${project.slug} at ${project.base}…`);
  await runNpm(project.directory, ['run', 'build', '--', `--base=${project.base}`], {
    VITE_OPENCARTEL_COMPOSED: '1',
  });
  const output = path.join(project.directory, 'dist');
  await access(path.join(output, 'index.html'));
  await cp(output, path.join(root, 'dist', project.slug), { recursive: true });
}
await writeDownloads(path.join(root, 'dist', 'downloads'));
console.log('\nComposed site is ready in dist/. Use npm run preview to inspect it locally.');
