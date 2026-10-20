# Adwaita / libadwaita widget tokens — GTK4, GNOME 44–48

Extracted from upstream SCSS (no guessed values). Every hex below is either **quoted verbatim** from a
source file or marked **(computed)** with the formula behind it.

## Source pinning

Primary: **libadwaita 1.7.6** (GNOME 47). Its values were diffed against **1.8.0** (GNOME 48) and are
**identical for every token in this file** (same `_defaults.scss`, `_colors.scss`, `_common.scss` and
widget files; 1.8 only restructures files and adds `--overview-*` / `--active-toggle-*`). GNOME 44/45/46
deltas are listed at the end.

Raw URL pattern: `https://gitlab.gnome.org/GNOME/libadwaita/-/raw/<tag>/src/stylesheet/<file>`

| Short ref used below | Full upstream path |
|---|---|
| `_defaults.scss` | `src/stylesheet/_defaults.scss` |
| `_colors.scss` | `src/stylesheet/_colors.scss` |
| `_palette.scss` | `src/stylesheet/_palette.scss` |
| `_common.scss` | `src/stylesheet/_common.scss` |
| `_drawing.scss` | `src/stylesheet/_drawing.scss` |
| `buttons.scss` | `src/stylesheet/widgets/_buttons.scss` |
| `entries.scss` | `src/stylesheet/widgets/_entries.scss` |
| `checks.scss` | `src/stylesheet/widgets/_checks.scss` |
| `switch.scss` | `src/stylesheet/widgets/_switch.scss` |
| `popovers.scss` | `src/stylesheet/widgets/_popovers.scss` |
| `header-bar.scss` | `src/stylesheet/widgets/_header-bar.scss` |
| `window.scss` | `src/stylesheet/widgets/_window.scss` |
| `_labels.scss` | `src/stylesheet/widgets/_labels.scss` |
| `adw-style-manager.c` / `adw-accent-color.c` | `src/adw-style-manager.c`, `src/adw-accent-color.c` |

**Compositing convention.** Most Adwaita fills are `color-mix(in srgb, currentColor N%, transparent)`.
Those are *translucent*; the hex in this file is alpha-composited over the surface noted in the cell
(non-linear sRGB, same as GTK/Cairo). In light mode the fg is `rgb(0 0 6 / 80%)`, so a "10%" fill is
really alpha 0.08; in dark mode fg is opaque white, so alphas are literal. Move a button from window bg
onto a view/card and the hex shifts by 3–5 units.

---

## 1. Surfaces

| Token | Light | Dark | Source |
|---|---|---|---|
| Window background | `#fafafb` | `#222226` | `_defaults.scss:40` (`window_bg_color` → `--window-bg-color`) |
| View / content background | `#ffffff` | `#1d1d20` | `_defaults.scss:44` (`view_bg_color`) |
| Headerbar background | `#ffffff` | `#2e2e32` | `_defaults.scss:48` (`headerbar_bg_color`) |
| Popover background | `#ffffff` | `#36363a` | `_defaults.scss:78` (`popover_bg_color`) |
| Dialog background | `#fafafb` | `#36363a` | `_defaults.scss:74` |
| Sidebar background | `#ebebed` | `#2e2e32` | `_defaults.scss:56` |
| Card background | `#ffffff` | `rgb(255 255 255 / 8%)` ≈ `#343437` over window **(computed)** | `_defaults.scss:69` |
| Headerbar bottom hairline | `rgb(0 0 6 / 12%)` ≈ `#e0e0e1` over `#fff` **(computed)** | `rgb(0 0 6 / 36%)` ≈ `#1d1d22` over `#2e2e32` **(computed)** | `_defaults.scss:52` + `header-bar.scss:5` (`inset 0 -1px`) |
| Popover border | `1px rgb(0 0 0 / 14%)` ≈ `#dbdbdb` over `#fff` **(computed)** | same alpha ≈ `#2e2e32` over `#36363a` **(computed)** | `popovers.scss:18` |
| Popover shadow | `0 1px 5px 1px rgb(0 0 0/9%), 0 2px 14px 3px rgb(0 0 0/5%)` | same | `popovers.scss:19-20` |
| Popover padding / radius | `8px` / `15px` | same | `popovers.scss:24-25` (`$popover_radius = $menu_radius 9px + 6`) |
| Window radius / CSD outline | `15px` / `1px rgb(255 255 255 / 7%)` | same | `_common.scss:16-18`, `window.scss:11`, `_colors.scss:113` |
| Window CSD shadow | `0 2px 8px 2px rgb(0 0 0/13%), 0 3px 20px 10px rgb(0 0 0/9%), 0 6px 32px 16px rgb(0 0 0/4%), 0 0 0 1px rgb(0 0 0/0.5%)` | same | `window.scss:3-7` |
| Headerbar height | `min-height: 47px`; `.default-decoration` 37px | same | `header-bar.scss:2`, `:48` |

