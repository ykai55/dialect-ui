/* ============================================================
   select.tsx — 下拉框

   DOM 契约和静态站完全一致：
     <div class="select">
       <button type="button" class="select__button">
         <span class="select__value">…</span>
         <span class="select__chevron">
           <span class="select__chevron-up"></span>
           <span class="select__chevron-down"></span>
         </span>
       </button>
       <ul class="menu" popover="manual">
         <li class="menu__item" aria-selected="…">…</li>
       </ul>
     </div>

   行为全部交给 core 的 createSelect：
     - 组件只在首次渲染时写结构和初始 ARIA（aria-expanded="false"、
       aria-selected 初值、按钮文字初值）；
     - 挂载后打开 / 关闭、高亮、aria-expanded / aria-selected / is-open、
       按钮文字、焦点归还全部由控制器写，组件不把 open / selected 接成
       state，避免 React 的 diff 覆盖控制器的写入；
     - 受控 value 的变化走 ctrl.select(index, { silent: true })，不重新渲染
       按键文字和 aria；
     - 不渲染 data-select / data-menu 自动初始化标记（会和 createSelect 双绑）。
   ============================================================ */
import { forwardRef, useCallback, useEffect, useRef } from "react";
import type { HTMLAttributes } from "react";
import { createSelect } from "@dialect-ui/core";
import type { SelectController } from "@dialect-ui/core";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "onChange" | "onValueChange"
  > {
  options: SelectOption[];
  /** 受控值；不传时用 defaultValue，再缺省选中第一项。 */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, option: SelectOption) => void;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
  /** 无障碍名称，落在按钮上（div 本身没有 role，放 div 上不生效）。 */
  "aria-label"?: string;
}

/** 首次渲染时决定选中项：value > defaultValue > 第一项。 */
function resolveInitialIndex(
  options: SelectOption[],
  value: string | undefined,
  defaultValue: string | undefined
): number {
  const target = value !== undefined ? value : defaultValue;
  if (target !== undefined) {
    const hit = options.findIndex((option) => option.value === target);
    if (hit >= 0) return hit;
  }
  return options.length > 0 ? 0 : -1;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(function Select(
  {
    options,
    value,
    defaultValue,
    onValueChange,
    onOpenChange,
    disabled = false,
    className,
    "aria-label": ariaLabel,
    ...rest
  },
  ref
) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ctrlRef = useRef<SelectController | null>(null);

  // 控制器只创建一次，回调里读 ref 拿最新的 props，避免闭包读到旧值。
  const latestRef = useRef({ options, onValueChange, onOpenChange });
  useEffect(() => {
    latestRef.current = { options, onValueChange, onOpenChange };
  });

  // 初始选中只在首次渲染时算一次：之后的变化由控制器写 DOM，
  // React 不参与重渲染这些属性（否则会覆盖控制器）。
  const initialIndexRef = useRef<number | null>(null);
  if (initialIndexRef.current === null) {
    initialIndexRef.current = resolveInitialIndex(options, value, defaultValue);
  }
  const initialIndex = initialIndexRef.current;
  const initialLabel =
    initialIndex >= 0 && options[initialIndex] ? options[initialIndex].label : "";

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
    },
    [ref]
  );

  // 挂载：建控制器；卸载：destroy。StrictMode 的 mount → cleanup → mount
  // 依赖 core 的 destroy 幂等（它会清掉 _select / _menuCtrl 标记和监听）。
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctrl = createSelect(root, {
      onChange(currentValue, index) {
        const { options: latestOptions, onValueChange: emit } = latestRef.current;
        emit?.(currentValue, latestOptions[index]);
      },
      onOpenChange(open) {
        latestRef.current.onOpenChange?.(open);
      },
    });
    if (!ctrl) return;
    ctrlRef.current = ctrl;
    return () => {
      ctrl.destroy();
      if (ctrlRef.current === ctrl) ctrlRef.current = null;
    };
  }, []);

  // 受控 value 变化：走控制器 API 同步，silent 保证不再回调 onValueChange。
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
      className={className ? "select " + className : "select"}
    >
      <button
        type="button"
        className="select__button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        <span className="select__value">{initialLabel}</span>
        <span className="select__chevron">
          <span className="select__chevron-up"></span>
          <span className="select__chevron-down"></span>
        </span>
      </button>
      <ul className="menu" popover="manual">
        {options.map((option, index) => (
          <li
            key={option.value}
            className="menu__item"
            // 控制器用 data-value 作为选中值（select.js 的 valueOf），
            // 不是自动初始化标记，不会和 createSelect 双绑。
            data-value={option.value}
            aria-selected={index === initialIndex ? "true" : "false"}
            aria-disabled={option.disabled ? "true" : undefined}
          >
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
});
