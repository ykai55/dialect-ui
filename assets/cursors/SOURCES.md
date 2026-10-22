# 走廊鼠标指针

走廊里六个时代各用一套箭头 + 文本光标。**这些不是 Microsoft / Apple 的原版光标文件**，
而是开源复刻或上游开源项目里的资源，转换成 32px PNG 供 CSS `cursor` 使用。

| 目录 | 用于 | 箭头 / 文本 | 来源 | 许可 |
| --- | --- | --- | --- | --- |
| `win11/` | Windows 10 / 11 | 白色箭头、黑色 I-beam | [s1rd0/Win11-Cursor](https://github.com/s1rd0/Win11-Cursor)（README 注明光标设计来自 jepriCreations） | MIT |
| `winxp/` | Windows XP | 经典白色箭头、黑色 I-beam | [na0miluv/modernXP-cursor-theme](https://github.com/na0miluv/modernXP-cursor-theme) | GPL-3.0 |
| `macos/` | macOS 15 / 26 | 黑色箭头（白描边）、黑色 I-beam | [ful1e5/apple_cursor](https://github.com/ful1e5/apple_cursor) | GPL-3.0 |
| `gnome/` | GNOME 48 | 黑色箭头（白描边）、黑色 I-beam | [GNOME gnome-shell](https://gitlab.gnome.org/GNOME/gnome-shell) `data/cursor-theme/icons/Adwaita/cursors_scalable/` | GPL-2.0-or-later |

## 转换方式

- `win11/`：直接从上游的 `arrow.cur` / `ibeam.cur` 取 32×32 帧，保留透明通道，四周补透明边。
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
| Windows 箭头 | 8, 5 |
| Windows XP 箭头 | 7, 2 |
| macOS 箭头 | 8, 3 |
| GNOME 箭头 | 8, 2 |
| 文本光标（四套） | 16, 16 |

## 许可

- `LICENSE-MIT.txt`：Windows 11 复刻版。
- `LICENSE-GPL-3.0.txt`：Windows XP 复刻版与 Apple Cursor。
- `LICENSE-GPL-2.0.txt`：GNOME shell 的 Adwaita 光标。
- `sources/` 保留上游 SVG / CUR 原始文件，方便核对与再生成；这些文件的版权归各自作者。