## 2. Foreground / text

| Token | Light | Dark | Source |
|---|---|---|---|
| Window fg | `rgb(0 0 6 / 80%)` ≈ `#323237` on window bg **(computed)** | `#ffffff` | `_defaults.scss:41` |
| View fg | `rgb(0 0 6 / 80%)` ≈ `#333338` on view bg **(computed)** | `#ffffff` | `_defaults.scss:45` |
| Dimmed label / placeholder | fg at 55% opacity ≈ `#8f8f91` on view, `#8c8c8f` on window **(computed)** | ≈ `#99999b` on view **(computed)** | `_colors.scss:117` (`$dim_label_opacity: 55%`), `_labels.scss:13` (`.dimmed { opacity: var(--dim-opacity) }`) |
| Disabled | `filter: opacity(50%)` (40% in high contrast) | same | `_colors.scss:119`, `:141` |
| Link | `var(--accent-color)` (see §3) | same | `_colors.scss:79` |

## 3. Buttons

Base rule `%button, button` — `buttons.scss:19-26`. Border: **none** in normal contrast
(`border-width: 0`; only `@if $contrast == 'high'` adds `box-shadow: inset 0 0 0 1px $border_color`,
`buttons.scss:31-33`). `box-shadow: none`.

| Token | Light | Dark | Source |
|---|---|---|---|
| Default bg (10%) | `rgba(0,0,6,0.08)` ≈ `#e6e6e7` over window / `#ebebeb` over view **(computed)** | `rgba(255,255,255,0.10)` ≈ `#38383c` over window **(computed)** | `buttons.scss:1`, `:29` |
| Hover bg (15%) | alpha 0.12 ≈ `#dcdcde` over window **(computed)** | `rgba(255,255,255,0.15)` ≈ `#434347` **(computed)** | `buttons.scss:2`, `:36` |
| Active / pressed (30%) | alpha 0.24 ≈ `#bebec0` over window **(computed)** | `rgba(255,255,255,0.30)` ≈ `#646467` **(computed)** | `buttons.scss:3`, `:41` |
| Checked (30%) | ≈ `#bebec0` over window **(computed)** | ≈ `#646467` **(computed)** | `buttons.scss:4`, `:45` |
| Checked + hover (35%) | alpha 0.28 ≈ `#b4b4b6` **(computed)** | ≈ `#6f6f72` **(computed)** | `buttons.scss:5`, `:48` |
| Checked + active (40%) | alpha 0.32 ≈ `#aaaaad` **(computed)** | ≈ `#7a7a7d` **(computed)** | `buttons.scss:6`, `:53` |
| Border-radius | `9px` | `9px` | `_common.scss:8` (`$button_radius: 9px`) |
| min-height | `24px` → **34px** rendered (24 + 5px top + 5px bottom padding) **(computed)** | same | `buttons.scss:20`, `:22` |
| min-width | `16px` (`.image-button` 24px) | same | `buttons.scss:21`, `:67` |
| Horizontal padding | `10px` base; `.text-button` **17px**; `.image-button` 5px | same | `buttons.scss:22`, `:66-75` |
| Font | `font-weight: bold`, size inherited (11pt / 14.67px) | same | `buttons.scss:24` |
| Text color | currentColor = window-fg ≈ `#323237` **(computed)** | `#ffffff` | inherited from `.background` (`_common.scss:20-23`) |
| Transition | `background 200ms cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 200ms …` | same | `buttons.scss:26`, `_common.scss:6-7` |
| Flat button hover / active / checked | 7% / 16% / 10% of currentColor ≈ `#ececed` / `#dadadc` / `#e6e6e7` over window **(computed)** | ≈ `#313135` / `#454549` / `#38383c` **(computed)** | `buttons.scss:234-270`, `_colors.scss:82-84` |
| Suggested-action (accent) | bg `#3584e4`, text `#ffffff` | same | `buttons.scss:220-228` |
| Destructive-action | bg = destructive-color @15% ≈ `#f2d4d5` over window, text ≈ `#c30000` **(computed)** | bg ≈ `#433335` over window, text ≈ `#ff938c` **(computed)** | `buttons.scss:10`, `:183-211` |
| Opaque button (`.opaque`) | `color-mix(window-bg 85%, window-fg)` ≈ `#dbdbdd` @97% **(computed)** | ≈ `#434347` **(computed)** | `buttons.scss:8`, `:213-218` |

