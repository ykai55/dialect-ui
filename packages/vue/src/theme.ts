/* ============================================================
   theme.ts — <Theme>：只负责把 data-theme / data-mode 挂到容器上

   主题仍然由 @dialect-ui/core 的 CSS 主题文件定义（文件名就是
   data-theme 的值），组件本身不判断平台、不强制背景。
   ============================================================ */
import { defineComponent, h } from "vue";
import type { PropType } from "vue";

/** 主题名，和 packages/core/css/themes/*.css 的文件名一一对应。 */
export type ThemeName = "win11" | "win10" | "winxp" | "macos" | "macos15" | "gnome";

/** 明暗两套。缺省时不写 data-mode，交给 CSS 的亮色兜底。 */
export type ThemeMode = "light" | "dark";

export const Theme = defineComponent({
  name: "DialectTheme",
  props: {
    theme: { type: String as PropType<ThemeName>, required: true },
    mode: { type: String as PropType<ThemeMode>, default: undefined },
  },
  setup(props, { slots }) {
    // 根节点是单个 div：Vue 会把 class / style / 其余 attrs 自动落到它上面，
    // 相当于「attrs 透传」，不需要手动 merge，也避免重复合并。
    return () =>
      h(
        "div",
        {
          "data-theme": props.theme,
          "data-mode": props.mode,
        },
        slots.default ? slots.default() : []
      );
  },
});
