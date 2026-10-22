/* ============================================================
   segmented.ts — <SegmentedControl>

   DOM 契约和静态站一致（不含 data-segmented 自动初始化标记）：

     <div class="segmented" role="radiogroup" aria-label="Interval">
       <button type="button" class="segmented__item" role="radio"
               aria-checked="true" data-value="day">Day</button>
       …
     </div>

   状态归属（见 docs/framework-packages.md「状态归属与渲染约定」）：
   - 组件只渲染结构 + 初始 ARIA（aria-checked 初值）；
   - 之后的选中、roving tabindex、焦点由 core 的 createSegmented 写；
   - v-model 的外部变化走 watch → ctrl.select(index, { silent: true })。
   渲染函数只从 props 推导「初始选中项」，同值重渲染不会覆盖控制器。
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
import { createSegmented as createSegmentedController } from "@dialect-ui/core";
import type { SegmentedController } from "@dialect-ui/core";

export interface SegmentedOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export const SegmentedControl = defineComponent({
  name: "DialectSegmentedControl",
  props: {
    options: { type: Array as PropType<SegmentedOption[]>, required: true },
    /** 受控值（v-model） */
    modelValue: { type: String as PropType<string | undefined>, default: undefined },
    /** 非受控时的初始值；缺省选中第一个可用段 */
    defaultValue: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
    /** 无障碍名称，落在 role=radiogroup 的根节点上 */
    ariaLabel: { type: String, default: undefined },
    /** 额外的根节点 class */
    className: { type: String, default: undefined },
  },
  emits: ["update:modelValue", "change"],
  setup(props, { emit }) {
    const rootEl = ref<HTMLElement | null>(null);
    let ctrl: SegmentedController | null = null;

    // 渲染期选中的下标。只在 props 指明的值能命中选项时更新；非受控选择后
    // props 不变，所以后续渲染产出的 vnode 不变，不会覆盖控制器。
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
      ctrl = createSegmentedController(rootEl.value, {
        // props 是响应式对象：回调里现读，闭包不会停留在挂载时的 options
        onChange: (value, index) => {
          emit("update:modelValue", value);
          emit("change", value, props.options[index]);
        },
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

    // 受控值从外部变化：让控制器同步 DOM（silent 不触发 change）
    watch(
      () => props.modelValue,
      (value) => {
        const index = indexOfValue(value);
        if (ctrl && index >= 0) ctrl.select(index, { silent: true });
      }
    );

    return () => {
      const selected = renderIndex();
      return h(
        "div",
        {
          ref: rootEl,
          class: ["segmented", props.className],
          role: "radiogroup",
          "aria-label": props.ariaLabel,
        },
        props.options.map((option, index) =>
          h(
            "button",
            {
              type: "button",
              class: "segmented__item",
              role: "radio",
              // 初始选中；运行时由控制器维护
              "aria-checked": index === selected ? "true" : "false",
              "data-value": option.value,
              disabled: props.disabled || option.disabled,
            },
            option.label
          )
        )
      );
    };
  },
});
