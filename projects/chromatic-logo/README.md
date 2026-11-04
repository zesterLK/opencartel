# Chromatic Logo

A glass logo reveal inspired by Apple Music, built with dependency-free WebGL. A glass orb unfolds into a rounded-square rim with refraction and spectral edges, then dissolves to a logo. Replay and speed controls let you study the transition.

Use the renderer with your own transparent logo via `logoUrl`. The bundled mark is an example; see INTEGRATE.md for aspect-ratio adjustments, embedding and cleanup.

Run Node 22.18+; `npm ci`, `npm run dev`. Build with `npm run build`. No backend, remote assets or runtime libraries. See INTEGRATE.md for component reuse. Reduced motion starts at the settled mark. Unsupported WebGL falls back to the logo.
