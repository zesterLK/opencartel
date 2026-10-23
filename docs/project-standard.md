# Project standard

## Start a project

Choose a short lowercase slug such as `paper-wave`, and copy `templates/project/` into `projects/<slug>/`. Replace the template documentation and metadata, then add the implementation. Keep the project self-contained; do not create nested Git repositories or require unrelated projects to run it.

Choose the smallest suitable stack for the implementation. Use a project's package manager and committed lockfile where dependencies are needed. Document exact setup and run commands, runtime versions, and any optional environment variables. Root tooling owns the catalog and site composition; application dependencies remain in the individual project. This repository uses independent npm installs, not npm workspaces.

Each project contains:

```text
projects/<slug>/
  README.md          What it does, how to run it, and how to reuse it
  INTEGRATE.md       Project-specific source map, fidelity and agent handoff guide
  LICENSE            Full license text, retained in standalone downloads
  project.json       Public catalog metadata
  ATTRIBUTION.md     Third-party code and asset provenance
  package.json       Project dependencies and run/build commands
  package-lock.json  Reproducible independent install
  index.html         Application entry point
  src/               Application source
  public/            Optional runtime assets and their required notices
  ...                Source, distributable assets, configuration, lockfile
```

## Compose the local site

The catalog lives in `site/`. Root scripts discover runnable projects from `projects/<slug>/project.json` and `package.json`. A documentation-only project may omit `package.json` while its implementation is undecided. Discovery supplies routes and build tasks; adding a visible catalog entry and its preview in `site/` remains an explicit editorial step.

The current integration contract is a static Vite-compatible app:

- `npm ci` from the project folder installs everything it needs. Do not import source or configurations from another project or the root, use `workspace:`/`file:../` dependencies, or rely on a parent `node_modules` folder.
- `npm run dev -- --host 127.0.0.1 --port <port> --strictPort --base=/<slug>/` starts a development server at its composed route. Root development proxies that route and WebSocket traffic through the catalog on port 5180 by default. `OPENCARTEL_PORT` can change the catalog port; project ports follow it sequentially, beginning at 5181 by default.
- `npm run build -- --base=/<slug>/` creates a complete `dist/index.html` and its assets. Root build copies `dist/` to the combined `dist/<slug>/` after building the catalog.
- A direct standalone build uses a portable base such as `./`. Use imported asset URLs, Vite's HTML/CSS asset handling, or `import.meta.env.BASE_URL` for dynamic public paths. Do not hard-code the catalog's route into standalone assets.
- Root dev/build sets `VITE_OPENCARTEL_COMPOSED=1` for the child app. Use that explicit flag for optional catalog navigation and shared download links; a custom asset base alone does not mean the app is running inside OpenCartel. Standalone runs leave the flag unset and keep their own source-download path.
- A different stack may provide equivalent project-local script adapters when needed. Do not add a workspace or a shared framework just to join the catalog.

Each experiment is a physical page, with the canonical route `/<slug>/`. Test navigation, direct loading, reloads, and asset requests under that prefix. Nested client-side routes need an explicit design and hosting contract; the catalog does not provide a catch-all SPA fallback. Configure static hosting, when authorized, to serve directory index files and return real 404s for unknown files and routes.

Root `npm run dev` binds to localhost and owns only the child processes it starts. Root `npm run build` prepares the combined `dist/`; `npm run preview` serves that output locally on port 4173. Adding a new project changes the sorted development port allocation; restart the root server after changing project metadata or adding a project.

## Interface controls

Use the OpenCartel raised button treatment for navigation and controls, a pressed surface for a static project title, and the collection cursor with native input/touch fallbacks. See [interface controls](interface.md) for classes, accessibility states, canonical files and the standalone-copy contract. Each experiment retains its own content, visual identity and rendering technology.

## Standalone source ZIPs

`scripts/downloads.mjs` creates `/downloads/<slug>.zip` for each runnable project. Downloads contain a top-level `<slug>/` directory, required documentation including `INTEGRATE.md`, a local license, package and lockfile, `index.html`, approved root source/configuration files, and source directories `src`, `public`, `assets`, `styles`, `components`, `lib`, `scripts`, and `tests` when present. Add another necessary source location deliberately to that allowlist and verify the extracted result.

Installed dependencies, build output, generated archives, hidden files other than an explicitly included `.gitignore`, credentials, and symlinks are excluded or rejected. This packaging rule is not a substitute for the repository's privacy and asset-rights review. Required third-party notices must live in an included source/asset directory or be added explicitly to the archive policy. Do not use `npm pack` for this download: npm package archives omit `package-lock.json`.

Development ZIP responses are rebuilt from current source on request. Production ZIPs are frozen at build time. `npm run downloads` regenerates local archives in `.cache/downloads/`. Inspect the archive listing and test `npm ci` plus `npm run build` after extraction outside the repository. Compare both ZIP manifests and hash the extracted files against the source used for that build. A successful monorepo build alone does not prove independence.

## Agent handoff guide

