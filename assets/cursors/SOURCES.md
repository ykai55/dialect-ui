# 走廊鼠标指针

走廊里六个时代各用一套箭头 + 文本光标。**这些不是 Microsoft / Apple 的原版光标文件**，
而是开源复刻或上游开源项目里的资源，转换成 32px PNG 供 CSS `cursor` 使用。

| 目录 | 用于 | 箭头 / 文本 | 来源 | 许可 |
| --- | --- | --- | --- | --- |
| `win11/` | Windows 10 / 11 | 白色箭头（按官方轮廓重画）、黑色 I-beam | 箭头参考 [Windows 11 `aero_arrow.cur`](https://github.com/bartekl1/windows-ui-assets/tree/master/Cursors/Windows%2011)（只作轮廓参考，不直接分发）；I-beam 来自 [s1rd0/Win11-Cursor](https://github.com/s1rd0/Win11-Cursor) | I-beam：MIT |
| `winxp/` | Windows XP | 经典白色箭头、黑色 I-beam | [na0miluv/modernXP-cursor-theme](https://github.com/na0miluv/modernXP-cursor-theme) | GPL-3.0 |
| `macos/` | macOS 15 / 26 | 黑色箭头（白描边）、黑色 I-beam | [ful1e5/apple_cursor](https://github.com/ful1e5/apple_cursor) | GPL-3.0 |
| `gnome/` | GNOME 48 | 黑色箭头（白描边）、黑色 I-beam | [GNOME gnome-shell](https://gitlab.gnome.org/GNOME/gnome-shell) `data/cursor-theme/icons/Adwaita/cursors_scalable/` | GPL-2.0-or-later |

## 转换方式

- `win11/`：概念光标包里的 `arrow.cur` 是三角形，和系统箭头不一致，弃用；箭头按 Windows 11 官方
  `aero_arrow.cur` 的轮廓重画成 SVG（`sources/win-arrow.svg`），再栅格化。I-beam 仍取上游
  `ibeam.cur` 的 32×32 帧。
- `winxp/`、`macos/`：用 ImageMagick 把上游 SVG 栅格化到 64px，再缩放/居中到 32×32。
  XP 的文本光标带 Inkscape 渐变和滤镜，直接栅格化会丢透明度；这里取 I-beam 的主路径重画成
  黑填充白描边，再透明栅格化后缩放。
- `macos/`：上游 SVG 用 `#00FF00` 表示主题填充色、`#0000FF` 表示描边色，构建时替换；
  这里固定替换成黑色填充 + 白色描边。
- `gnome/`：上游 SVG 用 Inkscape 滤镜和构建期套色，直接栅格化会丢主路径；这里用同一段
  路径数据重建了一个不带滤镜的 SVG，再栅格化。

## 热点

| 资源 | 热点（32×32 像素） |
| --- | --- |
| Windows 箭头 | 1, 2 |
| Windows XP 箭头 | 2, 2 |
| macOS 箭头 | 2, 3 |
| GNOME 箭头 | 2, 2 |
| 文本光标（四套） | 16, 16 |

## 许可

- `LICENSE-MIT.txt`：Windows 11 复刻版。
- `LICENSE-GPL-3.0.txt`：Windows XP 复刻版与 Apple Cursor。
- `LICENSE-GPL-2.0.txt`：GNOME shell 的 Adwaita 光标。
- `sources/` 保留上游 SVG / CUR 原始文件，方便核对与再生成；这些文件的版权归各自作者。
