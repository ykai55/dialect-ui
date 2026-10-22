/* ============================================================
   text-field.tsx — 单行 / 多行输入框

   DOM 契约和静态站一致：
     <label class="field">
       <span class="field__label">…</span>
       <span class="field__wrap">
         <input class="field__input">           单行
         <textarea class="field__input field__input--multiline">  多行
       </span>
     </label>

   没有行为控制器；原生 input / textarea 就是行为本身。
   ============================================================ */
import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  TextareaHTMLAttributes,
} from "react";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children"> {
  /** 标签文字；不传时不渲染 .field__label。 */
  label?: ReactNode;
  /** 多行时渲染 textarea.field__input--multiline。 */
  multiline?: boolean;
  /** 多行 textarea 的行数，单行忽略。 */
  rows?: number;
}

export const TextField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  TextFieldProps
>(function TextField({ label, multiline = false, rows, className, ...rest }, ref) {
  return (
    <label className={className ? "field " + className : "field"}>
      {label !== undefined && label !== null ? (
        <span className="field__label">{label}</span>
      ) : null}
      <span className="field__wrap">
        {multiline ? (
          <textarea
            {...(rest as unknown as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            ref={ref as Ref<HTMLTextAreaElement>}
            rows={rows}
            className="field__input field__input--multiline"
          />
        ) : (
          <input
            {...rest}
            ref={ref as Ref<HTMLInputElement>}
            className="field__input"
          />
        )}
      </span>
    </label>
  );
});
