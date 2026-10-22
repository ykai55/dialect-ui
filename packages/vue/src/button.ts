/* ============================================================
   button.ts — <Button>：渲染静态站的 .btn / .btn--primary

   没有行为层：disabled、click 等原生属性/事件靠 Vue 的 attrs
   透传直接落到根 <button> 上（inheritAttrs 默认 true）。
   ============================================================ */
import { defineComponent, h } from "vue";
import type { PropType } from "vue";

export type ButtonVariant = "default" | "primary";

export const Button = defineComponent({
  name: "DialectButton",
  props: {
    variant: { type: String as PropType<ButtonVariant>, default: "default" },
    /** 原生 button 的 type；静态站默认 type="button"，这里保持一致。 */
    type: { type: String, default: "button" },
  },
  setup(props, { slots }) {
    return () =>
      h(
        "button",
        {
          type: props.type,
          class: ["btn", props.variant === "primary" ? "btn--primary" : null],
        },
        slots.default ? slots.default() : []
      );
  },
});
