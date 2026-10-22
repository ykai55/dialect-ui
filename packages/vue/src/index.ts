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

export { Theme } from "./theme.js";
export type { ThemeName, ThemeMode } from "./theme.js";

export { Button } from "./button.js";
export type { ButtonVariant } from "./button.js";

export { TextField } from "./text-field.js";

export { Select } from "./select.js";
export type { SelectOption } from "./select.js";

/** 全局注册：app.use(DialectVue) 后可用 <DialectButton> 等标签。 */
const DialectVue = {
  install(app: App): void {
    app.component("DialectTheme", Theme);
    app.component("DialectButton", Button);
    app.component("DialectTextField", TextField);
    app.component("DialectSelect", Select);
  },
};

export default DialectVue;
