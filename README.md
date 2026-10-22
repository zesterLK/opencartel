# OpenCartel

An open collection of interactive experiments, playful interfaces, and small creative implementations. Each project includes its source code and instructions for running and adapting it.

Projects are independent: each experiment owns its source, dependencies, lockfile, and license. The catalog combines their built output into one site without coupling their application code.

## Explore

Visit [opencartel.tech](https://opencartel.tech/) or open [Words Have Weight](https://opencartel.tech/words-have-weight/), a typography playground where words become physical objects. Its [source and setup instructions](projects/words-have-weight/) are included in this repository.

Try [Paper Shredder](https://opencartel.tech/paper-shredder/), an interactive office with local document previews, shredding and playful room interactions. Its [source and setup instructions](projects/paper-shredder/) include the exported 3D scene.

Browse the [project directory](projects/) for individual setup, reuse instructions, and asset credits.

## Use a project with your agent

Download the source, keep an unchanged copy, and give your agent the complete folder plus its `INTEGRATE.md`. Run the original first, then specify whether you want the whole experience, an embedded section or one effect, and name the destination page. The guide identifies the rendering, motion, assets and accessible interactions to preserve. Each experiment has a Guide button that opens its complete Markdown instructions with a Copy control.

Start with [Words Have Weight’s integration guide](projects/words-have-weight/INTEGRATE.md), or use the [general copy-and-paste agent brief](docs/using-projects-with-an-agent.md).

## Run the collection

Use Node.js 22.18 or later and npm. From the repository root:

```sh
npm ci
npm run setup
npm run dev
```

Open `http://127.0.0.1:5180/`. The catalog serves the experiment at `/words-have-weight/` and its source download at `/downloads/words-have-weight.zip`. The experiment's development server uses port 5181; additional projects use subsequent ports. Startup fails if a required port is occupied and does not stop another server. Set `OPENCARTEL_PORT` to choose another catalog port; project servers use the following ports (for example, `OPENCARTEL_PORT=5200 npm run dev`).

`npm run setup` installs every runnable project's dependencies using that project's own lockfile. There are no npm workspaces or shared application dependencies. To run only one experiment, open its folder and follow its README; the repository root is not required.

Build and inspect the combined static site:

```sh
npm run build
npm run preview
```

Preview opens a local server at `http://127.0.0.1:4173/`. The output in `dist/` contains the catalog, each experiment under its own route, and source ZIPs in `dist/downloads/`. Preview is a local verification server, not a production hosting service. Unknown paths return 404 rather than rendering the catalog.

The custom `site/404.html` compass follows a bouncing Home icon. Its controls pause motion and cycle through 1×–4× speed. Hover or focus holds the Home link still; reduced motion parks it below the message. The original SVG/CSS artwork and motion code live in `site/404.html` and `site/src/not-found.*`. Run its motion boundary checks with `node --test site/src/compass-motion.test.js`.

## Hosting

The repository includes `vercel.json` for a static Vercel deployment. Import the repository root, use Node.js 22, and deploy `main` as production. The configuration installs the root and each independent project's locked dependencies, builds the complete collection, and serves `dist/`. No environment variables are required. Keep directory-style project routes and real 404 responses; do not add a catch-all SPA rewrite.

## Repository layout

```text
site/                Catalog HTML, styles, and public assets
projects/            Independent implementations, one directory per project
templates/project/   Starting documentation and metadata for a new project
docs/                Repository and project conventions
scripts/             Local orchestration, source archives, and repository checks
vite.config.mjs      Catalog build and local development routes
```

Root tooling builds the catalog and composes independent project builds. It does not impose a shared UI library, framework, or visual style on the experiments.

## Source downloads

Each download is an allowlisted ZIP of that experiment's source, package manifest and lockfile, `README.md`, a project-specific `INTEGRATE.md`, license, and necessary runtime assets. Each ZIP also includes `SOURCE-MANIFEST.json`, with the SHA-256 and size of every included source file. It excludes installed dependencies, build output, generated ZIPs, credentials, and hidden files other than the project's `.gitignore`. Development downloads reflect the current files; production downloads are generated during the build. `npm run downloads` also writes local archives to `.cache/downloads/`.

To verify portability, extract an archive outside the checkout and run the documented install and build commands there. The archive's folder must work without the catalog or another experiment. The manifest records that download's exact snapshot; it does not make an older download follow later site changes. See the [agent guide](docs/using-projects-with-an-agent.md#what-the-download-contains) for snapshot verification.

## Reuse

Original code is available under the [MIT License](LICENSE). Keep the copyright and permission notice when reusing it. Third-party code, fonts, models, images, audio, and other assets retain their own licenses; consult each project's `ATTRIBUTION.md` before reusing those materials. The MIT license does not grant rights to third-party names or trademarks.

## Maintenance

OpenCartel is maintained by one author. Bug reports and reproducible issue reports are welcome; external pull requests are not currently accepted. You can fork and adapt the code under its license. See [CONTRIBUTING.md](CONTRIBUTING.md).

For the project structure and release requirements, see the [project standard](docs/project-standard.md).

Run the repository checks with Python 3.9 or later and Git:

```sh
python3 scripts/check_repository.py
```

These checks validate project metadata and catch common accidental disclosures in publishable text. They do not replace checking licenses, reviewing media, testing an implementation, or reviewing the final Git diff.
