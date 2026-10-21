> 这些图不入库：它们是第三方版权素材，仓库是公开的。下表给出直链，按需下载到 `reference/shots/<平台>/` 即可。

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


## macOS 11–15（26 之前）：真实 pre-26 截图（第二来源）

`reference/shots/macos15/official/`。这批图解决两件事：**1)** 本机 AppKit 的 legacy 路径
（`tools/render-macos-legacy.sh`，LC_BUILD_VERSION sdk 15.0）画出来的外观是不是真的等于旧系统；
**2)** 这套旧外观覆盖 macOS 11–15 的哪些版本。它们是 Apple 自己的真机截图，既不是 HIG 的
矢量组件图，也不是我们自己的渲染，所以独立于 `reference/shots/macos15/appkit/`。

**找图方法（可复现）**：Apple 官方支持文档是按 macOS 版本冻结的——同一篇文章有
`/11.0/`、`/12.0/`、`/13.0/`、`/14.0/`、`/15.0/`、`/26.0/` 这样一组版本路径，正文里的截图随版本
换一套，图片直链也随之换 hash。所以
`https://support.apple.com/guide/mac-help/<slug>/15.0/mac/15.0` 里的图就是 **Sequoia 时代**的
官方截图，`/11.0/` 里是 **Big Sur** 的，`/26.0/` 里是 Tahoe 的（Tahoe 的不收）。抓页面后
在 HTML 里 grep `help.apple.com/assets` 就能拿到直链；`<picture><source>` 那个 `media="(not all)"`
的变体是**透明底**版本，不是深色版（已逐像素确认）。

**注意：这些图不是 2×，不能一律除以 2。** Apple 把 Retina 截图缩到网页展示宽度再导出
（例如 932 px = 466 pt 展示宽 ×2），每张图的 px/pt 不一样。下表「Scale」是用图内恒定锚点反推的：
窗口红绿灯是 **12 pt 圆、圆心间距 20 pt**（Big Sur–Tahoe 不变）；或 13 pt 系统字体字符串的排版
宽度（用 SF Pro Text 的 advance width 除以像素宽）。**pt = px ÷ Scale**，误差约 ±1 pt。

