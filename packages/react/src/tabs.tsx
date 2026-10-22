/* ============================================================
   tabs.tsx — 标签页

   DOM 契约和静态站一致：
     <div class="tabs">
       <div class="tabs__list" role="tablist" aria-label="Sections">
         <button type="button" class="tabs__tab" role="tab"
                 aria-selected="true" data-value="general">General</button>
         …
       </div>
       <div class="tabs__panel">…</div>
       <div class="tabs__panel" hidden>…</div>
     </div>

   点击 / 方向键（各主题的 --tabs-arrow-mode）/ Home / End / 空格确认
   全部由 core 的 createTabs 处理；组件只在首次渲染时写初始
   aria-selected 和 panel 的 hidden，不把选中态接成 state。
   受控 value 的变化走 ctrl.select(index, { silent: true })。

   不渲染 data-tabs 自动初始化标记（会和显式 createTabs 双绑）。
   ============================================================ */
import { Children, forwardRef, useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { createTabs } from "@dialect-ui/core";
import type { TabsController } from "@dialect-ui/core";
import { cx, useMergedRef } from "./internal.js";

export interface TabItem {
  /** 受控 / 回调用的值；不传时 core 回退到标签文字。 */
  value?: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface TabsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  items: TabItem[];
  /** 受控值；不传时用 defaultValue，再缺省第一个可用标签。 */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, index: number) => void;
  /** 按顺序对应 items 的面板内容。 */
  children?: ReactNode;
  "aria-label"?: string;
}

/** 首次渲染选中项：value > defaultValue > 第一个可用标签。 */
function resolveInitialIndex(
  items: TabItem[],
  value: string | undefined,
  defaultValue: string | undefined
): number {
  const target = value !== undefined ? value : defaultValue;
  let index = target !== undefined ? items.findIndex((item) => item.value === target) : 0;
  if (index < 0) index = 0;
  if (items[index]?.disabled) {
    const enabled = items.findIndex((item) => !item.disabled);
    if (enabled >= 0) index = enabled;
  }
  return items.length > 0 ? index : -1;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    items,
    value,
    defaultValue,
    onValueChange,
    children,
    className,
    "aria-label": ariaLabel,
    ...rest
  },
  ref
) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ctrlRef = useRef<TabsController | null>(null);
  const setRootRef = useMergedRef<HTMLDivElement>(ref, rootRef);

  const latestRef = useRef({ items, onValueChange });
  useEffect(() => {
    latestRef.current = { items, onValueChange };
  });

  const initialIndexRef = useRef<number | null>(null);
  if (initialIndexRef.current === null) {
    initialIndexRef.current = resolveInitialIndex(items, value, defaultValue);
  }
  const initialIndex = initialIndexRef.current;

  // 面板按 children 顺序渲染；和静态站一样，非选中项的 panel 初始 hidden。
  const panels = Children.toArray(children);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctrl = createTabs(root, {
      onChange(currentValue, index) {
        const { onValueChange: emit } = latestRef.current;
        emit?.(currentValue, index);
      },
    });
    if (!ctrl) return;
    ctrlRef.current = ctrl;
    return () => {
      ctrl.destroy();
      if (ctrlRef.current === ctrl) ctrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl || value === undefined) return;
    const index = items.findIndex((item) => item.value === value);
    if (index < 0 || index === ctrl.selectedIndex()) return;
    ctrl.select(index, { silent: true });
  }, [value, items]);

  return (
    <div {...rest} ref={setRootRef} className={cx("tabs", className)}>
      <div className="tabs__list" role="tablist" aria-label={ariaLabel}>
        {items.map((item, index) => (
          <button
            key={item.value ?? "tab-" + index}
            type="button"
            className="tabs__tab"
            role="tab"
            aria-selected={index === initialIndex ? "true" : "false"}
            data-value={item.value}
            disabled={item.disabled}
          >
            {item.label}
          </button>
        ))}
      </div>
      {panels.map((panel, index) => (
        <div key={index} className="tabs__panel" hidden={index !== initialIndex}>
          {panel}
        </div>
      ))}
    </div>
  );
});
