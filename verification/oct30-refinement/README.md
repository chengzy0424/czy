# 2026-10-30 — Spatial portfolio refinement

This record covers the second refinement on October 30. Earlier verification directories are historical, not claims about this version.

## Reference and scope

The requested Douyin video (7626063369507206760) was opened in an isolated browser and its approximately 3-second and 18-second website frames reviewed. Other chapter comparisons used previously captured reference frames. The recording was not watched uninterrupted end to end in this round. A second public portfolio example (7681253425706814783, about page, 8 and 30 seconds) informed the separation of moving foreground and quiet readable text. Third-party recording frames are kept locally and are not published here.

The original ZY identity, Chinese portfolio content and nine actual videos are preserved. The changes affect ring thickness/reflections, clustered particles, gallery depth/card orientation, the mechanical chamber, curved honeycomb, reversible camera transitions and typography. No Blender, offline render or new paid assets were used. Detailed observations, inferred implementation and remaining visual differences are in `portfolio-source/DESIGN.md`.

## What was exercised

- Eight automated tests passed: finite/reversible camera, geometry budget, real card thickness/depth, viewport fit including 768px portrait, deterministic particles, category keyboard behavior, modal return and reduced-motion/direct-access paths.
- Real Edge screenshots: desktop at ten chapter/transition positions; mobile at five positions; additional 768px and 320px captures. Final compact screenshots include the camera-distance correction and the left-top tablet caption position.
- `browser-review.json`: nine videos actually started and progressed; no video element error; the background frame counter stopped during playback. Closing unloaded the player. Quality switching retained playback position. This is short playback verification, not full-length viewing of every film.
- Widths 768, 414, 390, 375, 320: no horizontal DOM overflow. Real screenshots were also inspected because a WebGL object may be cropped without DOM overflow.
- `return-touch.json`: touch-emulated video selection and return-to-list focus restoration worked.
- `interaction-review.json`: real wheel input traversed the camera path forward and backward; a spatial card responded to hover and opened the game collection; Escape restored exactly the saved scroll position; reduced-motion stopped rendering and normal motion resumed.
- No runtime exceptions were recorded in those runs.

## Performance conditions and limits

`performance-review.json` was collected on the user's Windows machine in an isolated headless Edge instance using the NVIDIA GeForce RTX 4050 Laptop GPU. No CPU/network throttling; HTTP cache disabled for navigation, but the same browser/GPU process had already rendered this scene. This is not a clean-device cold-start test.

Local desktop first contentful paint was 28ms and WebGL became ready around 261ms; a single 58ms long task was observed. The mobile-size simulation had first contentful paint 68ms, WebGL ready around 370ms and one 92ms long task. Scene frame interval samples were approximately 5.6ms median / 5.7ms 95th percentile on this device. Do not translate these into a promise for physical phones, other GPUs, different refresh rates or public network conditions. Public-host measurements are recorded separately after deployment.

## Taste / finesse checks

The raw Taste snapshot was taken before the last tablet and metadata-size corrections. Its inspector found no DOM overflow, broken images, identified low-contrast text or console errors at 1440 / 768 / 390px. Finesse's production scan had no P0 findings.

The tools did not report a universal pass. Their DOM-only motion and visual-fill rules do not see WebGL objects; initial-video rules conflict with intentional on-demand loading; generic bans on fine outlines and category labels conflict with the explicitly requested reference. These findings are retained in the raw report, not hidden or described as zero failures. Manual scene review found actual tablet clipping and text/card intersections, which were corrected and re-captured. Necessary project metadata was enlarged to 13px; small environmental annotations remain subordinate.

No physical mobile handset, Safari or Firefox was tested in this round. Existing static fallback, reduced motion and pause-during-playback remain available. The work is an original reference-directed portfolio, not a claim of pixel-identical reproduction of Active Theory.
