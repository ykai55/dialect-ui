/* ============================================================
   progress.tsx — 进度条（纯 CSS 控件，无控制器）

   DOM 契约和静态站一致：
     <div class="progress" role="progressbar" aria-valuemin="0"
          aria-valuemax="100" aria-valuenow="40"
          style="--progress-value: 40%">
       <div class="progress__fill"></div>
     </div>

   不确定态不写 aria-valuenow / --progress-value，只留 data-indeterminate，
   让 CSS 的 [data-indeterminate] 规则跑循环动画。

   进度条没有运行时状态机，value 变化由 React 正常重渲染即可；
   这不算「把控制器状态接成 state」——进度值本来就是 prop。
   ============================================================ */
import { forwardRef } from "react";
import type { CSSProperties, HTMLAttributes } from "react";
import { cx } from "./internal.js";

export interface ProgressProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role"> {
  /** 当前值；不传按 0 处理（确定态）。 */
  value?: number;
  /** 最大值，缺省 100。 */
  max?: number;
  /** 不确定态：不写 aria-valuenow 与 --progress-value。 */
  indeterminate?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { value = 0, max = 100, indeterminate = false, className, style, ...rest },
  ref
) {
  // 防御 max <= 0：除零会得到 Infinity，CSS 变量写进去就是非法值。
  const maxValue = max > 0 ? max : 100;
  const current = clamp(value, 0, maxValue);
  const pct = (current / maxValue) * 100;

  const rootStyle: CSSProperties = indeterminate
    ? { ...style }
    : ({ ...style, "--progress-value": pct + "%" } as CSSProperties);

  return (
    <div
      {...rest}
      ref={ref}
      className={cx("progress", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={maxValue}
      aria-valuenow={indeterminate ? undefined : current}
      data-indeterminate={indeterminate ? "" : undefined}
      style={rootStyle}
    >
      <div className="progress__fill"></div>
    </div>
  );
});
