/* ============================================================
   @dialect-ui/react — React 适配层公共入口

   只做三件事：渲染和静态站一样的 DOM 契约、挂载 / 销毁 core 控制器、
   把控制器回调映射成 React props。不实现键盘、定位、焦点、开关状态。
   ============================================================ */
export { Theme } from "./theme.js";
export type { ThemeMode, ThemeName, ThemeProps } from "./theme.js";

export { Button } from "./button.js";
export type { ButtonProps, ButtonVariant } from "./button.js";

export { TextField } from "./text-field.js";
export type { TextFieldProps } from "./text-field.js";

export { Select } from "./select.js";
export type { SelectOption, SelectProps } from "./select.js";
