# Changelog

All notable changes to **Export Image Fills** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Entries start at v12 — earlier releases predate this file.

---

## [12] — 2026-11-03

### Added

- **2× high-resolution export** — a new, independent *High resolution (x2)* checkbox, applied on top of the size choice. With *Export at current size* it uses Figma's native 2× render (`exportAsync` at scale 2); with *Original* it resamples the asset at double size in the plugin canvas and saves it as PNG.
- **`@x2` filename marker** — files exported at double resolution are labelled, so they never get confused with 1× ones. Design size by default (`avatar@200x200@x2.png`).
- **Use output pixels in filename** — optional toggle under the x2 checkbox that swaps the suffix to real output pixels (`avatar@400x400.png`) and drops the marker. A hint shows both forms.
- **Include folder tree map (.txt)** — optional `folder-tree-map.txt` in the ZIP root with the page/frame hierarchy (folders only, no image names), closed by a thank-you note in the active language.
- **Brazilian Portuguese and French** — the UI is now available in English, Spanish, Brazilian Portuguese and French. Click the language label to rotate; the choice is remembered and the document `lang` follows.
- **Session image cache** — exporting twice (say, PNG and then JPG) reuses the bytes already fetched instead of reading the document again.

### Changed

- **Faster previews on large libraries** — each preview is decoded once at 104 px instead of holding the full bitmap in memory, with a 3-slot queue and the original blob released afterwards. Galleries of 200+ images scroll smoothly with stable memory.
- **Bounded export pipeline** — images are fetched 4 at a time and converted 2 at a time when doubling, so a big document no longer spikes memory, and progress is reported per batch.
- **No double downloads** — preview and export requests for the same image are deduplicated while in flight.
- **Export settings are captured on click** — changing format, scale or size mode mid-export can no longer alter the result being generated.
- **Complete translations** — every label, hint and tooltip is translated in all four languages, with English as fallback.
- **Smaller memory copies** — the sRGB chunk is injected with `subarray` instead of `slice`, and the format table is now a single source of truth for extensions, MIME types and badges.
- **Document scans stay responsive** — the scan yields to the UI between frames and pages, and reports progress per page.

### Fixed

- **Plugin no longer hangs on errors** — a failure during scan or export used to leave the interface stuck on a spinner; it now surfaces a clear message and can be retried.
- **Resize handle stays reachable** — shrinking the window pushed the drag handle out of view. The controls area now shrinks and scrolls instead.
- **PNG color-profile injection validates the signature** before touching bytes, so non-PNG data can't be corrupted.

### Notes

- **GIFs are never scaled**: doubling the resolution would freeze the animation, so they are exported untouched and without the `@x2` marker.
- **Known limitation** — if Figma's node render fails and the plugin falls back to the original asset, the file keeps its `@x2` marker while staying at source resolution.
- WebP, HEIC and TIFF uploads are normalized to PNG/JPEG by Figma, so the plugin only ever finds PNG, JPEG and GIF image fills.
