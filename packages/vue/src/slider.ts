/* ============================================================
   slider.ts — <Slider>

   DOM 契约和静态站一致：

     <div class="slider-row" class="…">
       <input type="range" class="slider" min="0" max="100" value="40">
       <span class="slider__value">40</span>
     </div>

   行为交给 core 的 createSlider（补 Home / End / PageUp / PageDown，
   方向键仍由浏览器处理）。本组件只做三件事：
   - 渲染 input 和可选的数值标签；
   - 把原生 input / change 映射成 update:modelValue / change；
   - 挂载时 createSlider，卸载 / 失活时 destroy。

   受控（传 modelValue）时数值标签显示 prop；非受控（只传 defaultValue，
   或不传）时跟随用户输入。v-model 外部变化通过 watch 同步到标签，
   input 的 DOM value 交给 Vue 的 diff（props 变了才写，同值不覆盖）。
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
import { createSlider as createSliderController } from "@dialect-ui/core";
import type { SliderController } from "@dialect-ui/core";

export const Slider = defineComponent({
  name: "DialectSlider",
  // 根可能是 div.slider-row 也可能是 input：class/style 留根，其余 attrs 给 input
  inheritAttrs: false,
  props: {
    /** 受控值（v-model） */
    modelValue: { type: Number as PropType<number | undefined>, default: undefined },
    /** 非受控时的初始值；都不传时用 min */
    defaultValue: { type: Number, default: undefined },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    step: { type: Number, default: 1 },
    /** 显示右侧数值标签（.slider-row + .slider__value） */
    showValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    ariaLabel: { type: String, default: undefined },
    /** 额外的根节点 class */
    className: { type: String, default: undefined },
  },
  emits: ["update:modelValue", "change"],
  setup(props, { attrs, emit, expose }) {
    const inputEl = ref<HTMLInputElement | null>(null);
    let ctrl: SliderController | null = null;

    const initialValue =
      props.modelValue !== undefined
        ? props.modelValue
        : props.defaultValue !== undefined
          ? props.defaultValue
          : props.min;
    // 数值标签显示的当前值：非受控时跟着输入走，受控时跟着 prop 走
    const display = ref(initialValue);
    const controlled = (): boolean => props.modelValue !== undefined;
    const currentValue = (): number => (controlled() ? (props.modelValue as number) : display.value);

    function onInput(event: Event): void {
      const input = event.target as HTMLInputElement;
      const value = Number(input.value);
      // 受控时标签只认 prop；父组件回写后由 watch 同步，非受控立即跟随输入
      if (!controlled()) display.value = value;
      emit("update:modelValue", value);
    }

    function onChange(event: Event): void {
      emit("change", Number((event.target as HTMLInputElement).value), event);
    }

    function createController(): void {
      if (ctrl || !inputEl.value) return;
      ctrl = createSliderController(inputEl.value);
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

    watch(
      () => props.modelValue,
      (value) => {
        if (value !== undefined) display.value = value;
      }
    );

    // ref 转发到真正可交互的 input（React 侧是 forwardRef）
    expose({ input: inputEl, el: inputEl, focus: () => inputEl.value?.focus() });

    return () => {
      const {
        class: attrClass,
        style: attrStyle,
        onInput: userOnInput,
        onChange: userOnChange,
        ...inputAttrs
      } = attrs;
      const passthroughOnInput =
        typeof userOnInput === "function" ? (userOnInput as (event: Event) => void) : undefined;
      const passthroughOnChange =
        typeof userOnChange === "function" ? (userOnChange as (event: Event) => void) : undefined;
      const value = currentValue();
      const input = h("input", {
        ...inputAttrs,
        ref: inputEl,
        class: props.showValue ? "slider" : ["slider", props.className, attrClass],
        style: props.showValue ? undefined : attrStyle,
        type: "range",
        min: props.min,
        max: props.max,
        step: props.step,
        value,
        disabled: props.disabled,
        "aria-label": props.ariaLabel,
        onInput: (event: Event) => {
          if (passthroughOnInput) passthroughOnInput(event);
          onInput(event);
        },
        onChange: (event: Event) => {
          if (passthroughOnChange) passthroughOnChange(event);
          onChange(event);
        },
      });

      if (!props.showValue) return input;

      return h(
        "div",
        { class: ["slider-row", props.className, attrClass], style: attrStyle },
        [input, h("span", { class: "slider__value" }, String(display.value))]
      );
    };
  },
});
