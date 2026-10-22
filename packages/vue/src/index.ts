/* ============================================================
   @dialect-ui/vue — Dialect 组件的 Vue 3 适配层

   只做三件事：渲染和静态站一样的 DOM 契约、在生命周期里挂载/销毁
   @dialect-ui/core 的控制器、把控制器回调映射成 Vue 事件。
   外观和行为都只有 core 一份实现。

   用法：
     import DialectVue from "@dialect-ui/vue";   // 全局注册插件
     app.use(DialectVue);

     或按需：
     import { Theme, Button, TextField, Select } from "@dialect-ui/vue";
   ============================================================ */
import type { App } from "vue";
import { Theme } from "./theme.js";
import { Button } from "./button.js";
import { TextField } from "./text-field.js";
import { Select } from "./select.js";
import { Checkbox } from "./checkbox.js";
import { Radio } from "./radio.js";
import { Switch } from "./switch.js";
import { Progress } from "./progress.js";
import { Slider } from "./slider.js";
import { SegmentedControl } from "./segmented.js";
import { Tabs } from "./tabs.js";
import { Tooltip, TooltipProvider } from "./tooltip.js";
import { ContextMenu, Menu } from "./menu.js";
import { Window } from "./window.js";

export { Theme } from "./theme.js";
export type { ThemeName, ThemeMode } from "./theme.js";

export { Button } from "./button.js";
export type { ButtonVariant } from "./button.js";

export { TextField } from "./text-field.js";

export { Select } from "./select.js";
export type { SelectOption } from "./select.js";

export { Checkbox } from "./checkbox.js";
export { Radio } from "./radio.js";
export { Switch } from "./switch.js";
export { Progress } from "./progress.js";

export { Slider } from "./slider.js";

export { SegmentedControl } from "./segmented.js";
export type { SegmentedOption } from "./segmented.js";

export { Tabs } from "./tabs.js";
export type { TabsItem } from "./tabs.js";

export { Tooltip, TooltipProvider } from "./tooltip.js";

export { ContextMenu, Menu } from "./menu.js";
export type { MenuAction, MenuEntry, MenuSeparator } from "./menu.js";

export { Window } from "./window.js";
export type { WindowControlAction, WindowFrame } from "./window.js";

/** 全局注册：app.use(DialectVue) 后可用 <DialectButton> 等标签。 */
const DialectVue = {
  install(app: App): void {
    app.component("DialectTheme", Theme);
    app.component("DialectButton", Button);
    app.component("DialectTextField", TextField);
    app.component("DialectSelect", Select);
    app.component("DialectCheckbox", Checkbox);
    app.component("DialectRadio", Radio);
    app.component("DialectSwitch", Switch);
    app.component("DialectProgress", Progress);
    app.component("DialectSlider", Slider);
    app.component("DialectSegmentedControl", SegmentedControl);
    app.component("DialectTabs", Tabs);
    app.component("DialectTooltipProvider", TooltipProvider);
    app.component("DialectTooltip", Tooltip);
    app.component("DialectMenu", Menu);
    app.component("DialectContextMenu", ContextMenu);
    app.component("DialectWindow", Window);
  },
};

export default DialectVue;