## 4. Accent and semantic colors

| Token | Light | Dark | Source |
|---|---|---|---|
| Accent bg (`accent_bg_color`) | `#3584e4` (blue_3) | `#3584e4` | injected at runtime by `adw-style-manager.c:172` (`generate_accent_css`), hex from `adw-accent-color.c:54`; pre-1.7 it was `_defaults.scss:12` |
| Accent fg | `#ffffff` | `#ffffff` | `adw-style-manager.c:173` |
| Accent color (standalone: links, focus, checked text hue) | `#0461be` — **verified against upstream unit test** `tests/test-accent-color.c:234` | `#81d0ff` — verified `tests/test-accent-color.c:244` | `_defaults.scss:26` / `:32`: `oklab(from accent-bg min(l,0.5) a b)` / `max(l,0.85) a b` |
| Destructive bg | `#e01b24` (red_3) | `#c01c28` (red_4) | `_defaults.scss:12` |
| Destructive color | ≈ `#c30000` **(computed)**, oklab clamp `min(l,0.5)` | ≈ `#ff938c` **(computed)**, oklab clamp `max(l,0.85)` | `_defaults.scss:27` / `:33` |
| Success bg | `#2ec27e` (green_4) | `#26a269` (green_5) | `_defaults.scss:16` |
| Success color | ≈ `#007c3d` **(computed)** | ≈ `#78e9ab` **(computed)** | `_defaults.scss:28` / `:34` |
| Warning bg | `#e5a50a` (yellow_5) | `#cd9309` | `_defaults.scss:19` |
| Warning color | ≈ `#905400` **(computed)** | ≈ `#ffc252` **(computed)** | `_defaults.scss:29` / `:35` |
| Warning fg | `rgb(0 0 0 / 80%)` | same | `_defaults.scss:20` |
| Error bg / color | same as destructive (`#e01b24` / ≈ `#c30000`) | same as destructive (`#c01c28` / ≈ `#ff938c`) | `_defaults.scss:22`, `:30`/`:36` |
| Selection (focused) | accent-bg 30% ≈ `#c2daf7` over view **(computed)** | ≈ `#243c5b` over view **(computed)** | `_common.scss:58-65` |
| Selection (unfocused) | view-fg 10% ≈ `#ebebeb` over view **(computed)** | ≈ `#343436` **(computed)** | `_common.scss:59` |

## 5. Entry

Rule `%entry, entry` — `entries.scss:1-17`.

