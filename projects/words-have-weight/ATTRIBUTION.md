# Attribution

## Archivo Black

- Asset: `public/fonts/ArchivoBlack-Regular.ttf`
- Creator: Omnibus-Type; preserve the full copyright statement in the bundled notice.
- Official source: [Google Fonts — Archivo Black](https://github.com/google/fonts/tree/main/ofl/archivoblack)
- Original font: [ArchivoBlack-Regular.ttf](https://raw.githubusercontent.com/google/fonts/main/ofl/archivoblack/ArchivoBlack-Regular.ttf)
- License: SIL Open Font License 1.1; [original notice](https://raw.githubusercontent.com/google/fonts/main/ofl/archivoblack/OFL.txt), included at `public/fonts/OFL.txt`.
- Modifications: none to the font file. The interface renders and temporarily deforms glyph outlines at runtime. The font itself is distributed unchanged.
- Redistribution basis: the OFL permits bundling and redistribution with the copyright and license notice. This font is not sold by itself.

## Runtime and build dependencies

The controls use unmodified Chakra Petch by Cadson Demak, from the [official Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/chakrapetch). `public/fonts/ChakraPetch-Regular.ttf` is bundled under SIL Open Font License 1.1 with the complete notice in `public/fonts/ChakraPetch-OFL.txt`. The font is redistributed unchanged and is not sold by itself.

opentype.js supplies font parsing and outline extraction. Vite and TypeScript provide local development/build tooling. fflate creates the downloadable source archive. Exact versions are recorded through `package.json` and `package-lock.json`; dependencies are installed through npm rather than copied into source. The browser bundle includes opentype.js 1.3.4 and its bundled MIT-licensed dependencies tiny-inflate 1.0.3 and string.prototype.codepointat 0.2.1. Their complete upstream copyright and permission notices are retained in [`public/licenses/THIRD-PARTY-NOTICES.txt`](public/licenses/THIRD-PARTY-NOTICES.txt), deployed with the app, available from Help, and included in every source archive. Preserve this file when redistributing the production build.

No photograph, generated concept image, audio, third-party demo implementation or externally hosted runtime asset is bundled. Original interface and geometry code use the project MIT license.
