/* ============================================================
   tooltip.ts — <TooltipProvider> + <Tooltip>

   和静态站同一套结构（不含自动初始化标记）：

     <div class="tooltip-host" style="display: contents">
       …children（其中带 data-tooltip 的元素是触发目标）…
       <div class="tooltip" role="tooltip" data-tooltip-layer hidden></div>
     </div>

   Provider 只负责渲染触发目标 + 提示层，并挂载 core 的 createTooltip；
   悬停 / 聚焦延迟、定位、Esc / 滚动 / 缩放关闭都在 core 里。

   Tooltip 用 cloneVNode 给唯一子元素补 data-tooltip，不产生额外布局节点：
   Provider 的行为层在挂载时扫 `[data-tooltip]`，所以多个 Tooltip 共享
   同一个 Provider 的提示层。一个主题容器放一个 Provider（文档约定）。
   ============================================================ */
import {
  Comment,
  Text,
  cloneVNode,
  defineComponent,
  h,
  isVNode,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  warn,
} from "vue";
import type { VNode } from "vue";
import { createTooltip as createTooltipController } from "@dialect-ui/core";
import type { TooltipController } from "@dialect-ui/core";

export const TooltipProvider = defineComponent({
  name: "DialectTooltipProvider",
  setup(_props, { slots }) {
    const layerEl = ref<HTMLElement | null>(null);
    let ctrl: TooltipController | null = null;

    function createController(): void {
      if (ctrl || !layerEl.value) return;
      ctrl = createTooltipController(layerEl.value);
    }

    function destroyController(): void {
      if (!ctrl) return;
      ctrl.destroy();
      ctrl = null;
    }

    onMounted(createController);
    onActivated(createController);
    onDeactivated(destroyController);
    onBeforeUnmount(destroyController);

    return () =>
      h("div", { class: "tooltip-host", style: { display: "contents" } }, [
        slots.default ? slots.default() : [],
        h("div", {
          ref: layerEl,
          class: "tooltip",
          role: "tooltip",
          "data-tooltip-layer": "",
          hidden: true,
        }),
      ]);
  },
});

export const Tooltip = defineComponent({
  name: "DialectTooltip",
  inheritAttrs: false,
  props: {
    /** 提示文字；渲染成子元素的 data-tooltip */
    text: { type: String, required: true },
  },
  setup(props, { attrs, expose, slots }) {
    // 转发 ref：父组件的模板 ref 拿到的是 Tooltip 实例，再读 .el 可拿到触发元素
    let currentVNode: VNode | null = null;
    expose({
      get el(): Element | null {
        return (currentVNode?.el as Element | null) ?? null;
      },
    });

    function triggerNode(): VNode | null {
      const children: unknown[] = slots.default ? slots.default() : [];
      const meaningful = children.filter((child) => {
        if (child == null || child === "") return false;
        if (isVNode(child)) return child.type !== Comment && child.type !== Text;
        return true;
      });
      if (meaningful.length !== 1 || !isVNode(meaningful[0])) {
        warn(
          `DialectTooltip 需要一个非文本子元素作为触发目标，收到 ${meaningful.length} 个`
        );
        return null;
      }
      // 保留原 vnode 的 ref；只补 data-tooltip，不加额外布局节点
      return cloneVNode(meaningful[0] as VNode, { "data-tooltip": props.text });
    }

    return () => {
      currentVNode = triggerNode();
      if (currentVNode) return currentVNode;
      // 子节点不合法时原样渲染，方便定位问题，也不会吞掉用户内容
      const children = slots.default ? slots.default() : [];
      return h("span", attrs, children as VNode[]);
    };
  },
});