| File | Platform / version | Source page | Direct image URL | Dimensions (px) | Scale (px/pt) | Controls shown | Light/dark |
|---|---|---|---|---|---|---|---|
| `reference/shots/macos15/official/apple-macos15-settings-appearance-light.png` | macOS 15 Sequoia | https://support.apple.com/guide/mac-help/change-system-settings-mh15217/15.0/mac/15.0 | https://help.apple.com/assets/67D1B1065D0706C4AD080C54/67D1B10E5D0706C4AD080C79/en_US/9d447c4b1ecc39663a72d63e67093be5.png | 932 × 810 | ≈1.30 | System Settings / Appearance 整窗：两棵 radio 组（选中/未选中）、"Allow wallpaper tinting" 开关（off）、两个无边框 popup（Highlight color / Sidebar icon size）、侧栏 search field、侧栏选中态、窗口红绿灯 | Light |
| `reference/shots/macos15/official/apple-macos15-settings-appearance-ventura-light.png` | macOS 13 Ventura | https://support.apple.com/guide/mac-help/change-system-settings-mh15217/13.0/mac/13.0 | https://help.apple.com/assets/63BCA927AAE78C58DD7FBE35/63BCA92EAAE78C58DD7FBE76/en_US/a41e16f080bfe11a27da7bce5a359c86.png | 932 × 1030 | ≈1.30 | 同一块 Appearance 面板（Ventura 版）：radio / 开关 / 无边框 popup | Light |
| `reference/shots/macos15/official/apple-macos15-settings-appearance-sonoma-light.png` | macOS 14 Sonoma | https://support.apple.com/guide/mac-help/change-system-settings-mh15217/14.0/mac/14.0 | https://help.apple.com/assets/65A8106E7C69B635140E606E/65A81072C0272B1FFA02DE51/en_US/5d3b04e849823be4d39e231cbd0a501f.png | 934 × 860 | ≈1.30 | 同一块 Appearance 面板（Sonoma 版） | Light |
| `reference/shots/macos15/official/apple-macos15-settings-appearance-monterey-light.png` | macOS 12 Monterey | https://support.apple.com/guide/mac-help/change-system-settings-mh15217/12.0/mac/12.0 | https://help.apple.com/assets/62A8ED2F99A5D0045E612A42/62A8ED3DCA32D1047032C8FF/en_US/b17453871feeac3428395ceee219d4b1.png | 932 × 880 | ≈1.30 | System Preferences 整窗（Monterey）：工具栏、图标网格、侧栏选中态 | Light |
| `reference/shots/macos15/official/apple-macos15-settings-appearance-bigsur-light.png` | macOS 11 Big Sur | https://support.apple.com/guide/mac-help/change-system-settings-mh15217/11.0/mac/11.0 | https://help.apple.com/assets/605932B4A1B7A93F492858E8/605932C0A1B7A93F492858FF/en_US/98e74e51dff4e7794a0a9a4a67422d86.png | 931 × 880 | ≈1.30 | System Preferences 整窗（Big Sur）：同样的红绿灯、工具栏按钮、图标网格 | Light |
| `reference/shots/macos15/official/apple-macos15-print-dialog-light.png` | macOS 15 Sequoia | https://support.apple.com/guide/mac-help/print-documents-mh35838/15.0/mac/15.0 | https://help.apple.com/assets/67D1B1065D0706C4AD080C54/67D1B10E5D0706C4AD080C79/en_US/5c93d9473861d0238044c1e11590e18a.png | 932 × 886 | ≈1.24 | 打印对话框：Cancel/Print 普通按钮 + 主按钮、4 个 radio（1 选中）、range/Copies 输入框、无边框 popup（Printer/Double-sided）、"Print in Color" 开关、stepper | Light |
| `reference/shots/macos15/official/apple-macos15-print-dialog-bigsur-light.png` | macOS 11 Big Sur | https://support.apple.com/guide/mac-help/print-documents-mh35838/11.0/mac/11.0 | https://help.apple.com/assets/605932B4A1B7A93F492858E8/605932C0A1B7A93F492858FF/en_US/08e40863258849b3ed0034033337cd36.png | 896 × 888 | ≈1.44 | 打印对话框（Big Sur 版）：**复选框 off（Black & White）与 on（Two-Sided）**、radio、Cancel/Print、range 输入框、bezel popup（蓝色强调箭头格）、窗口红绿灯 | Light |
| `reference/shots/macos15/official/apple-macos15-touchid-checkboxes-bigsur-light.png` | macOS 11 Big Sur | https://support.apple.com/guide/mac-help/use-touch-id-mchl16fbf90a/11.0/mac/11.0 | https://help.apple.com/assets/605932B4A1B7A93F492858E8/605932C0A1B7A93F492858FF/en_US/39141cfbdeafaeb5ea8b7bf62066bb1b.png | 931 × 559 | ≈1.44 | Touch ID 面板：5 个**已选中复选框**、工具栏 search field、窗口红绿灯 | Light |
| `reference/shots/macos15/official/apple-macos15-touchid-checkboxes-monterey-light.png` | macOS 12 Monterey | https://support.apple.com/guide/mac-help/use-touch-id-mchl16fbf90a/12.0/mac/12.0 | https://help.apple.com/assets/62A8ED2F99A5D0045E612A42/62A8ED3DCA32D1047032C8FF/en_US/883cac2e564258f09038c911ff6224fd.png | 934 × 658 | ≈1.46 | Touch ID 面板（Monterey）：5 个已选中复选框、search field、工具栏 | Light |
| `reference/shots/macos15/official/apple-macos15-touchid-switches-light.png` | macOS 15 Sequoia | https://support.apple.com/guide/mac-help/use-touch-id-mchl16fbf90a/15.0/mac/15.0 | https://help.apple.com/assets/67D1B1065D0706C4AD080C54/67D1B10E5D0706C4AD080C79/en_US/b41a21e514f1b6f1f0aee5b087ac5588.png | 868 × 732 | ≈1.42 | Touch ID & Password 面板：5 个**开启态开关**、`Change…` 小按钮 | Light |
| `reference/shots/macos15/official/apple-macos15-users-group-switches-light.png` | macOS 15 Sequoia | https://support.apple.com/guide/mac-help/add-a-user-or-group-mchl3e281fc9/15.0/mac/15.0 | https://help.apple.com/assets/67D1B1065D0706C4AD080C54/67D1B10E5D0706C4AD080C79/en_US/e1410c74b31bf7dca52ad96ca0ea6d3d.png | 758 × 854 | ≈1.67 | Group sheet：7 个**关闭态开关**、`Delete Group…` / `Cancel` / 强调色 `OK` 三个普通按钮、sheet 圆角 | Light |
| `reference/shots/macos15/official/apple-macos15-signin-field-light.png` | macOS 15 Sequoia | https://support.apple.com/guide/mac-help/sign-in-to-your-apple-account-mchla99dc8da/15.0/mac/15.0 | https://help.apple.com/assets/67D1B1065D0706C4AD080C54/67D1B10E5D0706C4AD080C79/en_US/90b9668e536587bc0da84732f3b24852.png | 668 × 836 | ≈1.44 | 登录面板：一个**大号 text field**（placeholder `Email or Phone Number` + 右端 `required`）、禁用态 Continue、`Forgot Password` / `Don't Have an Account?` 普通按钮 | Light |
| `reference/shots/macos15/official/apple-macos15-control-center-sliders-light.png` | macOS 15 Sequoia | https://support.apple.com/guide/mac-help/quickly-change-settings-mchl50f94f8f/15.0/mac/15.0 | https://help.apple.com/assets/67D1B1065D0706C4AD080C54/67D1B10E5D0706C4AD080C79/en_US/e829da05d7af002600d015b7cdc92533.png | 924 × 1054 | ≈1.33（估） | Control Center：Display 亮度滑杆 + Sound 音量滑杆、菜单栏（24 pt 高）、圆形模块开关、整块面板圆角 | Light |
| `reference/shots/macos15/official/apple-macos15-screentime-popup-light.png` | macOS 15 Sequoia | https://support.apple.com/guide/mac-help/set-up-screen-time-for-yourself-mchle4e2edfe/15.0/mac/15.0 | https://help.apple.com/assets/67D1B1065D0706C4AD080C54/67D1B10E5D0706C4AD080C79/en_US/5a0eedd4a833f14a7a73e4cf2cecafbe.png | 668 × 836 | ≈1.37 | Screen Time 面板：`Family Member` 无边框 popup（带灰色双 chevron）、带 chevron 的行（`>` disclosure） | Light |
| `reference/shots/macos15/official/apple-macos15-finder-toolbar-light.png` | macOS 15 Sequoia | https://support.apple.com/guide/mac-help/organize-your-files-in-the-finder-mchlp2605/15.0/mac/15.0 | https://help.apple.com/assets/67D1B1065D0706C4AD080C54/67D1B10E5D0706C4AD080C79/en_US/5efb4dc160ec1878baf3abe36dc3ba10.png | 932 × 708 | ≈1.4（估） | Finder 整窗：工具栏 4 个图标按钮、侧栏选中态、工具条/Sidebar 分隔线；用于看窗口级按钮与选中态，不用于量控件 | Light |

