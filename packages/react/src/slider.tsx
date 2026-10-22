/* ============================================================
   slider.tsx — 滑块

   DOM 契约和静态站一致：
     <input class="slider" type="range">
     showValue 时：
     <div class="slider-row">
       <input class="slider" type="range">
       <span class="slider__value">40</span>
     </div>

   方向键由浏览器原生处理；Home / End / PageUp / PageDown 的补全
   交给 core 的 createSlider（挂载时建、卸载时 destroy）。

   受控 / 非受控：传 value 时显示值与 DOM 值都跟 prop 走，
   只传 defaultValue 时组件内部记一份用于 .slider__value 文本，
   DOM 值仍然是原生非受控（core 的 Home/End 直接改 DOM 再派发 input，
   组件挂原生 input 监听拿值，见下面 NOOP 的注释）。
   ============================================================ */
import { forwardRef, useEffect, useRef, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes } from "react";
import { createSlider } from "@dialect-ui/core";
import { cx, useMergedRef } from "./internal.js";

export interface SliderProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "children" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step"
  > {
  /** 受控值。 */
  value?: number;
  /** 非受控初始值。 */
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  /** 右侧显示当前值（div.slider-row + span.slider__value）。 */
  showValue?: boolean;
  /** 值变化回调；第二个参数是原生 change 事件（React 的 input 事件）。 */
  onChange?: (value: number, event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * React 的 value tracker 会记录程序化写进 input.value 的值：core 的
 * Home/End 补全用 `el.value = …` 再派发 input 事件，React 的 onChange
 * 会认为「值没变」而不触发。所以 Slider 自己挂原生 input 监听拿值，
 * React 的 onChange 只留一个空实现（避免受控 warning）。
 */
const NOOP = (): void => {};

/** 原生 range 的缺省值：量程中点。 */
function defaultRangeValue(min?: number, max?: number): number {
  const lo = min ?? 0;
  const hi = max ?? 100;
  return hi > lo ? lo + (hi - lo) / 2 : lo;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    value,
    defaultValue,
    min,
    max,
    step,
    showValue = false,
    onChange,
    className,
    ...rest
  },
  ref
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setInputRef = useMergedRef<HTMLInputElement>(ref, inputRef);

  // 非受控时 .slider__value 的显示值；受控时直接用 value，不读这份。
  const [internalValue, setInternalValue] = useState<number>(() =>
    defaultValue !== undefined ? defaultValue : defaultRangeValue(min, max)
  );

  const controlled = value !== undefined;
  const displayed = controlled ? value : internalValue;

  // 原生监听里读最新值，避免 effect 闭包读到旧的受控状态 / 回调。
  const controlledRef = useRef(controlled);
  controlledRef.current = controlled;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 控制器只建一次；core 的 destroy 幂等，StrictMode 的 cleanup → mount 安全。
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const ctrl = createSlider(input);

    // 原生 input 事件：用户拖动和 core 的 Home/End 都会经过这里。
    function onNativeInput(event: Event): void {
      const current = input!.valueAsNumber;
      if (!controlledRef.current) setInternalValue(current);
      onChangeRef.current?.(current, event as unknown as ChangeEvent<HTMLInputElement>);
    }

    input.addEventListener("input", onNativeInput);
    return () => {
      input.removeEventListener("input", onNativeInput);
      ctrl.destroy();
    };
  }, []);

  const input = (
    <input
      {...rest}
      ref={setInputRef}
      type="range"
      className={showValue ? "slider" : cx("slider", className)}
      min={min}
      max={max}
      step={step}
      value={controlled ? value : undefined}
      defaultValue={controlled ? undefined : (defaultValue ?? defaultRangeValue(min, max))}
      onChange={NOOP}
    />
  );

  if (!showValue) return input;

  return (
    <div className={cx("slider-row", className)}>
      {input}
      <span className="slider__value">{String(displayed)}</span>
    </div>
  );
});
