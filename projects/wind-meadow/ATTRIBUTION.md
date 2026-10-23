# Attribution

## Original implementation

The Wind Meadow application, procedural fine-grass geometry, wind/shader implementation and project interface integration are original OpenCartel code under MIT. The selected modeled tufts and photographic maps are CC0 third-party assets listed below. Reference screenshots and generated concept images are not bundled in the runtime.

The interface helper files in `src/` are deliberate project-owned copies of the OpenCartel catalog's MIT-licensed controls, cursor, motion and Markdown source panel. They keep the downloaded project independent.

## Bundled third-party material

| Relative file or directory | Creator | Original source | License | Modifications and required credit |
| --- | --- | --- | --- | --- |
| `public/fonts/ChakraPetch-Regular.ttf` | The Chakra Petch Project Authors | https://github.com/google/fonts/tree/main/ofl/chakrapetch | SIL Open Font License 1.1 | Unmodified. Full notice retained in `public/fonts/ChakraPetch-OFL.txt` and the runtime notices. |
| `public/textures/grass-blade-albedo.png` and its provenance JSON | Rob Tuytel (photography), Rico Cilliers (source modeling), Poly Haven | https://polyhaven.com/a/grass_medium_01 | CC0 1.0 Universal; https://polyhaven.com/license | Four blade interiors sampled, straightened and repacked from the official 2K diffuse atlas into an RGB 256 × 512 texture. No repainting. Source coordinates and hashes are in the provenance JSON. Attribution retained voluntarily; source is free/public domain. |
| `public/models/grass-medium-01/` | Rico Cilliers (modeling), Rob Tuytel (photography), Poly Haven | https://polyhaven.com/a/grass_medium_01 | CC0 1.0 Universal; https://polyhaven.com/license | Original glTF, mesh binary and photographed maps retained with hashes and provenance. Runtime selects five tuft variants, instances them and adds rooted wind deformation. A separately supplied matched opacity atlas is applied to surface and shadow passes. Attribution retained voluntarily. |
| Three.js runtime, installed as `three` | three.js authors | https://github.com/mrdoob/three.js | MIT | Exact version is recorded in package.json/package-lock.json. Full runtime license retained in `public/licenses/THIRD-PARTY-NOTICES.txt`. |

Vite and fflate are development/build dependencies recorded in the manifest and lockfile. They retain their package-distributed license notices; they are not copied as application source. The source archive tool uses fflate to create ZIP files during source preparation.

## Implementation references

[Al-Ro's grass](https://al-ro.github.io/projects/grass/) and [Álvaro Saburido's grass article](https://alvarosabu.dev/blog/creating-a-grass-field-with-tsl/) informed instancing and segmented blade construction. Their code, texture maps and assets are not bundled. The geometry and shader here are original.
