/* ============================================================
   checkbox.tsx — 复选框（纯 CSS 控件，无控制器）

   DOM 契约和静态站一致：
     <label class="check">
       <input type="checkbox" class="check__input">
       <span class="check__box">
         <svg class="check__mark" viewBox="0 0 20 20" aria-hidden="true">
           <path d="M5.2 10.3 L8 14 L13.5 5.7" />
         </svg>
       </span>
       <span class="check__label">Label</span>
     </label>

   选中 / 悬停 / 按下 / 焦点 / 禁用都是 CSS 的 :checked / :hover /
   :focus-visible / :disabled 行为，React 只透传 input 属性：
   checked / defaultChecked 都可用（受控 / 非受控走原生 input）。
   ============================================================ */
import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./internal.js";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  /** 标签文字；不传时不渲染 .check__label（和只用 checkbox 的场景一致）。 */
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, ...rest },
  ref
) {
  return (
    <label className={cx("check", className)}>
      <input {...rest} ref={ref} type="checkbox" className="check__input" />
      <span className="check__box">
        <svg className="check__mark" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5.2 10.3 L8 14 L13.5 5.7" />
        </svg>
      </span>
      {label !== undefined && label !== null ? (
        <span className="check__label">{label}</span>
      ) : null}
    </label>
  );
});
