/* ============================================================
   checkbox.ts — <Checkbox>

   DOM 契约和静态站一致（不含自动初始化标记）：

     <label class="check">
       <input type="checkbox" class="check__input">
       <span class="check__box">
         <svg class="check__mark" viewBox="0 0 20 20" aria-hidden="true">
           <path d="M5.2 10.3 L8 14 L13.5 5.7" />
         </svg>
       </span>
       <span class="check__label">Send me a copy</span>
     </label>

   勾选 / 焦点 / 键盘全由原生 input 负责，没有 core 控制器。
   ============================================================ */
import { h } from "vue";
import { createChoiceComponent } from "./choice.js";

export const Checkbox = createChoiceComponent({
  name: "DialectCheckbox",
  rootClass: "check",
  inputClass: "check__input",
  labelClass: "check__label",
  inputType: "checkbox",
  indicator: () => [
    h("span", { class: "check__box" }, [
      h("svg", { class: "check__mark", viewBox: "0 0 20 20", "aria-hidden": "true" }, [
        h("path", { d: "M5.2 10.3 L8 14 L13.5 5.7" }),
      ]),
    ]),
  ],
});
