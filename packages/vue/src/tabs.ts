/* ============================================================
   tabs.ts — <Tabs>

   DOM 契约和静态站一致（不含 data-tabs 自动初始化标记）：

     <div class="tabs">
       <div class="tabs__list" role="tablist" aria-label="Sections">
         <button type="button" class="tabs__tab" role="tab"
                 aria-selected="true" data-value="general">General</button>
         …
       </div>
       <div class="tabs__panel">…</div>
       <div class="tabs__panel" hidden>…</div>
     </div>

   默认 slot 按顺序就是面板内容，第 i 个面板配第 i 个标签。组件只渲染
   初始 aria-selected / hidden；之后的切换、aria-controls / id、roving
   tabindex、面板显隐全部由 core 的 createTabs 写。v-model 外部变化走
   watch → ctrl.select(index, { silent: true })。
   ============================================================ */
import {
  defineComponent,
  h,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from "vue";
import type { PropType } from "vue";
import { createTabs as createTabsController } from "@dialect-ui/core";
import type { TabsController } from "@dialect-ui/core";

export interface TabsItem {
  /** 值；缺省时 core 用标签文字当值 */
  value?: string;
  label: string;
  disabled?: boolean;
}

export const Tabs = defineComponent({
  name: "DialectTabs",
  props: {
    items: { type: Array as PropType<TabsItem[]>, required: true },
    /** 受控值（v-model） */
    modelValue: { type: String as PropType<string | undefined>, default: undefined },
    /** 非受控时的初始值；缺省选中第一个可用标签 */
    defaultValue: { type: String, default: undefined },
    /** tablist 的无障碍名称 */
    ariaLabel: { type: String, default: undefined },
    /** 额外的根节点 class */
    className: { type: String, default: undefined },
  },
  emits: ["update:modelValue", "change"],
  setup(props, { emit, slots }) {
    const rootEl = ref<HTMLElement | null>(null);
    let ctrl: TabsController | null = null;

    let renderedIndex = -1;

    function indexOfValue(value: string | undefined): number {
      if (value === undefined) return -1;
      return props.items.findIndex(
        (item) => (item.value !== undefined ? item.value : item.label) === value
      );
    }

    function renderIndex(): number {
      const wanted = indexOfValue(
        props.modelValue !== undefined ? props.modelValue : props.defaultValue
      );
      if (renderedIndex < 0) {
        renderedIndex = wanted >= 0 ? wanted : 0;
      } else if (wanted >= 0) {
        renderedIndex = wanted;
      }
      return props.items[renderedIndex] ? renderedIndex : -1;
    }

    function createController(): void {
      if (ctrl || !rootEl.value) return;
      ctrl = createTabsController(rootEl.value, {
        onChange: (value, index) => {
          emit("update:modelValue", value);
          emit("change", value, index);
        },
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
      () => props.modelValue,
      (value) => {
        const index = indexOfValue(value);
        if (ctrl && index >= 0) ctrl.select(index, { silent: true });
      }
    );

    return () => {
      const selected = renderIndex();
      const panels = slots.default ? slots.default() : [];

      const list = h(
        "div",
        { class: "tabs__list", role: "tablist", "aria-label": props.ariaLabel },
        props.items.map((item, index) =>
          h(
            "button",
            {
              type: "button",
              class: "tabs__tab",
              role: "tab",
              // 初始选中 / 面板显隐；运行时由控制器维护
              "aria-selected": index === selected ? "true" : "false",
              "data-value": item.value,
              disabled: item.disabled,
            },
            item.label
          )
        )
      );

      return h("div", { ref: rootEl, class: ["tabs", props.className] }, [
        list,
        ...props.items.map((_item, index) =>
          h(
            "div",
            { class: "tabs__panel", hidden: index !== selected },
            panels[index] !== undefined ? [panels[index]] : []
          )
        ),
      ]);
    };
  },
});
