# `3d-stuff/tools`

Scripts that turn ripped Zelda 3DS model/animation data into the runtime assets
under `public/models/<model>/anim/` (a `skeleton.json` plus `.csab` clips), which
[`src/anim/AnimPage.tsx`](../../src/anim/AnimPage.tsx) loads.

Two different games are involved, and **the binary formats differ between them**,
so each script targets one (or both):

| Game | Used for | Source data | CSAB subversion | cmb bone stride |
| --- | --- | --- | --- | --- |
| **Ocarina of Time 3D** (OoT3D) | Adult Link | pre-extracted in [`../adult-ocarina/`](../adult-ocarina) and [`../ocarina-anim/`](../ocarina-anim) (`link_v2.cmb` + `nml_okarina_*.csab`) | `0x03` ("Ocarina") | `0x28` |
| **Majora's Mask 3D** (MM3D) | Zora Link (+ guitar) | extracted from the ROM into [`../zora-guitar/`](../zora-guitar) (`link_zora.cmb` + `pz_gakki*.csab`) | `0x05` ("Majora") | `0x2c` |
| **Majora's Mask 3D** (MM3D) | Deku Link (+ pipes) | extracted from the ROM into [`../deku-link/`](../deku-link) (`link_deknuts.cmb` + `pn_gakki*.csab`) | `0x05` ("Majora") | `0x2c` |

The runtime CSAB parser ([`src/anim/csab.ts`](../../src/anim/csab.ts)) detects the
subversion and handles both. `emit2.mjs` auto-detects the cmb bone stride.

## Pipeline scripts (the ones you'd actually re-run)

| Script | Game | What it does |
| --- | --- | --- |
| `gar.mjs` | **MM3D** | Grezzo `LzS` decompressor (classic LZSS, 4096-byte ring buffer) + `GAR2` archive reader. Used to pull `link_zora.cmb` and the `pz_gakki*` clips out of `romfs/.../zelda2_link_zora_new.gar.lzs` / `zelda2_link_new.gar.lzs`. Has a CLI and an importable `parseGar`. |
| `emit2.mjs` | **both** | Generates a model's `skeleton.json` by mapping its cmb skeleton onto the joints of its Collada `.dae` by world position. Auto-detects bone stride (`0x2c` MM3D / `0x28` OoT3D) and emits per-bone `K`/`Dinv` retarget matrices when the dae's bind orientation differs from the cmb's (needed for Zora; a no-op for Adult). Used to build `link-zora`'s skeleton. |
| `emit.mjs` | **OoT3D** | Original Adult-Link-only `skeleton.json` generator (hard-coded `adult-ocarina/link_v2.cmb`, stride `0x28`, no retarget). Superseded by `emit2.mjs`; kept for reference. |
| `analyze.mjs` | **OoT3D** | The mapping + a decisive `G*Wcmb` vs `Wdae` world-match check that proved the Adult dae bind equals the cmb bind (so Adult needs no retarget). |

## OoT3D reverse-engineering / inspection scripts

All read `../adult-ocarina/` (OoT3D) data and were used while working out the
OoT3D `0x03` CSAB and cmb formats. They print to stdout; none write assets.

| Script | What it dumps |
| --- | --- |
| `inspect.mjs` | cmb `skl ` header + bone stride, and a CSAB header. |
| `inspect_clip.mjs` | A single named `nml_okarina_*` clip's structure. |
| `validate.mjs` | Samples every track of the okarina clips and reports NaN/Inf + max rotation/translation/scale ranges. |
| `test_csab.mjs` | Standalone OoT3D CSAB parser used to sanity-check sampling. |
| `flags.mjs` | Per-clip header flag fields. |
| `anod20.mjs` | An `anod` (animation node) record layout. |
| `dbg.mjs`, `dbg2.mjs`, `t2.mjs`, `tail.mjs` | Low-level byte/offset dumps of `nml_okarina_swing.csab`. |
| `dec16.mjs`, `lin16.mjs` | Experiments decoding the int16 (binary-angle) rotation keyframes. |
| `keys.mjs` | Dumps the joint ids of `Adult Link.dae`. |

## Reference

| File | Notes |
| --- | --- |
| `csab_ref.ts` | noclip.website's CSAB reader, kept verbatim as the spec for **both** the `Ocarina` (`0x03`) and `Majora` (`0x05`) formats. Not run directly (it imports noclip-only modules); `src/anim/csab.ts` is the trimmed, working port. |

## Re-extracting the MM3D data from scratch

`gar.mjs` expects the decrypted romfs at `3d-stuff/romfs/fs/` (produced with
`3dstool` from the `.3ds`; both are git-ignored). Then:

```sh
# pull the Zora model cmb + guitar clips out of the GAR archives, then build the
# skeleton + retarget matrices for the Zora dae:
node tools/emit2.mjs zora-guitar/link_zora.cmb "../public/models/link-zora/Zora Link.dae" \
  ../public/models/link-zora/anim/skeleton.json
```

(The `.cmb`/`.csab` inputs in `../zora-guitar/` were carved from the GARs with
`gar.mjs`'s `parseGar`.)

Deku Link is built the same way. Its `link_deknuts.cmb` comes from
`zelda2_link_nuts_new.gar.lzs` and its `pn_gakki*.csab` clips from the shared
`zelda2_link_new.gar.lzs` (the `nuts/anim/` entries); both are carved into
[`../deku-link/`](../deku-link), then:

```sh
node tools/emit2.mjs deku-link/link_deknuts.cmb "../public/models/link-deku/Deku Link.dae" \
  ../public/models/link-deku/anim/skeleton.json
```
