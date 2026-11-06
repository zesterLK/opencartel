# Attribution

## Visual inspiration

The outlined digit-to-coils rhythm is inspired by [@kitasenjudesign](https://x.com/kitasenjudesign/status/2114683411260694530), discovered through [MagpUI](https://magpui.com/en/i/hand-drawn-jittery-line-clock-bc2a82). This is an independently authored Canvas reconstruction. No original video, image or source code is included. The renderer uses a custom procedural strand deformation; it does not claim to reproduce the original algorithm.

## Archivo Black

Omnibus-Type's unchanged `public/fonts/ArchivoBlack-Regular.ttf` comes from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/archivoblack). `public/fonts/ArchivoBlack-OFL.txt` contains the copyright and SIL Open Font License 1.1. `src/contours.json` contains adjusted geometry extracted from its digits (with independently drawn numerals one and four) using `scripts/build-contours.mjs`, and remains covered by that font license. Redistribution is allowed with the notices retained; the font is not sold by itself.

## Anybody

The unchanged interface font `public/fonts/Anybody-Variable.woff2` is by Etcetera Type Company. [Original source](https://github.com/Etcetera-Type-Co/Anybody). SIL Open Font License 1.1, retained in `public/fonts/Anybody-OFL.txt`.

## Code and dependencies

Original renderer and interface code: MIT. OpenCartel controls, cursor, markdown and motion modules are standalone copies of the project's MIT code. Vite builds the project; fflate creates source archives; opentype.js is used only to regenerate glyph geometry. Exact dependencies are in the lockfile. Preserve bundled notices when redistributing source or builds.
