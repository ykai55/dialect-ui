/* ============================================================
   text-field.ts — <TextField>：单行 input / 多行 textarea 共用一个组件

   DOM 契约和静态站一致：
     <label class="field">
       <span class="field__label">…</span>
       <span class="field__wrap">
         <input class="field__input">            // 单行
         <textarea class="field__input field__input--multiline">  // 多行
       </span>
     </label>

   没有行为层：值通过 modelValue 进来，输入时 emit update:modelValue，
   其余原生属性和事件透传到真正可交互的 input / textarea 上。
   ============================================================ */
import { defineComponent, h } from "vue";

export const TextField = defineComponent({
  name: "DialectTextField",
  // 根是 <label>，但 label 不是表单控件：class/style 留给根节点，
  // 其余原生属性（autocomplete、maxlength、@focus…）都交给 input / textarea。
  inheritAttrs: false,
  props: {
    label: { type: String, default: undefined },
    modelValue: { type: String, default: undefined },
    multiline: { type: Boolean, default: false },
    rows: { type: Number, default: undefined },
    placeholder: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    name: { type: String, default: undefined },
    id: { type: String, default: undefined },
  },
  emits: ["update:modelValue"],
  setup(props, { attrs, emit }) {
    return () => {
      const { class: rootClass, style: rootStyle, ...controlAttrs } = attrs;
      const passthroughOnInput =
        typeof controlAttrs.onInput === "function"
          ? (controlAttrs.onInput as (event: Event) => void)
          : undefined;

      const controlProps = {
        ...controlAttrs,
        class: props.multiline
          ? ["field__input", "field__input--multiline"]
          : "field__input",
        value: props.modelValue ?? "",
        placeholder: props.placeholder,
        disabled: props.disabled,
        readonly: props.readonly,
        name: props.name,
        id: props.id,
        onInput: (event: Event) => {
          // 用户自己挂的 onInput 先跑，再发 v-model 更新，不吞监听
          if (passthroughOnInput) passthroughOnInput(event);
          const target = event.target as HTMLInputElement | HTMLTextAreaElement;
          emit("update:modelValue", target.value);
        },
      };

      const control = props.multiline
        ? h("textarea", { ...controlProps, rows: props.rows })
        : h("input", {
            ...controlProps,
            // 没显式给 type 时补静态站同款的 type="text"
            type: typeof controlAttrs.type === "string" ? controlAttrs.type : "text",
          });

      return h(
        "label",
        { class: ["field", rootClass], style: rootStyle },
        [
          props.label !== undefined
            ? h("span", { class: "field__label" }, props.label)
            : null,
          h("span", { class: "field__wrap" }, [control]),
        ]
      );
    };
  },
});
