/* ============================================================
   button.tsx — 按钮

   DOM 契约和静态站一致：<button type="button" class="btn [btn--primary]">。
   没有状态机，悬停 / 按下 / 焦点 / 禁用全部由 CSS 的 :hover / :active /
   :focus-visible / :disabled 负责，这里只做属性透传。
   ============================================================ */
import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "default" | "primary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", type, className, ...rest },
  ref
) {
  const classes = variant === "primary" ? "btn btn--primary" : "btn";
  return (
    <button
      {...rest}
      ref={ref}
      type={type ?? "button"}
      className={className ? classes + " " + className : classes}
    />
  );
});
