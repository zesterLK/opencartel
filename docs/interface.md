# OpenCartel interface controls

OpenCartel uses compact raised controls and a precise pointer. Each project can keep its own visual world while using these shared collection controls.

## Buttons and static titles

The canonical control styles are `site/src/ui.css`. Add `oc-button` to actual buttons and action links. Use native `disabled`, `aria-pressed` for toggles, and `aria-expanded` for disclosure controls. Do not use a link with an invented destination. Keyboard focus remains visible.

Use `oc-pressed` for a static project heading: it has a recessed surface, but remains a heading without button semantics. Input focus uses an underline in Words Have Weight; other controls retain an explicit focus outline. Controls use the bundled Chakra Petch typeface and its included OFL notice.

Import these styles after the page styles. Project-specific layout remains in the project's own stylesheet.

## Cursor

`site/src/cursor.js` exports `mountCursor()`, which returns cleanup. Import `cursor.css`, mount once, and register cleanup with the development runtime when available. The pointer is restricted to fine-pointer, hover-capable devices; text fields, native selection controls, forced colors and touch keep native behavior.

Ordinary links and buttons receive the action ring. Use `data-cursor="project"` for collection cards and `data-cursor="grab"` for draggable surfaces. The cursor tracks dragging, keyboard modality and native dialog layers. It does not trail behind the pointer.

## Standalone projects

Words Have Weight includes byte-identical copies of `ui.css`, `cursor.css`, `cursor.js`, `motion.js` and `motion.css` in its own `src/`. Copy updates from the canonical site files into existing standalone projects and verify equality before packaging. TypeScript projects may use the accompanying `cursor.d.ts` declaration. Include the required font and its license inside the project's public assets.

These deliberate copies keep a downloaded project independent: no imports from the catalog, root-only runtime dependency, shared global install or network font is required. The source archive must include these files.

## Collection cards and actions

The entire card is a single anchor. Keep its title and description inside; do not nest buttons or other links. Pointer hover and keyboard focus reveal the caption, while touch layouts show it at rest and navigate on the first tap. Collection-wide preview pause lives in the toolbar and honors reduced motion.

Search and category filters use actual project metadata. Cards are the direct project entry; the toolbar keeps search, filtering, GitHub, License and playback only. Do not add redundant Open experiment or per-project Source actions to the home toolbar.

## Search, license and motion

Search starts as a raised icon control and expands into the same surface. Escape clears and collapses it; an empty field collapses after focus leaves. All projects keeps native select behavior without the oversized focus ring, retaining a subtle border cue. The catalog has no Likes, Open experiment action, source action or footer; its License control opens a native dialog over a blurred backdrop.

`motion.js` provides `openDialog()` and `closeDialog()` with short opacity transitions, plus `mountPageMotion()` with a cleanup function for page arrival/departure fades. It preserves modified clicks, downloads, external links, same-page anchors and browser-back restoration. Reduced motion removes these animations and navigation delays. Avoid transforming the native dialog itself: that would change the containing block of its custom cursor.

In an embedded experience, let the host router own page transitions; omit the global page-navigation helper. Keep dialog behavior scoped to the component, and dispose installed helpers on unmount.

## Project masthead

In collection mode, place an icon-only Home link to the left of the static pressed project title. Keep its accessible name `Home` and a 44px phone target. Download source and Help belong in the header action group. Standalone downloads hide Home when there is no parent collection. Help offers Copy guide and Download guide, both from the project's canonical `INTEGRATE.md`.
