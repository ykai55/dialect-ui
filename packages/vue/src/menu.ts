/* ============================================================
   menu.ts — <Menu> + <ContextMenu>

   和静态站同一套结构（不含 data-menu* 自动初始化标记）：

     Menu:
       <div class="menu-box">
         触发器（trigger slot）
         <ul class="menu" popover="manual" role="menu" aria-label="…">…</ul>
       </div>

     ContextMenu:
       <div class="menu-box">
         <div class="menu-box__content">children（右键区域）</div>
         <ul class="menu" popover="manual" role="menu">…</ul>
       </div>

   打开 / 定位 / 高亮 / aria-expanded / 键盘 / 焦点归还全部由 core 的
   createMenuBox 负责；组件只渲染结构，并在 item 上写 data-entry-index
   把 core 传回的下标映射成 items 里的 entry，再 emit("select", entry, index)。
   ============================================================ */
import {
  cloneVNode,
  defineComponent,
  h,
  isVNode,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
  warn,
} from "vue";
import type { PropType, VNode } from "vue";
import { createMenuBox as createMenuBoxController } from "@dialect-ui/core";
import type { MenuController } from "@dialect-ui/core";

export interface MenuAction {
  label: string;
  /** 选中值；写进 data-value，回调里仍然以 entry 为准 */
  value?: string;
  /** 右侧快捷键提示（不参与 typeahead） */
  shortcut?: string;
  disabled?: boolean;
}

export interface MenuSeparator {
  separator: true;
}

export type MenuEntry = MenuAction | MenuSeparator;

function isSeparator(entry: MenuEntry): entry is MenuSeparator {
  return "separator" in entry && entry.separator === true;
}

/** 把 items 渲染成 ul.menu；separator 没有 data-entry-index */
function renderMenuItems(items: MenuEntry[]): VNode[] {
  return items.map((entry, index) => {
    if (isSeparator(entry)) {
      return h("li", { class: "menu__separator", role: "separator" });
    }
    return h(
      "li",
      {
        class: "menu__item",
        // core 的 onChoose(item, index) 里 index 是 .menu__item 的下标，
        // 分隔符不参与，所以用它映射回 items 的真实位置
        "data-entry-index": String(index),
        "data-value": entry.value,
        "aria-disabled": entry.disabled ? "true" : undefined,
      },
      [
        entry.label,
        entry.shortcut ? h("span", { class: "menu__shortcut" }, entry.shortcut) : null,
      ]
    );
  });
}

/** 取出 slot 里的唯一元素；多节点 / 纯文本返回 null 并给开发期警告 */
function singleChild(children: unknown[], who: string): VNode | null {
  const meaningful = children.filter((child) => child != null && child !== "");
  if (meaningful.length !== 1 || !isVNode(meaningful[0])) {
    warn(`${who} 需要一个元素子节点，收到 ${meaningful.length} 个`);
    return null;
  }
  return meaningful[0];
}

