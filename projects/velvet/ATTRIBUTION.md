# Attribution

## Original implementation

The Velvet application, direction field, material/shader implementation and project interface integration are original OpenCartel code, distributed under the included MIT license. The fabric is generated procedurally in the renderer. No reference imagery, external fabric textures, models or generated concept images are bundled in the runtime.

The interface helper files in `src/` are deliberate project-owned copies of the OpenCartel catalog's MIT-licensed controls, cursor, motion and Markdown source panel. They keep the downloaded project independent.

## Bundled third-party material

| Relative file or directory | Creator | Original source | License | Modifications and required credit |
| --- | --- | --- | --- | --- |
| `public/fonts/ChakraPetch-Regular.ttf` | The Chakra Petch Project Authors | https://github.com/google/fonts/tree/main/ofl/chakrapetch | SIL Open Font License 1.1 | Unmodified. Full notice retained in `public/fonts/ChakraPetch-OFL.txt` and the runtime notices. |
| Three.js runtime, installed as `three` | three.js authors | https://github.com/mrdoob/three.js | MIT | Exact version is recorded in package.json/package-lock.json. Full runtime license retained in `public/licenses/THIRD-PARTY-NOTICES.txt`. |

Vite and fflate are development/build dependencies recorded in the manifest and lockfile. They retain their package-distributed license notices; they are not copied as application source. The source archive tool uses fflate to create ZIP files during source preparation.

## Implementation references

[Jérémie Piellard's fur experiment](https://piellardj.github.io/fur-threejs/) informed the general idea of brushing a rendered fibre surface. Its source, models and textures are not copied or redistributed. Velvet uses a flat, short-pile directional material rather than that demonstration's long fur-covered objects.

References are inspiration, not a claim that third-party assets are licensed for this package. All runtime assets included here are listed above.
