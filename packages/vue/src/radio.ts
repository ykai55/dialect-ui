/* ============================================================
   radio.ts — <Radio>

   DOM 契约和静态站一致：

     <label class="radio">
       <input type="radio" class="radio__input" name="…">
       <span class="radio__dot"></span>
       <span class="radio__label">Light</span>
     </label>

   同组互斥是原生 radio 的行为：同组使用同一个 name 即可，没有 core 控制器。
   ============================================================ */
import { h } from "vue";
import { createChoiceComponent } from "./choice.js";

export const Radio = createChoiceComponent({
  name: "DialectRadio",
  rootClass: "radio",
  inputClass: "radio__input",
  labelClass: "radio__label",
  inputType: "radio",
  indicator: () => [h("span", { class: "radio__dot" })],
});