export const Menu = defineComponent({
  name: "DialectMenu",
  props: {
    items: { type: Array as PropType<MenuEntry[]>, required: true },
    /** 菜单的 ARIA 角色，默认 menu（下拉框那种用 listbox，本组件用不上） */
    role: { type: String as PropType<"menu" | "listbox">, default: "menu" },
    /** 菜单的无障碍名称，落在 ul.menu 上 */
    ariaLabel: { type: String, default: undefined },
    /** 额外的根节点 class */
    className: { type: String, default: undefined },
  },
  emits: ["select"],
  setup(props, { emit, slots }) {
    const boxEl = ref<HTMLElement | null>(null);
    const menuEl = ref<HTMLElement | null>(null);
    let ctrl: MenuController | null = null;
    // 最近一次渲染的触发器 vnode：挂载后既可以从盒子的真实 DOM 取元素，
    // 也可以退回 vnode.el（组件 vnode 的 el 是它的根 DOM 节点）
    let triggerVNode: VNode | null = null;

    function triggerElement(): Element | null {
      // 优先用真实 DOM：vnode.el 在部分挂载时序下还没落好，盒子里第一个
      // 元素节点就是触发器（第二个是 ul.menu）
      const first = boxEl.value?.firstElementChild;
      if (first && first !== menuEl.value) return first;
      const el = triggerVNode?.el;
      return el instanceof Element ? el : null;
    }

    function onChoose(item: Element, index: number): void {
      const raw = item.getAttribute("data-entry-index");
      const entryIndex = raw === null ? index : Number(raw);
      const entry = props.items[entryIndex];
      if (!entry || isSeparator(entry)) return;
      emit("select", entry, entryIndex);
    }

    function createController(): void {
      if (ctrl || !boxEl.value || !menuEl.value) return;
      const trigger = triggerElement();
      ctrl = createMenuBoxController(boxEl.value, {
        menu: menuEl.value,
        triggers: trigger ? [trigger] : [],
        role: props.role,
        onChoose,
      });
    }

    function destroyController(): void {
      if (!ctrl) return;
      ctrl.destroy();
      ctrl = null;
    }

    onMounted(createController);
    onActivated(createController);
    onDeactivated(destroyController);
    onBeforeUnmount(destroyController);

    // 选项动态变化时让 core 重新收集 .menu__item（不保证展开中改选项，
    // 但这个场景在框架里比静态站常见，顺手补上）
    watch(
      () => props.items,
      () => {
        nextTick(() => ctrl?.refresh());
      }
    );

    return () => {
      const trigger = singleChild(slots.trigger ? slots.trigger() : [], "DialectMenu trigger");
      triggerVNode = trigger ? cloneVNode(trigger) : null;
      return h("div", { ref: boxEl, class: ["menu-box", props.className] }, [
        trigger,
        h(
          "ul",
          {
            ref: menuEl,
            class: "menu",
            popover: "manual",
            role: props.role,
            "aria-label": props.ariaLabel,
          },
          renderMenuItems(props.items)
        ),
      ]);
    };
  },
});

export const ContextMenu = defineComponent({
  name: "DialectContextMenu",
  // 根是 div.menu-box，不是右键区域：class/style 留根，其余 attrs（tabindex 等）
  // 给真正接收右键的 .menu-box__content
  inheritAttrs: false,
  props: {
    items: { type: Array as PropType<MenuEntry[]>, required: true },
    role: { type: String as PropType<"menu" | "listbox">, default: "menu" },
    ariaLabel: { type: String, default: undefined },
    className: { type: String, default: undefined },
  },
  emits: ["select"],
  setup(props, { attrs, emit, slots }) {
    const boxEl = ref<HTMLElement | null>(null);
    const contentEl = ref<HTMLElement | null>(null);
    const menuEl = ref<HTMLElement | null>(null);
    let ctrl: MenuController | null = null;

    function onChoose(item: Element, index: number): void {
      const raw = item.getAttribute("data-entry-index");
      const entryIndex = raw === null ? index : Number(raw);
      const entry = props.items[entryIndex];
      if (!entry || isSeparator(entry)) return;
      emit("select", entry, entryIndex);
    }

    function createController(): void {
      if (ctrl || !boxEl.value || !menuEl.value || !contentEl.value) return;
      ctrl = createMenuBoxController(boxEl.value, {
        menu: menuEl.value,
        contextTargets: [contentEl.value],
        role: props.role,
        onChoose,
      });
    }

    function destroyController(): void {
      if (!ctrl) return;
      ctrl.destroy();
      ctrl = null;
    }

    onMounted(createController);
    onActivated(createController);
    onDeactivated(destroyController);
    onBeforeUnmount(destroyController);

    watch(
      () => props.items,
      () => {
        nextTick(() => ctrl?.refresh());
      }
    );

    return () => {
      const { class: attrClass, style: attrStyle, ...contentAttrs } = attrs;
      return h(
        "div",
        { ref: boxEl, class: ["menu-box", props.className, attrClass], style: attrStyle },
        [
          h(
            "div",
            { ref: contentEl, class: "menu-box__content", ...contentAttrs },
            slots.default ? slots.default() : []
          ),
          h(
            "ul",
            {
              ref: menuEl,
              class: "menu",
              popover: "manual",
              role: props.role,
              "aria-label": props.ariaLabel,
            },
            renderMenuItems(props.items)
          ),
        ]
      );
    };
  },
});
