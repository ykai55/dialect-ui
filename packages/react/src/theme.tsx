/* ============================================================
   theme.tsx — 主题容器

   只渲染 data-theme / data-mode 两个属性，不强制背景、不加额外 class。
   需要面板底色时调用方自己加 className（例如 "panel"），和静态站
   `<div data-theme="macos" data-mode="light">` 的用法一致。
   ============================================================ */
import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

/** 主题名就是 packages/core/css/themes/<name>.css 的文件名。 */
export type ThemeName = "win11" | "win10" | "winxp" | "macos" | "macos15" | "gnome";

export type ThemeMode = "light" | "dark";

export interface ThemeProps extends HTMLAttributes<HTMLDivElement> {
  theme: ThemeName;
  /** 不传时不渲染 data-mode，交给令牌默认值（即浅色）。 */
  mode?: ThemeMode;
  children?: ReactNode;
}

export const Theme = forwardRef<HTMLDivElement, ThemeProps>(function Theme(
  { theme, mode, className, children, ...rest },
  ref
) {
  return (
    <div {...rest} ref={ref} className={className} data-theme={theme} data-mode={mode}>
      {children}
    </div>
  );
});