补充（推翻旧清单第 49 行的「macOS toggle switches: not covered」）：现清单收到了 15.0 的
Touch ID / Screen Time / Users & Groups 截图，macOS 开关和复选框都有了官方真机图；区别是
**13+ 系统设置行里用的是小号开关**，和 AppKit `NSSwitch` 的 regular 尺寸（38×22）不是同一个尺寸档。

## 实测：pre-26 截图 vs AppKit legacy 渲染（`reference/shots/macos15/appkit/metrics.txt`）

量法：Python + Pillow，在 2×/缩放后的 PNG 上取「和底色差 > 阈值」的包围盒；pt = px ÷ 上表 Scale。
AppKit 一列来自 `metrics.txt`（2× PNG，坐标已是 CSS px/pt；`frame` 是 `sizeToFit` 的 frame，
`可见` 是实际画出来的包围盒）。**比较用「可见」值**，因为截图里没有 frame 的概念。

| Control | AppKit legacy（metrics.txt） | pre-26 截图实测 | 结论 |
|---|---|---|---|
| 普通按钮 高度 | frame 200×32，**可见 188×22**（含约 1px 落影；bezel 本身 21），圆角约 6 | Big Sur 打印对话框 Cancel：32 px ÷1.44 = **22.2**；Sequoia 打印对话框 Cancel：27 px ÷1.24 = **21.8**；Sequoia group sheet Cancel/OK：36 px ÷1.67 = **21.5** | **一致**（可见高 22 pt；旧文档里的「32」是 frame 高，不是画出来的高度） |
| 普通按钮 圆角 | 约 6（metrics 的圆角剖面拟合，≈6.1） | Big Sur Cancel 左上角：7–8 px ÷1.44 ≈ **5** | **差 1px 内**（官方图缩放 + 抗锯齿会压小拟合值） |
| 普通按钮 填充/描边/字色 | `#FFFFFF` 填充，字色 `#040404`，1 px 描边 + 落影 | 截图里同一套：白底、1 px 灰描边 + 落影；字色最暗像素 `#0A0A0A`（11）/`#252525`（15） | **一致**（legacy 离屏没有抗锯齿，字更黑；见下方「颜色」） |
| 主按钮 填充 | `#1370FF`（light 渐变 top `#257AFF` / bottom `#0265FF`） | Big Sur Print `#1774FF`；Sequoia Print `#1471FF` | **一致**（Δ≤8/255：截图是 sRGB 8-bit，被缩放+抗锯齿平滑过） |
| 复选框 尺寸 | off 可见 **14×14**、on 可见 **16×16**（on 的轮廓含外发光），圆角 3.5 | Big Sur 打印对话框：off 21 px、on 22 px ÷1.44 = **14.6 / 15.3**；Big Sur Touch ID 5 个 on：21 px ÷1.44 = **14.6**；Monterey Touch ID：21–22 px ÷1.46 = **14.4–15.1** | **一致**（±1 pt） |
| 单选 尺寸 | off 可见 **14×14**、on 可见 **16×16**，圆角 50% | Sequoia Appearance：19 px ÷1.30 = **14.6**；Sequoia 打印对话框：18 px ÷1.24 = **14.5**；Big Sur 打印对话框：21 px ÷1.44 = **14.6** | **一致**（±1 pt） |
| 开关 尺寸 | frame 42×25，**可见 38×22**（NSSwitch intrinsic 38×22） | 官方截图里全部是 **系统设置行内的小号开关**：34×21 px ÷1.30 = **26×16**（Appearance）、35×23 px ÷1.42 = **25×16**（Touch ID）、≈40×27 px ÷1.67 = **24×16**（group sheet） | **尺寸不一致，但不是外观不一致**：截图证明 13+ 的系统设置在行内用更小的开关变体；regular 尺寸（38×22）的开关在官方截图里没找到，**regular 只能信 legacy 渲染**。形状/配色一致（灰轨/蓝轨/白 knob） |
| 开关 配色 | 轨道 off `#D8D8D8`、on `#1485FF`（渐变 top `#047CFF`）、knob `#FFFFFF` 20×20 | 截图：off 轨道 ≈`#D3D3D3`、on 轨道 `#1585FE`、knob 白 | **一致** |
| 输入框 可见高 | frame 300×22，**可见 299×21.5**，1 px 描边（上 `#CECECE`/下 `#979797`），圆角 6，填充 `#FFFFFF` | Big Sur 打印对话框未聚焦 range field：29 px ÷1.44 = **20.1**；聚焦的 Copies field：36 px ÷1.44 = **25**（含蓝色聚焦环，环外扩约 2.5 pt/side） | **基本一致**：未聚焦 20.1 与 legacy 21.5 差 1.4 px，可能是未聚焦 / 紧凑变体或缩放误差；聚焦 25 = 22 + 环 |
| 输入框 特例 | — | Sequoia 登录面板的字段是 **大号**（47 px ÷1.44 = **32.6**），不是标准 22 pt bezel | 特例，别拿它当默认 token；说明旧系统里存在大号 text field |
| 下拉框 可见尺寸 | 180×25 frame，**可见 175×22**，双 chevron 约 **6.5×10.5**，chevron `#323232` | Big Sur 打印对话框 bezel popup：295×31 px ÷1.44 = **205×21.5**；右端箭头是 **23×24 px ≈ 16×16.7 的蓝色强调方块**（key 窗口样式）。Sequoia 设置/打印里是 **无边框 popup**：只有文本 + 灰色双 chevron（chevron 高约 11 pt） | **高度一致**（21.5 vs 22）；**chevron 形状一致，但旧系统存在两种 popup 样式**：bezel+强调箭头格（Big Sur 打印面板）与 borderless+灰箭头（13+ 设置/打印）。legacy 渲染是「bezel+灰 chevron」这第三种组合，见下 |
| 滑块 | frame 220×24，轨道 **4 px**，填充 `#0A82FF`，未填充 `#E2E2E2`，knob **20×20** 白圆 + 1.5 px 落影 | 官方截图只找到 **Control Center 滑杆**（高轨道 ≈29 px ÷1.33 ≈ 22 pt、另一套玻璃外观）。标准 NSSlider 的 pre-26 官方截图没找到（Big Sur/Monterey/Sequoia 的 Sound/Display 帮助文章都只有表格，没有图） | **无法判断**（Control Center 滑杆不是 NSSlider，不能拿来校 4 pt 轨道/20 pt knob） |
| 强调色 | 单选/开关/滑块 `#1485FF`/`#0A82FF`；按钮 `#1370FF` | 打印主按钮 `#1774FF`(11)/`#1471FF`(15)；OK 按钮 `#1889FF`；开关 on 轨道 `#1585FE` | **一致**（Δ≤8/255） |
| 正文文字色 | `#040404`（离屏、无子像素抗锯齿） | 最暗像素 `#0A0A0A`（Big Sur）/`#252525`（Sequoia）；13 pt 字实际观感 ≈ `#1D1D1F`–`#262626` | **一致（量级）**；legacy 更黑是渲染路径差异，不是外观差异 |
| 窗口/面板底 | legacy window bg light `#ECECEC` | Sequoia Appearance：detail 面板 `#F2F2F2`、侧栏 `#E9E9E9`；sheet 底 `#F2F2F2` | 一致量级（AppKit 离屏拿不到真实窗口灰，`metrics.txt` 已注明） |

