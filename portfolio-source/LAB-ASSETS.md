# LAB environment lighting

The honeycomb uses the **Peppermint Powerplant** HDRI by **Andreas Mischok**,
published by **Poly Haven** under **CC0**.

- Source: https://polyhaven.com/a/peppermint_powerplant
- License: https://polyhaven.com/license
- Original 1K HDR MD5: `91cc57b66855f7dd6d4119953e4c2752`
- Derived asset: `src/lab-environment-data.js`, a 512 x 256 linear-light
  downsample encoded as gzipped RGBE. It is loaded as a separate chunk when the
  visitor approaches the lower scenes. There is a local procedural fallback.

This lighting asset is not taken from Active Theory. The honeycomb geometry,
surface maps and motion are original code, guided by the user's video reference.
