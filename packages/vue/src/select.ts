/* ============================================================
   select.ts — <Select>：静态站 .select 结构的薄适配层

   结构和 index.html 完全一致（不含 data-select 自动初始化标记）：
     <div class="select">
       <button type="button" class="select__button">
         <span class="select__value">…</span>
         <span class="select__chevron">
           <span class="select__chevron-up"></span>
           <span class="select__chevron-down"></span>
         </span>
       </button>
       <ul class="menu" popover="manual">
         <li class="menu__item" aria-selected="true|false">…</li>
       </ul>
     </div>

   状态归属（见 docs/framework-packages.md「状态归属与渲染约定」）：
   - 组件只渲染结构 + 初始 ARIA（aria-expanded="false"、aria-selected 初值）；
   - 之后的展开、高亮、aria-expanded / aria-selected、按钮文字、焦点全部由
     core 的 createSelect 控制器写，组件不把 open/selected 做成响应式状态；
   - v-model 的外部变化走 watch → ctrl.select(index, { silent: true })。

   为什么重复渲染不会覆盖控制器：渲染函数只从 props 推导「初始选中项」，
   同一份 props 下每次产出的 vnode 属性完全相同；Vue 的 patch 只更新新旧
   vnode 之间有差异的属性，所以控制器改过的 DOM 不会被同值重写。
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
import { createSelect as createSelectController } from "@dialect-ui/core";
import type { SelectController } from "@dialect-ui/core";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export const Select = defineComponent({
  name: "DialectSelect",
  props: {
    options: { type: Array as PropType<SelectOption[]>, required: true },
    /** v-model 值；受控时由父组件持有 */
    modelValue: { type: String, default: undefined },
    /** 非受控时的初始值；缺省选中第一项 */
    defaultValue: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
    id: { type: String, default: undefined },
    /** 额外的根节点 class（Vue 也支持直接传 class，两者会合并） */
    className: { type: String, default: undefined },
    /** 无障碍名称；落在真正可聚焦的 .select__button 上 */
    ariaLabel: { type: String, default: undefined },
  },
  emits: ["update:modelValue", "change", "update:open"],
  setup(props, { emit }) {
    const rootEl = ref<HTMLElement | null>(null);
    let ctrl: SelectController | null = null;

    // 渲染期选中的下标。只在 props 指明的值能命中选项时更新；
    // 非受控选择后 props 不变，所以后续渲染产出的 vnode 不变，不会覆盖控制器。
    let renderedIndex = -1;

    function indexOfValue(value: string | undefined): number {
      if (value === undefined) return -1;
      return props.options.findIndex((option) => option.value === value);
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
      return props.options[renderedIndex] ? renderedIndex : -1;
    }

    function createController(): void {
      // core 对同一元素会复用已有控制器，mount → deactivate → activate 反复进出安全
      if (ctrl || !rootEl.value) return;
      ctrl = createSelectController(rootEl.value, {
        // props 是响应式对象：回调里现读，控制器闭包不会停留在挂载时的 options
        onChange: (value, index) => {
          const option = props.options[index];
          const nextValue = option ? option.value : value;
          emit("update:modelValue", nextValue);
          emit("change", nextValue, option);
        },
        onOpenChange: (open) => emit("update:open", open),
      });
    }

    function destroyController(): void {
      if (!ctrl) return;
      ctrl.destroy();
      ctrl = null;
    }

    onMounted(createController);
    // keep-alive 走 activated / deactivated，不走 mounted / unmounted
    onActivated(createController);
    onDeactivated(destroyController);
    onBeforeUnmount(destroyController);

    // 受控值从外部变化：让控制器同步 DOM（silent 不触发 change/关闭）
    watch(
      () => props.modelValue,
      (value) => {
        const index = indexOfValue(value);
        if (ctrl && index >= 0) ctrl.select(index, { silent: true });
      }
    );

    return () => {
      const selected = renderIndex();
      const selectedLabel = selected >= 0 ? props.options[selected].label : "";
      return h(
        "div",
        {
          ref: rootEl,
          class: ["select", props.className],
          id: props.id,
        },
        [
          h(
            "button",
            {
              type: "button",
              class: "select__button",
              disabled: props.disabled,
              // 初始 ARIA：之后的展开状态由控制器改写
              "aria-expanded": "false",
              "aria-label": props.ariaLabel,
            },
            [
              h("span", { class: "select__value" }, selectedLabel),
              h("span", { class: "select__chevron" }, [
                h("span", { class: "select__chevron-up" }),
                h("span", { class: "select__chevron-down" }),
              ]),
            ]
          ),
          h(
            "ul",
            { class: "menu", popover: "manual" },
            props.options.map((option, index) =>
              h(
                "li",
                {
                  class: "menu__item",
                  // 初始选中；运行时由控制器维护
                  "aria-selected": index === selected ? "true" : "false",
                  "aria-disabled": option.disabled ? "true" : undefined,
                },
                option.label
              )
            )
          ),
        ]
      );
    };
  },
});