| Token | Light | Dark | Source |
|---|---|---|---|
| Background | currentColor 10% ≈ `#e6e6e7` over window **(computed)** | ≈ `#38383c` over window, `#4a4a4e` over dialog **(computed)** | `entries.scss:9` |
| Border | none, `border-width: 0` (HC only: `inset 0 0 0 1px rgba(fg,15%)`) | same | `entries.scss:13-15` |
| Border-radius | `9px` | same | `entries.scss:7` |
| min-height | `34px` (no vertical padding) | same | `entries.scss:4` |
| Horizontal padding | `9px` left + right, `border-spacing: 6px` for icons | same | `entries.scss:5-8` |
| Focus style | **outline**, not border: `outline-width: 2px; outline-offset: -2px; outline-color: accent-color @50%` ≈ `#7faedc` over window **(computed)** | ≈ `#527992` **(computed)** | `entries.scss:17` + `_drawing.scss:12-24` + `_colors.scss:116` |
| Placeholder | dimmed fg (55% opacity) ≈ `#8c8c8f` over window **(computed)** | ≈ `#9c9c9d` **(computed)** | `entries.scss:20-22`, `_colors.scss:117` |
| Caret | `currentColor` | same | `entries.scss:11` |
| `.flat` entry | transparent bg, radius 0, padding 2px, min-height 0 | same | `entries.scss:30-38` |

## 6. Check button and radio

| Token | Light | Dark | Source |
|---|---|---|---|
| Box size | `min-width/min-height: 14px` + `padding: 3px` → **20×20** rendered **(computed)** | same | `checks.scss:23-26` |
| Icon size | `-gtk-icon-size: 14px` | same | `checks.scss:25` |
| Border-radius (check) | `6px` (`$check_radius`) | same | `checks.scss:1`, `:69` |
| Border-radius (radio) | `100%` | same | `checks.scss:76` |
| Unchecked fill | transparent | transparent | `checks.scss:34-51` |
| Unchecked border | `inset 0 0 0 2px` currentColor 15% ≈ `#e0e0e1` over view / `#dcdcde` over window **(computed)** | ≈ `#3f3f41` over view / `#434347` over window **(computed)** | `checks.scss:31` + `_colors.scss:94` |
| Unchecked hover border | 20% ≈ `#d6d6d7` over view **(computed)** | ≈ `#4a4a4d` **(computed)** | `checks.scss:39` |
| Unchecked active fill | 25% ≈ `#cccccd` over view **(computed)**, border drops to none | ≈ `#565658` **(computed)** | `checks.scss:43-50` |
| Checked fill | `#3584e4` (accent-bg), no border | same | `checks.scss:53-57` |
| Checkmark color | `#ffffff` (`var(--accent-fg-color)`, icon recolored) | same | `checks.scss:56`, `:71-72` |
| Checkmark geometry | 14×14 icon, stroke ≈ **2.5px** (path r = 1.25), spans ≈ 11.7×10.6px | same | `src/stylesheet/assets/check-symbolic.svg` |
| Radio dot | **8px diameter** (circle r=4 inside the 14px icon) | same | `src/stylesheet/assets/bullet-symbolic.svg` |
| Checkbutton row | `padding: 3px`, `border-spacing: 4px`, radius `9px` (`$check_radius + 3`) | same | `checks.scss:3-8` |
| Transition | background + box-shadow, 200ms | same | `checks.scss:22` |

## 7. Switch

