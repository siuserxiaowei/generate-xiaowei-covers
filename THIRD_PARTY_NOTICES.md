# Third-party notices

## Repository license

The repository's code, documentation, and original templates are distributed under GNU Affero General Public License v3.0 only (`AGPL-3.0-only`). See `LICENSE`.

AGPL coverage does not relicense third-party trademarks, externally supplied media, or the repository owner's portrait rights.

## Acknowledged inspiration

Early visual research was inspired by the Swiss social-card idea in [`op7418/guizang-social-card-skill`](https://github.com/op7418/guizang-social-card-skill), authored by `op7418`. The current public templates and Claim-to-Pixel implementation do not use that project's code scaffold. The acknowledgment is retained in `NOTICE.md`, `assets/SOURCES.md`, and `PROVENANCE.md`.

## Six-style preset research

`assets/style-presets.json` and `references/style-presets.md` record visual principles adapted for the owner's covers, with links and explicit workflow differences. They do not bundle or install upstream skills. The presets acknowledge:

- `op7418/guizang-social-card-skill`: editorial typography, paper, photo and marginal-column hierarchy.
- `panggungunvibe/atutun-xhs-cover-v2`: large outlined type and pale-yellow creator covers.
- `pyang5166/gbro-cover-design`: dark gradient, bold type and a single yellow keyword block.
- `oil-oil/oil-cover`: restrained pastel atmosphere, grid and clear title hierarchy; this preset does not run its video/portrait-compositing pipeline.
- `JimLiu/baoyu-skills` (`baoyu-cover-image`): multidimensional cover selection, adapted here to a real-person warm paper collage.

Source URLs are retained on every selected preset in the task's `STYLE_SELECTION.json`. No upstream sample portraits, screenshots, generated covers or executable code are included by this integration. The existing repository license does not expand rights to any source assets.

## Brand marks

Files under `assets/brand/` are official GitHub organization avatars used for product identification in examples. The marks remain trademarks of their owners. Inclusion does not imply endorsement or grant a general campaign-use license. Exact source URLs are in `assets/SOURCES.md` and row-level boundaries are in `ASSET_RIGHTS.csv`.

## Portraits

Files under `assets/portrait/` were supplied from the repository owner's event album, with authorization for public display in this repository and its examples. That permission is not a stock-photo license and does not authorize unrelated identity use or reuse by forks.

## Runtime software

The renderer can use an installed Playwright package or a local Chrome/Chromium executable. Those programs are not bundled by this repository and remain subject to their own licenses and terms.

## Claim2Cover contest demo

The contest fixture renders only repository-authored text, CSS, and geometric shapes. It embeds no portrait, brand avatar, screenshot, or external image. Its generated PNGs inherit the repository code/template license without expanding the rights of unrelated bundled assets.
