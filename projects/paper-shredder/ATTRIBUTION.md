# Paper Shredder — attribution

## Original work

- Application source, example paper artwork generated in `src/paper-renderer.ts`, fictional notes and generated monitor screen in `src/office-interactions.ts`, and original Blender-authored room in `public/office.glb`: OpenCartel, MIT license in `LICENSE`. No third-party furniture models, photographic textures, source screenshots or concept images are bundled.
- `public/poster.webp`: original still captured from this browser implementation on 20 October 2026 and encoded as WebP. It depicts the actual ready state and supplies the loading/error backdrop.
- The room model is a purpose-built illustrated office. Its source authoring and runtime animation are distinct: static geometry comes from Blender; the browser generates the moving sheet and ribbons.
- Collection controls copied into this project from OpenCartel's own site source are original MIT code and intentionally remain self-contained.
- User-selected documents and images are temporary local inputs, not bundled project assets or redistributed source material. The app renders visual copies without claiming ownership of, modifying, deleting or publishing those originals.

## Bundled font

| Asset | Author / source | License and changes |
| --- | --- | --- |
| `public/fonts/ChakraPetch-Regular.ttf` | Cadson Demak; [Google Fonts Chakra Petch](https://github.com/google/fonts/tree/main/ofl/chakrapetch) | SIL Open Font License 1.1, unchanged. Full notice: `public/fonts/ChakraPetch-OFL.txt`. Used for interface controls. |

## Runtime and build dependencies

- [Three.js](https://github.com/mrdoob/three.js), Three.js authors, MIT. Loaded from the pinned npm package; `GLTFLoader` is included from its official addons. Full runtime license is reproduced in `public/licenses/THIRD-PARTY-NOTICES.txt`.
- [PDF.js](https://github.com/mozilla/pdf.js), Mozilla Foundation and contributors, Apache-2.0. The project pins the official [`pdfjs-dist` 6.4.299 npm distribution](https://www.npmjs.com/package/pdfjs-dist/v/6.4.299). Its library and official worker are unchanged upstream code; the original `src/document-source.ts` integrates them and limits resource loading to bundled assets. Vite packages/minifies the app integration and emits the worker/assets under the project's base URL. No CDN viewer or remote document service is used. The Apache-2.0 text and bundled-resource notices are reproduced in `public/licenses/THIRD-PARTY-NOTICES.txt`.
- [Vite](https://github.com/vitejs/vite), MIT; [TypeScript](https://github.com/microsoft/TypeScript), Apache-2.0; [fflate](https://github.com/101arrowz/fflate), MIT. These are development/build dependencies installed by npm, not externally fetched browser assets. The lockfile records exact resolutions.
- TypeScript definitions from DefinitelyTyped are MIT licensed and installed as development dependencies.

## PDF.js resources included in production builds

These package resources are resolved from the pinned dependency during the build and fetched only when needed by the local PDF renderer. They are unchanged from the official distribution. Keep their individual copyright notices and full license terms when redistributing the built app; the project's MIT license does not replace them.

| Resource in `pdfjs-dist` | Author / source | Upstream license and use |
| --- | --- | --- |
| `cmaps/*.bcmap` | Adobe Systems Incorporated; [PDF.js distribution](https://github.com/mozilla/pdfjs-dist/tree/master/cmaps) | Adobe redistribution terms with three conditions, retained from `cmaps/LICENSE`. Character maps for PDF fonts. |
| `standard_fonts/Foxit*.pfb` | PDFium Authors; [PDF.js standard fonts](https://github.com/mozilla/pdfjs-dist/tree/master/standard_fonts) | BSD three-clause notice in `LICENSE_FOXIT`. Standard PDF font data. |
| `standard_fonts/LiberationSans-*.ttf` | Red Hat, Inc.; [PDF.js standard fonts](https://github.com/mozilla/pdfjs-dist/tree/master/standard_fonts) | The bundled `LICENSE_LIBERATION` specifies GPL version 2 with its font/document and physical-product exceptions. Its full agreement and GPL text are retained. These specific packaged files must not be described as OFL fonts. |
| `wasm/openjpeg.wasm` | OpenJPEG contributors and Mozilla Foundation; [OpenJPEG](https://www.openjpeg.org/), [PDF.js](https://github.com/mozilla/pdf.js) | BSD two-clause terms for the decoder and wrapper, retained from `LICENSE_OPENJPEG` and `LICENSE_PDFJS_OPENJPEG`. JPEG2000 image decoding. |
| `wasm/jbig2.wasm` | PDFium Authors, Mozilla Foundation and upstream contributors; [PDFium](https://pdfium.googlesource.com/pdfium/), [PDF.js](https://github.com/mozilla/pdf.js) | The distribution's `LICENSE_JBIG2` contains BSD three-clause and Apache-2.0 terms; `LICENSE_PDFJS_JBIG2` supplies the Mozilla Apache-2.0 wrapper notice. All are retained. JBIG2 image decoding. |

The library is integrated for canvas page rendering, without PDF viewer scripting or an XFA layer. QuickJS scripting assets are not bundled. Operating-system fonts used to draw text/image-cover furniture are browser fallbacks and are not copied into the project.

`public/licenses/THIRD-PARTY-NOTICES.txt` is available inside Help and in the source download. Retain notices when reusing the project.