| Token | Light | Dark | Source |
|---|---|---|---|
| Track size | **46×26** = `2 × 20px` slider + `2 × 3px` padding **(computed)** from GTK measure + CSS rules | same | `switch.scss:4`, `:18-19`; `gtk/gtkswitch.c:342-345` (`minimum = 2 * MAX(slider, text)`) |
| Track border-radius | `14px` | same | `switch.scss:3` |
| Track padding | `3px` | same | `switch.scss:4` |
| Off track | currentColor 15% ≈ `#dcdcde` over window **(computed)** | `rgba(255,255,255,0.15)` ≈ `#434347` **(computed)** | `switch.scss:6` + `_colors.scss:94` |
| Track hover / active | 20% ≈ `#d2d2d4` / 25% ≈ `#c8c8ca` over window **(computed)** | ≈ `#4e4e51` / `#565658` **(computed)** | `switch.scss:8-9`, `_colors.scss:95-96` |
| On track | `#3584e4` (accent-bg) | same | `switch.scss:36` |
| Knob | `20×20`, radius `50%`, `#ffffff` (`color-mix(white 80%, view-bg)`) | `#d2d2d2` **(computed)** | `switch.scss:18-21`, `_colors.scss:98` |
| Knob shadow | `0 2px 4px rgb(0 0 6 / 20%)` | same | `switch.scss:22` |
| Knob when checked / hovered | `#ffffff` (`$slider_hover_color: white`) | `#ffffff` | `switch.scss:29-32`, `:41-43`, `_colors.scss:99` |
| Transition duration | **100ms**, GTK-internal progress tracker (`ANIMATION_DURATION 100`); no CSS transition on `switch` | same | `gtk/gtkswitch.c:196`, `:203` |
| Focus ring | 2px, `outline-offset: 1px` (outer) | same | `switch.scss:11` |

## 8. Focus ring

| Property | Value | Source |
|---|---|---|
| Width | `2px` | `_drawing.scss:12` (`$width: 2px`) |
| Offset | `-2px` (inset). When unfocused: `$offset + $width + 4px` = 4px; outer variant: `$offset + 4px` | `_drawing.scss:12`, `:15`, `:22` |
| Color (normal) | `color-mix(accent-color 50%, transparent)`; over window bg ≈ `#7faedc` light / `#527992` dark; over view ≈ `#82b0de` / `#4f7690` **(computed)** | `_colors.scss:2`, `:116` |
| Color (high contrast) | same accent at **80%** | `_colors.scss:2` |
| Style | `outline: 0 solid transparent` → `outline-width: 2px` on focus; focus state `:focus:focus-visible` for buttons, `:focus-within` for entries | `_drawing.scss:13-23`, `entries.scss:17` |
| Transition | `outline-color/width/offset 200ms cubic-bezier(0.25,0.46,0.45,0.94)` | `_common.scss:3-5` |

## 9. Typography and metric summary

| Token | Value | Source |
|---|---|---|
| Default UI font (GNOME 44–47) | `Cantarell 11` | `gsettings-desktop-schemas` `org.gnome.desktop.interface font-name`, tags 44.0–47.0 |
| Default UI font (GNOME 48) | `Adwaita Sans 11` | same schema, tag 48.0 / master |
| GTK built-in fallback | `Sans 10` (only if gsettings not applied) | `gtk/gtksettings.c:437` (`gtk-font-name` default) |
| Base size | `11pt` → **14.67px** at 96 dpi (`11 × 96/72`) **(computed)** | as above |
| Typical control label | 11pt / 14.67px; buttons `font-weight: bold` | `buttons.scss:24` |
| `.caption` / `.caption-heading` | `82%` ≈ 12.03px; heading weight 700 | `_labels.scss:63-71` |
| `.title-4` / `.title-3` / `.title-2` / `.title-1` | 118% / 136% / 136% / 181%; weights 700/700/800/800 | `_labels.scss:35-53` |
| Headerbar title | `.title { font-weight: bold }`, `.subtitle { font-size: smaller }` | `header-bar.scss:200-209` |
| Monospace (44–47) | `Source Code Pro 10` | `gsettings-desktop-schemas` 47.0 |
| Monospace (48) | `Adwaita Mono 11` | `gsettings-desktop-schemas` 48.0 |
| Radii | button/entry/menu `9px`; card `12px`; popover `15px`; window `15px`; dialog `15px` | `_common.scss:8-14`, `:16-18` |
| Standard control heights | button 34px, entry 34px, switch 26px, check/radio 20px | computed from the rules above |

