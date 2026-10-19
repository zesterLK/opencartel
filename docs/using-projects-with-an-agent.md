# Use an OpenCartel project with your agent

Each project is a working implementation, with its own dependencies, assets and source. Start from that implementation so its behaviour and visual details survive integration.

## Download, run, then adapt

1. Download **Source** from the experiment, or copy its complete `projects/<slug>/` folder from this repository. Keep a separate unchanged copy as your reference.
2. Give your agent that folder and its **`INTEGRATE.md`**. The experiment's Guide button opens the same Markdown with a Copy control. A guide alone is not the implementation; provide the source too.
3. Follow the project's `README.md` to install its locked dependencies and run it independently. Compare the original in the browser before changing it.
4. Specify whether you want the complete experience, an embedded section, or one effect, and point to the destination repository and component/page. Describe the changes you actually want.
5. Ask the agent to preserve the rendering, motion, assets and accessible interactions, then verify the adapted result against the unchanged reference.

A full page or separately hosted iframe preserves the original most directly. Integration into an existing component needs lifecycle and CSS isolation; the project guide explains what that entails. Copying a screenshot or rebuilding from a prose description is not a faithful import.

## Copy this brief

```text
Use the attached OpenCartel project as the implementation source.
Read its README.md, INTEGRATE.md, ATTRIBUTION.md and LICENSE first.

Destination repository and page/component: [path and location]
Scope: [whole experience / embedded section / named effect]
Changes I want: [copy, colours, sizing or other deliberate changes]
Keep unchanged: [visuals, motion, controls or other requirements]

First run the original with its lockfile and documented commands. Inspect it
in the browser, then inspect the destination's framework and existing files.
Explain the smallest integration that preserves the original behaviour.
Reuse the actual renderer, geometry, assets and interactions. Do not replace
them with a screenshot, approximate animation, new font or rewritten effect.

Preserve unrelated files, existing application conventions and all required
license notices. Keep the source project's dependencies independent when it
runs as its own page. If embedding it, scope styles/selectors, mount only on
the client, and dispose listeners, observers and animation loops on unmount.

Run the documented checks. Compare the original and integration at desktop
and mobile sizes, with pointer, keyboard and reduced motion. Report the
files changed, intentional differences, remaining limits and checks actually
performed. Do not deploy or replace existing work without my instruction.
```

Replace the brackets before sending it. A short recording or screenshot of the original state can help specify the intended composition, but it does not replace the source.

## What the download contains

A project ZIP includes implementation source, locked dependency manifests, tests where present, runtime assets, notices, `README.md` and `INTEGRATE.md`. It omits installed dependencies, build output and generated archives; those are reproducible from the included files.

`SOURCE-MANIFEST.json` records the size and SHA-256 of every included source file. It identifies the downloaded snapshot, not a later revision of the site. For Words Have Weight, after `npm ci`, run:

```sh
node scripts/source-archive.mjs --verify
```

Run this before editing. A changed or missing file fails verification; modifications made for your integration should naturally differ afterward. The manifest checks the listed source bytes, not provenance or authorship. The root and standalone archive builders use the same source selection and manifest format.

Development downloads reflect current source when requested. A published build's archive belongs to that build. A download taken before a site revision does not update itself.

## Guides for available projects

- [Words Have Weight — integration guide](../projects/words-have-weight/INTEGRATE.md)
- [Project authoring and download requirements](project-standard.md)
