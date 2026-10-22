/* ============================================================
   segmented.tsx — 分段控件

   DOM 契约和静态站一致：
     <div class="segmented" role="radiogroup" aria-label="Interval">
       <button type="button" class="segmented__item" role="radio"
               aria-checked="true" data-value="day">Day</button>
       …
     </div>

   点击 / 方向键 / Home / End / 空格确认全部由 core 的 createSegmented 处理，
   组件只在首次渲染时写初始 aria-checked，不把选中态接成 state。
   受控 value 的变化走 ctrl.select(index, { silent: true })。

   不渲染 data-segmented 自动初始化标记（会和显式 createSegmented 双绑）。
   ============================================================ */
import { forwardRef, useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { createSegmented } from "@dialect-ui/core";
import type { SegmentedController } from "@dialect-ui/core";
import { cx, useMergedRef } from "./internal.js";

export interface SegmentedOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  options: SegmentedOption[];
  /** 受控值；不传时用 defaultValue，再缺省第一个可用段。 */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, option: SegmentedOption | undefined) => void;
  /** 整组禁用。 */
  disabled?: boolean;
  "aria-label"?: string;
}

/** 首次渲染选中项：value > defaultValue > 第一个可用段。 */
function resolveInitialIndex(
  options: SegmentedOption[],
  value: string | undefined,
  defaultValue: string | undefined
): number {
  const target = value !== undefined ? value : defaultValue;
  let index = target !== undefined ? options.findIndex((o) => o.value === target) : 0;
  if (index < 0) index = 0;
  if (options[index]?.disabled) {
    const enabled = options.findIndex((o) => !o.disabled);
    if (enabled >= 0) index = enabled;
  }
  return options.length > 0 ? index : -1;
}

export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  function SegmentedControl(
    {
      options,
      value,
      defaultValue,
      onValueChange,
      disabled = false,
      className,
      "aria-label": ariaLabel,
      ...rest
    },
    ref
  ) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const ctrlRef = useRef<SegmentedController | null>(null);
    const setRootRef = useMergedRef<HTMLDivElement>(ref, rootRef);

    // 控制器回调读最新 props，避免闭包读到旧 options / 旧回调。
    const latestRef = useRef({ options, onValueChange });
    useEffect(() => {
      latestRef.current = { options, onValueChange };
    });

    // 初始 aria-checked 只在首次渲染时算一次；之后由控制器写。
    const initialIndexRef = useRef<number | null>(null);
    if (initialIndexRef.current === null) {
      initialIndexRef.current = resolveInitialIndex(options, value, defaultValue);
    }
    const initialIndex = initialIndexRef.current;

    useEffect(() => {
      const root = rootRef.current;
      if (!root) return;
      const ctrl = createSegmented(root, {
        onChange(currentValue, index) {
          const { options: latestOptions, onValueChange: emit } = latestRef.current;
          emit?.(currentValue, latestOptions[index]);
        },
      });
      if (!ctrl) return;
      ctrlRef.current = ctrl;
      return () => {
        ctrl.destroy();
        if (ctrlRef.current === ctrl) ctrlRef.current = null;
      };
    }, []);

    // 受控 value 外部更新：走控制器 API，silent 保证不再回调 onValueChange。
    useEffect(() => {
      const ctrl = ctrlRef.current;
      if (!ctrl || value === undefined) return;
      const index = options.findIndex((option) => option.value === value);
      if (index < 0 || index === ctrl.selectedIndex()) return;
      ctrl.select(index, { silent: true });
    }, [value, options]);

    return (
      <div
        {...rest}
        ref={setRootRef}
        className={cx("segmented", className)}
        role="radiogroup"
        aria-label={ariaLabel}
      >
        {options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            className="segmented__item"
            role="radio"
            aria-checked={index === initialIndex ? "true" : "false"}
            data-value={option.value}
            disabled={disabled || option.disabled}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }
);