Every project includes a completed `INTEGRATE.md` at its root, in its ZIP and in a copyable Markdown panel opened by the header's Guide button. Keep one canonical source: generate the served copy during source preparation/build. For Words Have Weight that copy is `public/integrate.md`; it is excluded from the ZIP because the canonical root guide is already included. Third-party notices expand within Help using the same source panel. See [interface controls](interface.md) for the component and its standalone copies.

The guide must name the actual entry points, renderer, motion/state/physics, assets, dependencies and accessibility behaviour. Explain how to run the original first, the supported reuse scopes, framework/lifecycle boundaries, deliberate customization points and verification against an unchanged reference. Include a copyable agent brief with destination and scope placeholders. Document missing APIs and known limits; do not promise a drop-in component when the code is a standalone page controller. See [using projects with an agent](using-projects-with-an-agent.md) and the template guide.

ZIPs include a generated `SOURCE-MANIFEST.json` with `schemaVersion: 1`, the project slug, `algorithm: "sha256"`, and a sorted `files` mapping from relative source path to `sha256` and `bytes`. The manifest describes every included source file except itself; omit timestamps so unchanged inputs produce stable snapshots. It identifies included source bytes, not a public release or a signature. Root and project-local archive builders must select the same distributable files and produce the same manifest. Do not include generated ZIPs or the served duplicate of the guide recursively.

Words Have Weight supports `node scripts/source-archive.mjs --verify` after installing dependencies in an extracted folder. This fails for missing or changed manifest-listed source files. Equivalent verification should be documented when introducing another packaging implementation.

## Metadata

`project.json` is the project's catalog record. Keep it factual and public:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `1` for this format. |
| `slug` | Must match the project directory; lowercase words separated by hyphens. |
| `title` | Short display title. |
| `description` | One sentence explaining the actual experience. |
| `status` | `in-progress`, `ready`, or `archived`. `ready` means the release requirements below were completed. |
| `tags` | Short, unique lowercase classification labels, rendered and searchable in the catalog. Prefer 3–4 useful labels; maximum 24 characters each. |
| `technologies` | Array of relevant technologies; empty while the stack is undecided. |
| `codeLicense` | `MIT` for original project code. Third-party exceptions belong in `ATTRIBUTION.md`. |
| `demo` | Verified public HTTPS preview URL, or `null` when none exists. |

Do not invent a demo URL, usage numbers, supported platforms, or completion claims. A local preview is not a public release. Keep any separate release date or tagged version in the project README when it exists.

## Asset and code provenance

Original implementation code uses the repository's MIT license. Keep a complete `LICENSE` file inside every downloadable project so the notice travels with its source. Retain any third-party license and copyright notices in copied or adapted code. Record third-party dependencies in the package manifest and lockfile, and document separately bundled code and media in `ATTRIBUTION.md`.

For each bundled image, font, model, texture, audio file, video, or external code fragment, record its relative path, creator, original source URL, exact license or written permission, modifications, and required credit. Distinguish inspiration from copied code and assets. A publicly viewable reference is not permission to redistribute it.

Use original or explicitly redistributable assets. For assets that cannot be redistributed, provide a permitted substitute and document any optional user-supplied file. Include applicable license files when required. Do not add raw production libraries merely because they were used to produce a preview.

## Completion and release

Before marking a project `ready`:

1. Replace the template text in README and INTEGRATE with reproducible setup, reuse and agent-handoff instructions. Verify that the direct Markdown guide matches its canonical source.
2. Verify the experience in its intended browser or runtime. Check keyboard interaction, reduced-motion behavior where relevant, loading and failure states, responsive layout, and performance on representative devices. Record concrete limitations.
3. Run the project's relevant build and checks, the composed site build, and a standalone install/build from its extracted source archive. Verify direct route/reload, asset paths, real 404s, download contents, and relevant browser behavior. Do not claim broader support than was tested.
4. Complete the attribution inventory and confirm redistribution rights, including fonts, music, and models.
5. Include a useful preview with descriptive alt text when it materially helps people understand the project. Keep media proportionate and attributable.
6. Run `python3 scripts/check_repository.py` and review the complete proposed Git diff and file inventory. Inspect binary/media files and metadata separately; the text checker does not inspect their contents or Git history.
7. Add the project to `projects/README.md`. Confirm any public demo URL after the authorized deployment succeeds.

Publishing, hosting, or posting is a separate action. A locally complete project can have `demo: null`.

## Publication boundary

Keep public technical material in this repository. Research notes, private plans, correspondence, analytics, credentials, local paths, editorial drafts, and working media archives do not belong here, including in ignored directories. Ignore rules are a backstop, not storage authorization.

The repository check examines tracked files plus non-ignored untracked files, validates required project files and metadata, rejects certain secret-file types and common credential patterns, and flags machine paths or conversation links in UTF-8 text. It reports skipped binary files. It cannot prove that a file is safe, that an asset is licensed, that history contains no secrets, or that an implementation works.
