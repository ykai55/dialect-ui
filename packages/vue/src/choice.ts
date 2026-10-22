/* ============================================================
   choice.ts — Checkbox / Radio / Switch 共用的渲染骨架

   三个控件都是「label 包住原生 input + 装饰结构 + 文字」：

     <label class="check">
       <input class="check__input" type="checkbox">
       <span class="check__box">
         <svg class="check__mark" viewBox="0 0 20 20" aria-hidden="true">
           <path d="M5.2 10.3 L8 14 L13.5 5.7" />
         </svg>
       </span>
       <span class="check__label">…</span>
     </label>

   没有行为层：勾选状态就是原生 input 的 checked，键盘 / 焦点 / 同组
   互斥都交给浏览器。checked / defaultChecked 对应受控 / 非受控：

   - checked 不是 undefined 时受控：渲染值和外部同步，change 后如果父组件
     没有回写，下一拍把原生状态拨回 props（和 React 受控 input 一致）；
   - 否则只在首次渲染读取 defaultChecked，之后由浏览器维护。父组件重渲染
     时只要 props 没变就产出一致的 vnode，Vue 的 diff 不会覆盖用户的选择。

   className / class / style 落外层 label（根节点），其余原生 attrs
   （id、name、data-*、aria-*、事件）落真正可交互的 input。
   ============================================================ */
import { defineComponent, h, nextTick, ref } from "vue";
import type { PropType, VNode } from "vue";

export interface ChoiceConfig {
  /** 全局注册用的组件名，如 DialectCheckbox */
  name: string;
  rootClass: string;
  inputClass: string;
  labelClass: string;
  inputType: "checkbox" | "radio";
  /** 装饰结构：check 是 box + svg，radio 是 dot，switch 是 track + knob */
  indicator: () => VNode[];
}

export function createChoiceComponent(config: ChoiceConfig) {
  return defineComponent({
    name: config.name,
    // 根是 <label>，不是表单控件：class/style 留给根，其余 attrs 给 input
    inheritAttrs: false,
    props: {
      /** 文字；也可以用默认 slot 传更复杂的内容 */
      label: { type: String, default: undefined },
      /** 受控勾选值；不传则走非受控 defaultChecked */
      checked: { type: Boolean as PropType<boolean | undefined>, default: undefined },
      /** 非受控时的初始值 */
      defaultChecked: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false },
      name: { type: String, default: undefined },
      value: { type: String, default: undefined },
      /** 额外的根节点 class（Vue 也支持直接传 class，两者会合并） */
      className: { type: String, default: undefined },
    },
    emits: ["update:checked", "change"],
    setup(props, { attrs, emit, slots }) {
      const inputEl = ref<HTMLInputElement | null>(null);
      // 非受控只记住首次渲染的默认值：后续重渲染不重新读 defaultChecked
      const initialChecked =
        props.checked !== undefined ? props.checked : props.defaultChecked;
      const controlled = (): boolean => props.checked !== undefined;

      function onChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        emit("update:checked", input.checked);
        emit("change", input.checked, event);
        if (controlled()) {
          nextTick(() => {
            if (inputEl.value && inputEl.value.checked !== props.checked) {
              inputEl.value.checked = props.checked as boolean;
            }
          });
        }
      }

      return () => {
        const { class: attrClass, style: attrStyle, onChange: userOnChange, ...inputAttrs } =
          attrs;
        const passthroughOnChange =
          typeof userOnChange === "function" ? (userOnChange as (event: Event) => void) : undefined;
        const checked = controlled() ? (props.checked as boolean) : initialChecked;
        return h(
          "label",
          { class: [config.rootClass, props.className, attrClass], style: attrStyle },
          [
            h("input", {
              ...inputAttrs,
              ref: inputEl,
              class: config.inputClass,
              type: config.inputType,
              checked,
              disabled: props.disabled,
              name: props.name,
              // 没传 value 时不写这个 DOM 属性，避免把 checkbox 的默认 "on" 改成 ""
              ...(props.value !== undefined ? { value: props.value } : {}),
              onChange: (event: Event) => {
                // 用户自己挂的 onChange 先跑，再发 v-model / change，不吞监听
                if (passthroughOnChange) passthroughOnChange(event);
                onChange(event);
              },
            }),
            ...config.indicator(),
            props.label !== undefined || slots.default
              ? h(
                  "span",
                  { class: config.labelClass },
                  slots.default ? slots.default() : props.label
                )
              : null,
          ]
        );
      };
    },
  });
}
