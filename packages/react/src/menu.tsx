/* ============================================================
   menu.tsx — 菜单 / 右键菜单

   DOM 契约和静态站一致：
     <div class="menu-box">
       <button type="button" class="btn">Actions</button>   ← trigger
       <ul class="menu" popover="manual">
         <li class="menu__item" data-entry-index="0">New window</li>
         <li class="menu__separator" role="separator"></li>
         <li class="menu__item" data-entry-index="2">Rename<span class="menu__shortcut">F2</span></li>
       </ul>
     </div>

   展开 / 定位 / 键盘模型 / 关闭后的焦点全在 core 的 createMenuBox；
   组件只渲染结构、初始 aria-expanded="false"、把菜单项下标写进
   data-entry-index（core 的 onChoose 给的是 .menu__item 序号，不是
   entries 下标，有分隔线时两者不同）。

   不渲染 data-menu / data-menu-trigger / data-menu-context 自动初始化标记。
   ============================================================ */
import { cloneElement, forwardRef, isValidElement, useEffect, useId, useRef } from "react";
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import { createMenuBox } from "@dialect-ui/core";
import type { MenuController } from "@dialect-ui/core";
import { cx, useMergedRef } from "./internal.js";

export interface MenuItemEntry {
  label: ReactNode;
  /** 回调里带出去的值；不传时调用方可以直接读 entry.label。 */
  value?: string;
  /** 右侧快捷键提示文字。 */
  shortcut?: ReactNode;
  disabled?: boolean;
}

export interface MenuSeparatorEntry {
  separator: true;
}

export type MenuEntry = MenuItemEntry | MenuSeparatorEntry;

export type MenuSelectHandler = (entry: MenuEntry, index: number) => void;

/** 渲染菜单项（Menu / ContextMenu 共用）；data-entry-index 指回 entries 下标。 */
function renderEntries(items: MenuEntry[]): ReactNode[] {
  return items.map((entry, index) => {
    if (isSeparator(entry)) {
      return <li key={"sep-" + index} className="menu__separator" role="separator"></li>;
    }
    return (
      <li
        key={"item-" + index}
        className="menu__item"
        aria-disabled={entry.disabled ? "true" : undefined}
        data-entry-index={index}
      >
        {entry.label}
        {entry.shortcut !== undefined && entry.shortcut !== null ? (
          <span className="menu__shortcut">{entry.shortcut}</span>
        ) : null}
      </li>
    );
  });
}

function isSeparator(entry: MenuEntry): entry is MenuSeparatorEntry {
  return (entry as MenuSeparatorEntry).separator === true;
}

/** 从被点中的 li 反查 entries 下标。 */
function entryIndexOf(item: HTMLElement): number {
  return Number(item.getAttribute("data-entry-index"));
}

type TriggerElementProps = {
  ref?: Ref<HTMLElement>;
  "aria-haspopup"?: "menu" | boolean;
  "aria-expanded"?: boolean | "true" | "false";
  "aria-controls"?: string;
};

export interface MenuProps {
  /** 触发器：单个 React 元素（ref 由组件接管，原来传进来的 ref 会一并转发）。 */
  trigger: ReactElement;
  items: MenuEntry[];
  onSelect?: MenuSelectHandler;
  /** 菜单角色，缺省 "menu"。 */
  role?: "menu";
  "aria-label"?: string;
  className?: string;
}