---

## 10. Colors that libadwaita derives at runtime (CSS must approximate)

1. **`accent-color`, `destructive-color`, `success-color`, `warning-color`, `error-color`.**
   Not literals: `oklab(from <bg-color> min(l, 0.5) a b)` in light, `max(l, 0.85) a b` in dark
   (`_defaults.scss:26-36`; C implementation `adw-color-utils.c` / `adw-accent-color.c:130-158`).
   The blue values above (`#0461be`, `#81d0ff`) are confirmed by upstream test assertions
   (`tests/test-accent-color.c:234,244,261-262`). Other hues must be re-derived the same way; the dark
   values are usually **out of sRGB gamut and clipped** (e.g. blue at L=0.85 needs linear B=1.57), so an
   approximation will look flatter than GTK's.
2. **Accent bg is user-configurable since GNOME 47.** `adw-style-manager.c:162-173` injects
   `@define-color accent_bg_color <hex>` from `org.gnome.desktop.interface accent-color`
   (9 choices, `adw-accent-color.c:54-78`). Hardcoding `#3584e4` is only correct for the default blue.
3. **All `currentColor`-based fills.** `color-mix(in srgb, currentColor N%, transparent)` depends on the
   inherited fg *and* on the parent surface. The hexes in §3–§7 are composited over window bg; over
   view/card/dialog/sidebar they differ slightly. In light mode fg is 80% alpha, so effective alpha is
   `0.8 × N%`.
4. **Backdrop / disabled / dimmed.** `:backdrop` headerbar switches to `--headerbar-backdrop-color`
   (`= window bg`) and applies `filter: opacity(0.5)` (`header-bar.scss:33-44`); disabled widgets use
   `filter: opacity(50%)`, dimmed labels 55% (`_colors.scss:117-119`) — no separate hex exists.
5. **High contrast** (`$contrast == 'high'`) swaps alpha 15%/50% for 50%/80%, adds 1px inset borders,
   thickens switch troughs to 30/40/50%.

## 11. Version differences (GNOME 44 → 48)

| | 1.4.0 (GNOME 44) | 1.5.0 (GNOME 45) | 1.6.5 (GNOME 46) | 1.7.6 (GNOME 47) | 1.8.0 (GNOME 48) |
|---|---|---|---|---|---|
| window bg | `#fafafa` / `#242424` | `#fafafa` / `#242424` | `#fafafa` / `#242424` | `#fafafb` / `#222226` | same as 47 |
| view bg (dark) | `#1e1e1e` | `#1e1e1e` | `#1e1e1e` | `#1d1d20` | same as 47 |
| headerbar (dark) | `#303030` | `#303030` | `#303030` | `#2e2e32` | same as 47 |
| popover / dialog (dark) | `#383838` | `#383838` | `#383838` | `#36363a` | same as 47 |
| fg tint | `rgba(0,0,0,.8)` | `rgba(0,0,0,.8)` | `rgba(0,0,0,.8)` | `rgb(0 0 6 / 80%)` | same as 47 |
| accent bg | `#3584e4` | `#3584e4` | `#3584e4` | `#3584e4` (configurable) | same |
| accent color | `#1c71d8` / `#78aeed` (hardcoded) | `#1c71d8` / `#78aeed` | oklab-derived → `#0461be` / `#81d0ff` | same formula as 46 | same formula as 46 |
| success color | `#1b8553` / `#8ff0a4` | `#1b8553` / `#8ff0a4` | oklab-derived | oklab-derived | oklab-derived |
| warning color | `#9c6e03` / `#f8e45c` | `#9c6e03` / `#f8e45c` | oklab-derived | oklab-derived | oklab-derived |
| destructive color | `#c01c28` / `#ff7b63` | `#c01c28` / `#ff7b63` | oklab-derived | oklab-derived | oklab-derived |
| `$button_radius` | `6px` (popover 12px) | `6px` (popover 12px) | `6px` (popover 12px) | **`9px`** (popover 15px) | `9px` |
| switch | padding 2px, slider **22px** → track 48×26 | padding 3px, slider 20px → 46×26 | same as 45 | same as 45 | same as 45 |

