/* ============================================================
   switch.ts — <Switch>

   DOM 契约和静态站一致：

     <label class="switch">
       <input type="checkbox" class="switch__input">
       <span class="switch__track"><span class="switch__knob"></span></span>
       <span class="switch__label">Wi-Fi</span>
     </label>

   语义上是复选框（input type=checkbox），开关外观全靠 CSS 的
   :checked 选择器；没有 core 控制器。
   ============================================================ */
import { h } from "vue";
import { createChoiceComponent } from "./choice.js";

export const Switch = createChoiceComponent({
  name: "DialectSwitch",
  rootClass: "switch",
  inputClass: "switch__input",
  labelClass: "switch__label",
  inputType: "checkbox",
  indicator: () => [
    h("span", { class: "switch__track" }, [h("span", { class: "switch__knob" })]),
  ],
});