export const Menu = forwardRef<HTMLDivElement, MenuProps>(function Menu(
  { trigger, items, onSelect, role = "menu", className, "aria-label": ariaLabel },
  ref
) {
  if (!isValidElement(trigger)) {
    throw new Error(
      "Menu 的 trigger 需要一个 React 元素（不能是文本或数组），" +
        "组件需要拿它的 DOM 节点锚定菜单、挂 aria-expanded。"
    );
  }

  const boxRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const ctrlRef = useRef<MenuController | null>(null);
  const setBoxRef = useMergedRef<HTMLDivElement>(ref, boxRef);

  const menuId = "dialect-menu-" + useId();

  // 回调读最新 props，避免控制器闭包读到旧的 items / onSelect。
  const latestRef = useRef({ items, onSelect });
  useEffect(() => {
    latestRef.current = { items, onSelect };
  });

  // 触发器既要交给控制器，也要转发调用方的 ref。
  const triggerProps = trigger.props as TriggerElementProps;
  const setTriggerRef = useMergedRef<HTMLElement>(triggerRef, triggerProps.ref);

  useEffect(() => {
    const box = boxRef.current;
    const menu = menuRef.current;
    if (!box || !menu) return;
    // 触发器组件不转发 ref 时退化成「盒子里的第一个元素」，保证菜单还能开。
    const triggerEl = triggerRef.current ?? box.firstElementChild;
    if (!triggerEl) return;

    const ctrl = createMenuBox(box, {
      menu,
      triggers: [triggerEl],
      role,
      onChoose(item) {
        const index = entryIndexOf(item);
        const entry = latestRef.current.items[index];
        if (entry) latestRef.current.onSelect?.(entry, index);
      },
    });
    if (!ctrl) return;
    ctrlRef.current = ctrl;
    return () => {
      ctrl.destroy();
      if (ctrlRef.current === ctrl) ctrlRef.current = null;
    };
    // 控制器只随挂载建一次；items / 回调的变化走 latestRef。
  }, []);

  const triggerNode = cloneElement(trigger as ReactElement<TriggerElementProps>, {
    ref: setTriggerRef,
    "aria-haspopup": "menu",
    "aria-expanded": "false",
    "aria-controls": menuId,
  });

  return (
    <div ref={setBoxRef} className={cx("menu-box", className)}>
      {triggerNode}
      <ul
        ref={menuRef}
        id={menuId}
        className="menu"
        popover="manual"
        role={role}
        aria-label={ariaLabel}
      >
        {renderEntries(items)}
      </ul>
    </div>
  );
});

export interface ContextMenuProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title" | "onSelect"> {
  items: MenuEntry[];
  onSelect?: MenuSelectHandler;
  /** 右键区域内容。 */
  children?: ReactNode;
  "aria-label"?: string;
}

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  function ContextMenu(
    { items, onSelect, children, className, "aria-label": ariaLabel, ...rest },
    ref
  ) {
    const boxRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const menuRef = useRef<HTMLUListElement | null>(null);
    const ctrlRef = useRef<MenuController | null>(null);
    const setBoxRef = useMergedRef<HTMLDivElement>(ref, boxRef);

    const menuId = "dialect-context-menu-" + useId();

    const latestRef = useRef({ items, onSelect });
    useEffect(() => {
      latestRef.current = { items, onSelect };
    });

    useEffect(() => {
      const box = boxRef.current;
      const menu = menuRef.current;
      const content = contentRef.current;
      if (!box || !menu || !content) return;
      const ctrl = createMenuBox(box, {
        menu,
        contextTargets: [content],
        onChoose(item) {
          const index = entryIndexOf(item);
          const entry = latestRef.current.items[index];
          if (entry) latestRef.current.onSelect?.(entry, index);
        },
      });
      if (!ctrl) return;
      ctrlRef.current = ctrl;
      return () => {
        ctrl.destroy();
        if (ctrlRef.current === ctrl) ctrlRef.current = null;
      };
    }, []);

    return (
      <div {...rest} ref={setBoxRef} className={cx("menu-box", className)}>
        <div ref={contentRef} className="menu-box__content">
          {children}
        </div>
        <ul
          ref={menuRef}
          id={menuId}
          className="menu"
          popover="manual"
          role="menu"
          aria-label={ariaLabel}
        >
          {renderEntries(items)}
        </ul>
      </div>
    );
  }
);
