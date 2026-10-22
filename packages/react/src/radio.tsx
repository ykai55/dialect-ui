/* ============================================================
   radio.tsx — 单选框（纯 CSS 控件，无控制器）

   DOM 契约和静态站一致：
     <label class="radio">
       <input type="radio" class="radio__input" name="…">
       <span class="radio__dot"></span>
       <span class="radio__label">Label</span>
     </label>

   同组互斥是原生 input[type=radio] 的 name 语义，组件不自己维护选中态：
   同组使用同名 name，checked / defaultChecked 都透传。
   ============================================================ */
import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./internal.js";

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  /** 标签文字；不传时不渲染 .radio__label。 */
  label?: ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, className, ...rest },
  ref
) {
  return (
    <label className={cx("radio", className)}>
      <input {...rest} ref={ref} type="radio" className="radio__input" />
      <span className="radio__dot"></span>
      {label !== undefined && label !== null ? (
        <span className="radio__label">{label}</span>
      ) : null}
    </label>
  );
});