Notes:
* The 1.6 → 1.7 jump is the visually significant one: radii 6→9px and the greys gain a slight blue tint
  (`#fafafb`, `#222226`, `2e2e32`, `#36363a`).
* `main` (1.9 dev) deletes `_defaults.scss` and moves its `@define-color` block into `_colors.scss`
  plus a new `_compat-colors.scss`; **the hexes are unchanged**, and it adds `--overview-bg-color`,
  `--overview-fg-color`, `--active-toggle-bg-color` (`#ffffff` / `rgb(255 255 255 / 20%)`) and exposes
  `--border-opacity`, `--dim-opacity`, `--disabled-opacity` as vars.
* GTK no longer ships an `Adwaita` theme directory in `gtk/theme` (only `Default` and `Empty`); the
  `gtk/theme/Adwaita/_colors-public.scss` URL in the brief 404s on every tag from 4.14 through main.
  `gtk/theme/Default/_colors.scss` is the legacy GTK3-era palette (`#f6f5f4` bg, `#3584e4` selected) and
  is **not** what libadwaita apps use — do not transcribe from it. `_compat-colors.scss` in libadwaita
  maps the legacy names (`theme_bg_color` → `window_bg_color`, etc.).

## 12. Quick copy-paste block (GNOME 47/48 defaults, blue accent)

```css
:root {
  --window-bg: #fafafb;      --window-fg: rgb(0 0 6 / 80%);
  --view-bg: #ffffff;        --view-fg: rgb(0 0 6 / 80%);
  --headerbar-bg: #ffffff;   --popover-bg: #ffffff;   --dialog-bg: #fafafb;
  --accent-bg: #3584e4;      --accent-fg: #ffffff;    --accent-color: #0461be;
  --destructive-bg: #e01b24; --destructive-color: #c30000;
  --success-bg: #2ec27e;     --success-color: #007c3d;
  --warning-bg: #e5a50a;     --warning-color: #905400;
  --button-bg: rgb(0 0 6 / 8%);   --button-hover: rgb(0 0 6 / 12%);  --button-active: rgb(0 0 6 / 24%);
  --trough: rgb(0 0 6 / 12%);     --trough-hover: rgb(0 0 6 / 16%);  --trough-active: rgb(0 0 6 / 20%);
  --focus-ring: rgb(4 97 190 / 50%);
  --radius: 9px; --radius-card: 12px; --radius-popover: 15px;
  --ease: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  font-family: Cantarell, "Adwaita Sans", sans-serif; font-size: 14.667px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --window-bg: #222226;    --window-fg: #ffffff;
    --view-bg: #1d1d20;      --view-fg: #ffffff;
    --headerbar-bg: #2e2e32; --popover-bg: #36363a; --dialog-bg: #36363a;
    --accent-bg: #3584e4;    --accent-fg: #ffffff;  --accent-color: #81d0ff;
    --destructive-bg: #c01c28; --destructive-color: #ff938c;
    --success-bg: #26a269;   --success-color: #78e9ab;
    --warning-bg: #cd9309;   --warning-color: #ffc252;
    --button-bg: rgb(255 255 255 / 10%); --button-hover: rgb(255 255 255 / 15%);
    --button-active: rgb(255 255 255 / 30%);
    --trough: rgb(255 255 255 / 15%); --trough-hover: rgb(255 255 255 / 20%);
    --trough-active: rgb(255 255 255 / 25%);
    --focus-ring: rgb(129 208 255 / 50%);
  }
}
```

*Alpha tuples in the block are the exact upstream fractions (`0.8 × 10%` etc.), so they behave correctly
on any surface — prefer them over the pre-composited hexes when the parent background varies.*
