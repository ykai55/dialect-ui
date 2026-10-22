/* ============================================================
   progress.ts — <Progress>

   DOM 契约和静态站一致（确定态 / 不确定态）：

     <div class="progress" role="progressbar" aria-valuemin="0"
          aria-valuemax="100" aria-valuenow="40"
          style="--progress-value: 40%">
       <div class="progress__fill"></div>
     </div>

     <div class="progress" role="progressbar" data-indeterminate>
       <div class="progress__fill"></div>
     </div>

   没有行为层：CSS 读 --progress-value 画填充，不确定态由
   [data-indeterminate] 切到滑动动画。aria-valuenow 只在确定态写。
   ============================================================ */
import { defineComponent, h } from "vue";

export const Progress = defineComponent({
  name: "DialectProgress",
  props: {
    /** 当前进度；不确定态忽略 */
    value: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    indeterminate: { type: Boolean, default: false },
    /** 无障碍名称，落在 role=progressbar 的根节点上 */
    ariaLabel: { type: String, default: undefined },
    /** 额外的根节点 class */
    className: { type: String, default: undefined },
  },
  setup(props) {
    return () => {
      const max = Number.isFinite(props.max) && props.max > 0 ? props.max : 100;
      const value = Number.isFinite(props.value)
        ? Math.min(max, Math.max(0, props.value))
        : 0;
      const pct = (value / max) * 100;
      return h(
        "div",
        {
          class: ["progress", props.className],
          role: "progressbar",
          "aria-valuemin": 0,
          "aria-valuemax": max,
          // 不确定态没有具体进度，不写 aria-valuenow
          "aria-valuenow": props.indeterminate ? undefined : value,
          "aria-label": props.ariaLabel,
          "data-indeterminate": props.indeterminate ? "" : undefined,
          style: props.indeterminate ? undefined : { "--progress-value": `${pct}%` },
        },
        [h("div", { class: "progress__fill" })]
      );
    };
  },
});
