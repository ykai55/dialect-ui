/* ============================================================
   switch.tsx — 开关（纯 CSS 控件，无控制器）

   DOM 契约和静态站一致：
     <label class="switch">
       <input type="checkbox" class="switch__input">
       <span class="switch__track"><span class="switch__knob"></span></span>
       <span class="switch__label">Label</span>
     </label>

   语义是 checkbox，选中态由原生 :checked 驱动；
   checked / defaultChecked / disabled / onChange 原样透传。
   ============================================================ */
import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./internal.js";

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  /** 标签文字；不传时不渲染 .switch__label。 */
  label?: ReactNode;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, className, ...rest },
  ref
) {
  return (
    <label className={cx("switch", className)}>
      <input {...rest} ref={ref} type="checkbox" className="switch__input" />
      <span className="switch__track">
        <span className="switch__knob"></span>
      </span>
      {label !== undefined && label !== null ? (
        <span className="switch__label">{label}</span>
      ) : null}
    </label>
  );
});
