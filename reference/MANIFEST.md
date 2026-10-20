# Reference image manifest — native platform UI controls

Ground-truth screenshots for the CSS recreation project. Everything listed below was
downloaded from the URL in column 4 and verified locally with `file(1)` and
`sips -g pixelWidth -g pixelHeight`. No image was generated, re-drawn, cropped, upscaled,
or otherwise synthesized.

Collected: 2026-10-20. Total for the 12 images below: **1.1 MB** (budget was ~25 MB).

## Images

| File path | Platform | Source page | Direct image URL | Dimensions (px) | Controls shown | Light/dark |
|---|---|---|---|---|---|---|
| `reference/shots/win11/win11-ui-gallery-home-light.png` | Windows 11 (WinUI 3) | https://github.com/microsoft/WinUI-Gallery | https://raw.githubusercontent.com/microsoft/WinUI-Gallery/main/.github/assets/Screenshot-light.png | 1493 × 805 | Full WinUI 3 Gallery window: NavigationView sidebar, title bar + caption buttons, search TextBox, pill-shaped accent/default PushButtons ("Recent"/"Favorites"), card buttons | Light |
| `reference/shots/win11/win11-button-standard-light.png` | Windows 11 (WinUI 3) | https://learn.microsoft.com/en-us/windows/apps/design/controls/buttons | https://learn.microsoft.com/en-us/windows/apps/design/controls/images/button.png | 277 × 115 | One standard XAML PushButton (isolated, plain background) — corner radius, 1px stroke, fill | Light |
| `reference/shots/win11/win11-toggle-switch-checkbox-light.png` | Windows 11 (WinUI 3) | https://learn.microsoft.com/en-us/windows/apps/design/controls/toggles | https://learn.microsoft.com/en-us/windows/apps/design/controls/images/toggleswitches02.png | 259 × 248 | ToggleSwitch in On state (accent fill, white thumb) plus a CheckBox in checked state, side by side with labels | Light |
| `reference/shots/win11/win11-text-field-single-line-light.png` | Windows 11 (WinUI 3) | https://learn.microsoft.com/en-us/windows/apps/design/controls/text-box | https://learn.microsoft.com/en-us/windows/apps/design/controls/images/single-line-text-input-type-text.png | 381 × 145 | Single-line TextBox (default and focused/typed states) — bottom accent stroke, corner radius | Light |
| `reference/shots/macos/macos-notes-sheet-buttons-light.png` | macOS (15 Sequoia-era HIG) | https://developer.apple.com/design/human-interface-guidelines/sheets | https://developer.apple.com/tutorials/images/com.apple.HIG/sheets-macos-notes@2x.png | 1092 × 846 | Real Notes.app window: traffic-light window buttons, circular toolbar buttons, centered modal sheet with corner radius, accent-tinted capsule "Continue" button | Light |
| `reference/shots/macos/macos-text-fields-number-currency-light.png` | macOS (15 Sequoia-era HIG) | https://developer.apple.com/design/human-interface-guidelines/text-fields | https://developer.apple.com/tutorials/images/com.apple.HIG/text-fields-formatted-text@2x.png | 676 × 224 | Two real macOS text fields (right-aligned numeric content) with 1px square-cornered bezel, next to their labels | Light |
| `reference/shots/macos/macos-checkbox-states-light.png` | macOS (15 Sequoia-era HIG) | https://developer.apple.com/design/human-interface-guidelines/toggles | https://developer.apple.com/tutorials/images/com.apple.HIG/checkbox-alignment@2x.png | 352 × 396 | CheckBox in mixed / off / on states, two nesting levels, accent-blue fill and white glyph | Light |
| `reference/shots/macos/macos-radio-button-states-light.png` | macOS (15 Sequoia-era HIG) | https://developer.apple.com/design/human-interface-guidelines/toggles | https://developer.apple.com/tutorials/images/com.apple.HIG/radio-button-example@2x.png | 352 × 300 | Five radio buttons, one selected (accent-blue dot in circle), four unselected | Light |
| `reference/shots/gnome/gnome-extensions-switch-list-light.png` | GNOME (GTK4 / libadwaita) | https://flathub.org/apps/org.gnome.Extensions | https://dl.flathub.org/media/org/gnome/Extensions/01b18c850c843a4ea33f8e27dd3a8faf/screenshots/image-1_orig.png | 922 × 572 | libadwaita Switch rows (on and off), boxed list rows, header bar with search and menu buttons, close button | Light |
| `reference/shots/gnome/gnome-alert-dialog-buttons-light.png` | GNOME (GTK4 / libadwaita) | https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.AlertDialog.html | https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/alert-dialog.png | 642 × 412 | Adw.AlertDialog: default "Cancel" button and red destructive "Replace" button, dialog corner radius and shadow | Light |
| `reference/shots/gnome/gnome-calculator-buttons-light.png` | GNOME (GTK4 / libadwaita) | https://flathub.org/apps/org.gnome.Calculator | https://dl.flathub.org/media/org/gnome/Calculator/e38157e4387ef6a0aef6faed3debf861/screenshots/image-1_orig.png | 410 × 666 | Dense button grid: flat grey buttons, white function buttons, accent-blue primary button, dropdown menu button | Light |
| `reference/shots/gnome/gnome-text-editor-headerbar-light.png` | GNOME (GTK4 / libadwaita) | https://flathub.org/apps/org.gnome.TextEditor | https://dl.flathub.org/media/org/gnome/TextEditor/de8119d267983b35d5b68f7504bbb64c/screenshots/image-1_orig.png | 1074 × 824 | Header bar buttons, split button ("Open ▾"), icon buttons, tab bar with close affordance, text area | Light |