**关于 popup 的蓝色箭头格**：legacy 渲染的 caveat 里说「离屏会画出蓝色强调箭头格，进窗口才是白底灰
chevron」。Big Sur 的真机打印对话框截图（key 状态的 sheet）**箭头格就是蓝色的**，所以那个「错误」
更可能是「key/活跃窗口 vs 非活跃/离屏」的样式差别，而不是纯粹的 bug；13+ 同一位置变成无边框灰箭头，
说明 popup 外观在 11→13 之间改过一次。复刻时按 13–15（=legacy sdk 15）的目标取「无边框/bezel+灰
chevron」即可，蓝色强调箭头格属于 11 时代 / key 窗口样式。

## 这套外观覆盖哪些版本（附来源）

结论：**macOS 11 Big Sur – 15 Sequoia 共用同一套控件外观**（按钮、复选框、单选、开关、输入框、
下拉框）。26 Tahoe 是另一次改版。依据：

| 版本 | 证据图（本目录） | 能证明什么 |
|---|---|---|
| 11 Big Sur | `apple-macos15-print-dialog-bigsur-light.png`、`apple-macos15-touchid-checkboxes-bigsur-light.png`、`apple-macos15-settings-appearance-bigsur-light.png` | 复选框 on/off、单选、普通/主按钮、输入框、bezel popup（蓝箭头格）都是这套外观；System Preferences 窗口结构 |
| 12 Monterey | `apple-macos15-touchid-checkboxes-monterey-light.png`、`apple-macos15-settings-appearance-monterey-light.png` | 复选框与 11 同一套；System Preferences 窗口 |
| 13 Ventura | `apple-macos15-settings-appearance-ventura-light.png` | Appearance 面板：radio 直径 18–19 px、小号开关、无边框 popup；窗口结构从 System Preferences 变成 System Settings，但**控件本身没变**（radio/开关 px 尺寸与 15.0 相同） |
| 14 Sonoma | `apple-macos15-settings-appearance-sonoma-light.png` | 同上：radio 19×18 px，与 13/15 完全一致 |
| 15 Sequoia | 其余全部图 | 完整控件集（含普通按钮 22 pt、复选框/单选 14–16 pt 的复核） |
| 26 Tahoe（对照，不收） | 同一批 support 文章的 `/26.0/` 版本：Appearance 面板多出 Liquid Glass 区域、按钮变胶囊、未选中复选框变灰底；HIG 页 `alert-date: 2025-12-16`（"Updated guidance for Liquid Glass"） | 26 与 11–15 不是同一套外观，本主题只覆盖 11–15 |

