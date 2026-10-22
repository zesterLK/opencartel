# OpenCartel interface controls

OpenCartel uses compact translucent glass controls and a precise pointer. Each project can keep its own visual world while using these shared collection controls.

## Buttons and static titles

The canonical control styles are `site/src/ui.css`. Add `oc-button` to actual buttons and action links. Use native `disabled`, `aria-pressed` for toggles, and `aria-expanded` for disclosure controls. Do not use a link with an invented destination. Keyboard focus remains visible.

Use `oc-pressed` for a static project heading: it has the same glass surface, but remains a heading without button semantics. Input focus uses an underline in Words Have Weight; other controls retain an explicit focus outline. Controls use the bundled Chakra Petch typeface and its included OFL notice.

Import these styles after the page styles. Project-specific layout remains in the project's own stylesheet.

## Cursor

`site/src/cursor.js` exports `mountCursor()`, which returns cleanup. Import `cursor.css`, mount once, and register cleanup with the development runtime when available. The pointer is restricted to fine-pointer, hover-capable devices; text fields, native selection controls, forced colors and touch keep native behavior.

Ordinary links and buttons receive the action ring and a small “click it” hint. Use `data-cursor="project"` for collection cards and `data-cursor="grab"` for draggable surfaces. Project, download, disclosure and drag targets have contextual hints. Add `data-cursor-label="read guide"` for a specific short hint; an empty value suppresses it. Hints flip at viewport edges and never receive pointer events. Keep native accessible names: these visual hints do not replace them. The cursor tracks dragging, keyboard modality and native dialog layers. It does not trail behind the pointer. Use `data-cursor="native"` on selectable source panels to retain the text-selection cursor.

## Standalone projects

Words Have Weight includes byte-identical copies of `ui.css`, `cursor.css`, `cursor.js`, `motion.js`, `motion.css`, `markdown-panel.js` and `markdown-panel.css` in its own `src/`. Copy updates from the canonical site files into existing standalone projects and verify equality before packaging. TypeScript projects may use the accompanying `cursor.d.ts` declaration. Include the required font and its license inside the project's public assets.

These deliberate copies keep a downloaded project independent: no imports from the catalog, root-only runtime dependency, shared global install or network font is required. The source archive must include these files.

## Collection cards and actions

The entire card is a single anchor. Keep its title and description inside; do not nest buttons or other links. Use a full-frame preview with its caption always below it in a flat rounded extension. Do not overlay captions on previews, blur the media, or add raised bevels. Touch navigates on the first tap. Collection-wide preview pause lives in the toolbar and honors reduced motion.

Search and category filters use actual project metadata. Cards are the direct project entry; the toolbar keeps search, filtering, GitHub, License and playback only. Do not add redundant Open experiment or per-project Source actions to the home toolbar.

## Search, license and motion

Search starts as a glass icon control and opens an anchored field below the single-line toolbar. Escape clears and collapses it; an empty field collapses after focus leaves. All projects keeps native select behavior and visible keyboard focus. The catalog has no Likes, Open experiment action, source action or footer; its License control opens a native dialog over a blurred backdrop.

`motion.js` provides `openDialog()` and `closeDialog()` with short opacity transitions, plus `mountPageMotion()` with a cleanup function for page arrival/departure fades. It preserves modified clicks, downloads, external links, same-page anchors and browser-back restoration. Reduced motion removes these animations and navigation delays. Avoid transforming the native dialog itself: that would change the containing block of its custom cursor.

In an embedded experience, let the host router own page transitions; omit the global page-navigation helper. Keep dialog behavior scoped to the component, and dispose installed helpers on unmount.

## Project masthead

In collection mode, place an icon-only Home link to the left of the static project title. Keep its accessible name `Home`; collection controls use compact 36px phone surfaces with spacing between targets. Help, Guide and Download source belong in the header action group, followed by an icon-only link to that project’s GitHub source directory. Apply `oc-masthead` for a single, consistent row at all widths. On phones, show Source with the full accessible name Download source; long headings truncate visually while preserving their full text. Keep footer action groups on one line, with horizontal scrolling when needed. The homepage toolbar uses an accessible GitHub icon on phones. Glass foreground, edge and tint tokens follow the local world or changing homepage palette. Standalone downloads hide Home when there is no parent collection. Guide opens its own native dialog with the project's canonical `INTEGRATE.md` in a copyable Markdown source panel. Help contains a native Third-party notices disclosure using that same panel. Do not add separate guide-copy or guide-download actions outside the panel.

## Copyable Markdown panels

`site/src/markdown-panel.js` exports `mountMarkdownPanel(element, { url, filename, validate })`. Import `markdown-panel.css` alongside the control styles. Call the returned `load()` when its dialog or disclosure opens, and `dispose()` on teardown. Requests are cached per mounted panel after success; failures offer a retry.

The panel shows the original Markdown or plain-text source in a wrapping, scrollable monospace region. It does not render HTML or execute embedded content. Copy writes the complete source unchanged, including content outside the visible scroll area. If clipboard access fails, the panel selects the text and explains how to copy manually. Loading, copied and failure states have accessible feedback. Supply a content validator for fetched documents to reject an unexpected HTML error response.

Use this project-owned primitive for guides, notices and other copyable source documents. Keep one filename and one Copy control in its header, with no redundant download action. Preserve legal notices in full. This is not a cross-project or cross-brand UI package.

## Overflow rails

Wrap long control groups in `oc-scroll-shell` and mark the inner scrolling element `oc-scroll-rail`. `mountScrollRails()` from the project-owned `scroll-rail.js` activates a fading blur only at edges with remaining content. It observes resizing, font readiness, scrolling and control changes; call its returned cleanup on teardown. Keep native focus and horizontal scrolling available. Native select controls use a consistently inset chevron while preserving native option menus.