## Which controls each platform covers

| Platform | Buttons | Text fields | Checkboxes | Radio buttons | Toggle switches |
|---|---|---|---|---|---|
| Windows 11 | yes | yes | yes | — | yes |
| macOS | yes | yes | yes | yes | — |
| GNOME | yes | — | — | — | yes |

## Quality notes / weak substitutes

- **Windows 11 — thinnest source set.** learn.microsoft.com only publishes 1x control
  screenshots (~38 px tall buttons, 20 px checkboxes), and there is no `@2x` variant
  (verified: `button@2x.png`, `button-2x.png`, `button_2x.png` all return HTTP 404).
  `win11-ui-gallery-home-light.png` is the highest-fidelity Win11 reference here. No
  first-party radio-button screenshot large enough to keep was found
  (`images/controls/radio-button.png` is 218 × 200 and reads as an icon).
- **macOS checkbox/radio images are official HIG artwork, not live window screenshots.**
  They are Apple's own 2x control renderings (correct shapes, accent colour, bezel), but
  they are vector illustrations on a flat grey card rather than captures of a running
  system. The other two macOS files are genuine app screenshots.
- **macOS toggle switches:** not covered. Apple's HIG "Toggles" page only ships iOS switch
  screenshots, and macOS itself uses switches sparingly; nothing suitable was found.
- **GNOME:** the four images are all real GTK4/libadwaita captures. Checkboxes, radio
  buttons and text entries are not covered as isolated controls — libadwaita's docs ship
  those only as 412 × 66 row crops (`entry-row.png`, `switch-row.png`) or 80 × 34 crops
  (`button-content.png`), too small to be worth keeping under the size rule.
  `class.CheckButton.html` returns HTTP 404 on the docs site.

## Where dark-mode variants live (not downloaded — cap of 4 images per platform)

- **Apple HIG:** every image in the table has a dark twin at the same URL with `@2x.png`
  replaced by `~dark@2x.png`, e.g.
  `https://developer.apple.com/tutorials/images/com.apple.HIG/checkbox-alignment~dark@2x.png`.
- **WinUI Gallery:** `Screenshot-dark.png` does **not** exist (404); the repo only ships
  `ReadmeHero-dark.png`, which is a hero banner rather than a UI capture.
- **learn.microsoft.com** control screenshots: no dark variants published (verified 404 on `@2x`).
- **libadwaita / Flathub:** dark screenshots are not consistently published per widget;
  would need to be captured from a running dark-mode session.

## Download failures encountered (and what was used instead)

| Attempt | Result | Resolution |
|---|---|---|
| `developer.apple.com/design/human-interface-guidelines/images/com.apple.HIG/*.png` (the path the HIG `.md` sources imply) | HTTP 404 for every variant tried, incl. root-relative and `docs-assets.developer.apple.com` | Found the real base via the HIG JSON API (`https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`, whose `references[].variants[].url` are served from `https://developer.apple.com/tutorials/images/com.apple.HIG/`) |
| `developer.apple.com/design/human-interface-guidelines/buttons` (HTML) | 200 but JS-only shell, no `<img>` in markup | Used the `.json` / `.md` endpoints instead |
| Wayback CDX search for archived HIG images | Only junk numeric URLs, no usable captures | Abandoned in favour of the JSON API |
| `support.apple.com` macOS Settings pages | 200, but the only assets are 48–60 px icons | Not used |
| `fluent2.microsoft.design` component "overview" PNGs (`overview_button.png` etc.) | 200, 458 × 296 | Rejected: decorative marketing illustrations (blue gradient cards), **not** real controls |
| `learn.microsoft.com/.../controls/images/pushbutton_doc_page.png` | 200, 600 × 320 | Rejected: grey wireframe layout diagram, no real control |
| Microsoft Store APIs for WinUI Gallery screenshots (`storeedgefd`, `displaycatalog`, apps.microsoft.com HTML) | 404 / only logo & tile assets | Used the WinUI Gallery GitHub repo's own screenshot instead |
| `apps.microsoft.com` screenshot carousel full-res IDs | Returned 50–310 px logos/tiles | Not used |
| `flathub.org/api/v2/appstream/org.gnome.Settings` | HTTP 404 (Settings is not distributed on Flathub) | Substituted Extensions + Calculator + Text Editor |
| `crdownload` of 88 × 88 Apple checkbox/radio artwork (`checkbox-selected@2x.png` etc.) | 200 but only 88 px wide | Deleted, per the "icons < ~200 px" rule; used the 352 px multi-state artwork instead |

