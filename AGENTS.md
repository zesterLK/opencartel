# Repository instructions

This repository contains public OpenCartel implementations and the documentation needed to use and maintain them.

- Keep each implementation under `projects/<slug>/`; use the same lowercase, hyphenated slug in its metadata.
- Preserve each project's package manager, lockfile, visual direction, and independent dependencies. Add repository-wide tooling only when an actual shared need exists.
- Include only distributable source, required runtime assets, concise technical documentation, and useful examples. Keep personal planning, research archives, conversations, contact records, content drafts, and media-production working files outside this repository.
- Never embed credentials, local machine paths, private document links, or private account information. Use sanitized environment examples when necessary.
- Preserve original code and third-party license notices. Record the source, author, license, modifications, and redistribution basis for bundled external assets in the project's `ATTRIBUTION.md`.
- Use an approved project reference or existing implementation for visual work. Repository setup alone does not approve a website design or authorize deployment.
- Before delivery, run `python3 scripts/check_repository.py`, run the project's relevant build and checks, and inspect the actual interaction in its intended runtime. Report what was and was not verified.
- A public release requires a reviewed diff, confirmed asset rights, and explicit publishing authorization. Never infer push, deployment, remote-creation, or social-posting permission from a local implementation request.

See `docs/project-standard.md` for metadata and completion requirements.
