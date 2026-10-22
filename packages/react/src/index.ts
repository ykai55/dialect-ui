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

/* ---------- 纯 CSS 控件（无控制器） ---------- */

export { Checkbox } from "./checkbox.js";
export type { CheckboxProps } from "./checkbox.js";

export { Radio } from "./radio.js";
export type { RadioProps } from "./radio.js";

export { Switch } from "./switch.js";
export type { SwitchProps } from "./switch.js";

export { Progress } from "./progress.js";
export type { ProgressProps } from "./progress.js";

export { Slider } from "./slider.js";
export type { SliderProps } from "./slider.js";

/* ---------- 有控制器的组件 ---------- */

export { SegmentedControl } from "./segmented.js";
export type { SegmentedControlProps, SegmentedOption } from "./segmented.js";

export { Tabs } from "./tabs.js";
export type { TabItem, TabsProps } from "./tabs.js";

export { Tooltip, TooltipProvider } from "./tooltip.js";
export type { TooltipProps, TooltipProviderProps } from "./tooltip.js";

export { ContextMenu, Menu } from "./menu.js";
export type {
  ContextMenuProps,
  MenuEntry,
  MenuItemEntry,
  MenuProps,
  MenuSelectHandler,
  MenuSeparatorEntry,
} from "./menu.js";

export { Window } from "./window.js";
export type { WindowAction, WindowFrame, WindowProps } from "./window.js";