## Supplemental files added after the main collection run

These were fetched by the Lead while cross-checking, and supersede the earlier note that
called the `gnome/hig-*` files "Apple artwork" — they are **GNOME's own HIG** assets.

| File | Platform | Source page | Direct URL | Dimensions | Notes |
|---|---|---|---|---|---|
| `macos/wiki-system-settings.png` | macOS | https://en.wikipedia.org/wiki/System_Settings | https://upload.wikimedia.org/wikipedia/en/d/d1/MacOS_System_Settings.png | 305 × 262 | Real System Settings window; small, but shows checkbox/switch/button density together |
| `win11/ms-button-dialog-example.png` | Windows 11 | https://learn.microsoft.com/en-us/windows/apps/design/controls/buttons | https://learn.microsoft.com/en-us/windows/apps/design/controls/images/button-dialog-example.png | 387 × 289 | Real Win11 dialog: primary/secondary buttons, checkbox, dialog radius — the best small Win11 reference |
| `gnome/hig-buttons.png` | GNOME | https://developer.gnome.org/hig/patterns/controls/buttons.html | https://developer.gnome.org/hig/_images/buttons.png | 117 × 70 | Default + icon button; grey fill, bold label, no border |
| `gnome/hig-buttons-suggested-destructive.png` | GNOME | same | https://developer.gnome.org/hig/_images/buttons-suggested-destructive.png | 246 × 70 | Suggested-action blue and destructive pink variants |
| `gnome/hig-button-shapes.png` | GNOME | same | https://developer.gnome.org/hig/_images/button-shapes.png | 126 × 126 | Button shape family |

Removed after review: the other `win11/ms-*.png` 1x duplicates (superseded by the
`win11-*.png` shots above) and `gnome/hig-buttons-dark.png` (dark asset on a transparent
background renders invisible in the light gallery).

## Contradiction worth knowing: macOS text field corners

`macos-text-fields-number-currency-light.png`、`hig-text-fields-truncated-text.png` 和
`hig-text-fields-clipped-text.png` 都是 Apple 官方图，但它们的输入框是**直角**的；
而 `hig-components-text-field-intro.png`（组件示意图）里的输入框是**全圆角胶囊**。
实际系统里标准输入框是 6px 左右的圆角矩形，那几张直角图是 formatted text 这一类的特例。
`theme-macos.css` 按 6px 圆角做。

## Version notes that matter when using these references

- The macOS control artwork is from the **macOS 26 (Tahoe)** HIG (`alert-date: 2025-12-16`,
  "Updated guidance for Liquid Glass"), not Big Sur–Sequoia. Capsule buttons and the
  grey-filled unselected checkbox/radio are Tahoe-specific.
- The GNOME captures are libadwaita 1.6–1.7 era; GNOME 44–46 use 6px radii and a more
  neutral palette than the 9px / blue-tinted 47–48 values used in `theme-gnome.css`.
- Everything here is light mode. Dark tokens were derived from the same upstream sources,
  not from dark screenshots.


## Input-specific references (`reference/shots/macos/fields/`)

Collected while checking the input-field variants; kept in a subfolder so they don't flood
the main comparison grid.

| File | What it shows | Takeaway |
|---|---|---|
| `hig-components-text-fields-thumbnail.png` | Apple's current text-field artwork | Rounded rectangle, **no border**, translucent fill, clear button. Radius ≈ 0.2 × height |
| `hig-components-search-field-intro.png` | Search field anatomy | Full capsule, no border, leading magnifier + trailing mic |
| `hig-text-fields-truncated-text.png`, `hig-text-fields-clipped-text.png` | Bezeled text field in use | 1px grey stroke, **square** corners — the formatted-text special case |
| `hig-search-fields-toolbar-search-mac.png` | macOS toolbar search | Filled, capsule, no border |
| `webinspector-sonoma.png` | Safari + Web Inspector (Sonoma, 2×) | Real address bar: borderless filled capsule; inspector filter field: bezeled rounded |
| `firefox-136-sonoma.png` | Firefox on Sonoma | Search/address field, borderless rounded |

Conclusion used in `theme-macos.css`: 未聚焦无描边（只有淡填充 + 6px 圆角），聚焦才出现 1px 蓝色描边
加外发光。HIG 里带灰边的 formatted-text 截图当特例处理，不做默认态。
