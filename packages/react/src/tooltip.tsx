/* ============================================================
   tooltip.tsx — 提示气泡

   Provider 渲染和静态站一样的宿主 + 提示层：
     <div class="tooltip-host" style="display: contents">
       …children（带 data-tooltip 的元素）…
       <div class="tooltip" role="tooltip" data-tooltip-layer hidden></div>
     </div>

   挂载时 createTooltip(layer)，悬停 / 聚焦 / Esc / 滚动 / 缩放全部由
   core 控制器处理；Tooltip 只给唯一子元素加 data-tooltip，不产生额外布局节点。

   一个主题容器里放一个 Provider：createTooltip 在挂载时扫描宿主内的
   [data-tooltip]，之后新增的 Tooltip 需要重挂 Provider 才会被收进触发集合
   （core 没有 refresh()，见报告里的缺口）。
   ============================================================ */
import { cloneElement, forwardRef, isValidElement, useEffect, useRef } from "react";
import type { ReactElement, ReactNode, Ref } from "react";
import { createTooltip } from "@dialect-ui/core";
import { useMergedRef } from "./internal.js";

export interface TooltipProviderProps {
  children?: ReactNode;
}

export const TooltipProvider = forwardRef<HTMLDivElement, TooltipProviderProps>(
  function TooltipProvider({ children }, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const layerRef = useRef<HTMLDivElement | null>(null);
    const setHostRef = useMergedRef<HTMLDivElement>(ref, hostRef);

    // 控制器只建一次；StrictMode 的 mount → cleanup → mount 依赖 destroy 幂等。
    useEffect(() => {
      const layer = layerRef.current;
      if (!layer) return;
      const ctrl = createTooltip(layer);
      return () => {
        ctrl.destroy();
      };
    }, []);

    return (
      <div ref={setHostRef} className="tooltip-host" style={{ display: "contents" }}>
        {children}
        <div
          ref={layerRef}
          className="tooltip"
          role="tooltip"
          data-tooltip-layer=""
          hidden
        ></div>
      </div>
    );
  }
);

type TooltipChildProps = {
  "data-tooltip"?: string;
  ref?: Ref<HTMLElement>;
};

export interface TooltipProps {
  /** 提示文字，写进子元素的 data-tooltip；控制器读取后填进提示层。 */
  text: string;
  /** 唯一子元素；会克隆它并加上 data-tooltip / ref。 */
  children: ReactElement;
}

export const Tooltip = forwardRef<HTMLElement, TooltipProps>(function Tooltip(
  { text, children },
  ref
) {
  if (!isValidElement(children)) {
    throw new Error(
      "Tooltip 需要一个 React 元素作为唯一子节点（不能是文本、数组或 Fragment），" +
        "否则 data-tooltip 没有可以落上去的 DOM 节点。"
    );
  }

  const child = children as ReactElement<TooltipChildProps>;
  const childRef = child.props.ref;
  // 同时转发调用方 ref 和子元素原本的 ref，不覆盖用户的 ref。
  const mergedRef = useMergedRef<HTMLElement>(ref, childRef);

  return cloneElement(child, { "data-tooltip": text, ref: mergedRef });
});
