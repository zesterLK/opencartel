import { getProjects, runNpm } from './projects.mjs';
import { writeDownloads } from './downloads.mjs';

for (const project of await getProjects()) {
  console.log(`\nInstalling ${project.slug} from its own lockfile…`);
  await runNpm(project.directory, ['ci']);
}
await writeDownloads();