注意：11/12 的截图是 System Preferences（图标网格窗口），13–15 是 System Settings（侧栏窗口）；
**窗口结构变了，但控件像素一样**。版本间的其他差别（Big Sur 打印面板的 bezel+蓝箭头 popup → 13+
的无边框灰箭头 popup）见上一节。

## 下载失败 / 替代方案

| 尝试 | 结果 | 处理 |
|---|---|---|
| Wayback CDX：pre-Tahoe HIG 的 JSON 接口 `developer.apple.com/tutorials/data/design/human-interface-guidelines/toggles.json`（2023–2025-09 区间） | 无快照（CDX 返回 `[]`；archive.org 期间还回过 429 / "Temporarily Offline"） | 放弃 HIG 路线，改用 Apple 支持文档的版本化页面（本清单的来源） |
| Wayback CDX：HIG 图片 `developer.apple.com/tutorials/images/com.apple.HIG/checkbox-alignment@2x.png`、`radio-button-example@2x.png`、`toggles-intro@2x.png` | 无快照（`[]`），图片目录也没有存档 | 同上 |
| 现行 HIG JSON 里的 pre-26 图 | HIG 在 2025-12 为 Tahoe 改过版，旧文件被原地替换（现在的 `checkbox-*` 是灰底未选中、按钮是胶囊） | 按任务约束不收 Tahoe 图；pre-26 版本拿不回来 |
| HIG `.md` / `.json` 之外的旧 HIG 站点（`/design/human-interface-guidelines/macos/...`，2020–2022） | Wayback 只有 JS 壳或被重定向的旧页面，没有可用的 pre-Big Sur 之后的控件图 | 不用（而且那是 Big Sur 之前的旧外观，不是本主题目标） |
| Wikipedia `File:Screenshot of macOS Sequoia.png`（优先来源 c） | 非自由版权图只有 **400×250** 的缩略图 | 按「缩略图不收」放弃；没有其它够大的 macOS 15 条目截图 |
| 找标准 NSSlider 的截图：Big Sur/Monterey/Ventura/Sequoia 的 `Change Sound settings`、`Turn volume up or down`、`Change display brightness` 文章 | 都是纯文字+表格，0 张图 | 滑块只能拿 Control Center 滑杆（另一套外观），标准 NSSlider 记为「无法判断」 |
| 深色（dark）官方 pre-26 截图 | Apple 支持文档只有浅色截图；`<picture><source>` 的变体是**透明底**版而不是深色版（逐像素对比确认）；HIG 的 `~dark@2x` 是 Tahoe 时期资产 | **收不到官方 pre-26 深色控件级截图**。本目录全部是浅色；第三方深色教程图未收（多为压缩/带标注，依据降一档后价值低） |
| 多行输入（NSTextView）的官方 pre-26 截图 | 找过 Mail/Notes/Dictation 相关文章，图里都是整窗或图标，没有可量的多行输入控件 | **没找到**；多行输入只能靠 legacy 渲染/上游源码 |
| regular 尺寸 NSSwitch、标准 NSSlider 的 pre-26 真机图 | 13+ 系统设置行内一律小号开关；滑杆截图只有 Control Center | 这两项尺寸以 `metrics.txt` 的 AppKit legacy 实测为准，截图只能核对形状/颜色 |

## 这份证据不能回答的

- **深色一套全缺**（见上表）。深色 token 仍然只能来自 AppKit legacy 渲染 + HIG 文字描述。
- **悬停 / 按下 / 焦点态**（除了打印对话框 Copies 字段的蓝色聚焦环）没有 pre-26 截图；
  `--btn-bg-hover` 这类值没有截图像素依据。
- **regular 尺寸的开关**、**标准 NSSlider**、**多行输入** 没有官方 pre-26 截图（见上）。
- 复选框只拿到 11/12 的（13–15 系统设置把复选框换成了开关）；13–15 的复选框尺寸靠
  **同一套 legacy 外观** + AppKit 渲染推断，不是直接截图。
