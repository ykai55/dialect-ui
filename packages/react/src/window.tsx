/* ============================================================
   window.tsx — 窗口

   DOM 结构照抄静态站 index.html 里六个 frame 的写法：
     <div class="window" data-window-frame="win11">
       <div class="window__bar">
         <div class="window__title">Settings</div>
         <div class="window__controls">
           <button type="button" class="window__caption" data-window-action="minimize" aria-label="最小化">–</button>
           <button type="button" class="window__caption" data-window-action="maximize" aria-label="最大化">□</button>
           <button type="button" class="window__caption window__caption--close" data-window-action="close" aria-label="关闭">✕</button>
         </div>
       </div>
       <div class="window__body">…</div>
     </div>

   macOS / macOS 15 的栏是「红绿灯 + 标题」：三个
   .window__traffic-dot（--close / --min / --zoom）各带一个内联 SVG glyph，
   路径逐字取自 index.html。GNOME 只有关闭按钮。

   窗口按钮的点击和窗口内的右键拦截都由 core 的 createWindow 处理；
   组件只把 window:action 事件映射成 onAction(action, event)。
   data-window-frame 是 CSS 契约（主题按它选窗口样式），必须写。
   data-window 是自动初始化标记，不写。
   ============================================================ */
import { forwardRef, useEffect, useRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { createWindow } from "@dialect-ui/core";
import { cx, useMergedRef } from "./internal.js";

export type WindowFrame = "win10" | "win11" | "winxp" | "macos" | "macos15" | "gnome";

export type WindowAction = "minimize" | "maximize" | "close";

export interface WindowProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "children"> {
  frame: WindowFrame;
  /** 标题栏文字。 */
  title?: ReactNode;
  /** 显示哪些窗口按钮；缺省 gnome 只有 close，其余 min/max/close。 */
  controls?: WindowAction[];
  onAction?: (action: WindowAction, event: Event) => void;
  children?: ReactNode;
}

const LABELS: Record<WindowAction, string> = {
  minimize: "最小化",
  maximize: "最大化",
  close: "关闭",
};

/** 每个 frame 的按钮顺序：macOS 红绿灯固定是 close / min / zoom。 */
function controlOrder(frame: WindowFrame): WindowAction[] {
  if (frame === "macos" || frame === "macos15") {
    return ["close", "minimize", "maximize"];
  }
  if (frame === "gnome") return ["close"];
  return ["minimize", "maximize", "close"];
}

function resolveControls(frame: WindowFrame, controls?: WindowAction[]): WindowAction[] {
  const order = controlOrder(frame);
  if (!controls) return order;
  return order.filter((action) => controls.indexOf(action) >= 0);
}

function isMac(frame: WindowFrame): boolean {
  return frame === "macos" || frame === "macos15";
}

function captionGlyph(frame: WindowFrame, action: WindowAction): string {
  if (action === "close") return "✕";
  if (action === "maximize") return "□";
  // Windows XP 的最小化按钮是下划线，其余 Windows 是短横线
  return frame === "winxp" ? "_" : "–";
}

function MacGlyph({ action }: { action: WindowAction }) {
  if (action === "close") {
    return (
      <svg viewBox="-2 -2 16 16" aria-hidden="true">
        <path
          d="M3.1 3.1l5.8 5.8M8.9 3.1L3.1 8.9"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (action === "minimize") {
    return (
      <svg viewBox="-2 -2 16 16" aria-hidden="true">
        <path
          d="M2.55 6h6.9"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="-2 -2 16 16" aria-hidden="true">
      <path
        d="M2.05 2.05v6.6L8.65 2.05zM9.95 9.95V3.35L3.35 9.95z"
        fill="currentColor"
      />
    </svg>
  );
}

function MacDot({ action }: { action: WindowAction }) {
  const modifier =
    action === "close" ? "--close" : action === "minimize" ? "--min" : "--zoom";
  return (
    <button
      type="button"
      className={"window__traffic-dot window__traffic-dot" + modifier}
      data-window-action={action}
      aria-label={action === "maximize" ? "缩放" : LABELS[action]}
    >
      <span className="window__traffic-glyph">
        <MacGlyph action={action} />
      </span>
    </button>
  );
}

function Caption({ frame, action }: { frame: WindowFrame; action: WindowAction }) {
  const closeClass = action === "close" ? " window__caption--close" : "";
  return (
    <button
      type="button"
      className={"window__caption" + closeClass}
      data-window-action={action}
      aria-label={LABELS[action]}
    >
      {captionGlyph(frame, action)}
    </button>
  );
}

export const Window = forwardRef<HTMLDivElement, WindowProps>(function Window(
  { frame, title, controls, onAction, children, className, style, ...rest },
  ref
) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const setRootRef = useMergedRef<HTMLDivElement>(ref, rootRef);

  const latestRef = useRef({ onAction });
  useEffect(() => {
    latestRef.current = { onAction };
  });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ctrl = createWindow(el);

    function onWindowAction(event: Event): void {
      const action = (event as CustomEvent<{ action?: WindowAction }>).detail?.action;
      if (!action) return;
      latestRef.current.onAction?.(action, event);
    }

    el.addEventListener("window:action", onWindowAction);
    return () => {
      el.removeEventListener("window:action", onWindowAction);
      ctrl?.destroy();
    };
  }, []);

  const actions = resolveControls(frame, controls);
  const mac = isMac(frame);

  return (
    <div
      {...rest}
      ref={setRootRef}
      className={cx("window", className)}
      style={style as CSSProperties}
      data-window-frame={frame}
    >
      <div className="window__bar">
        {mac ? (
          <>
            <div className="window__traffic">
              {actions.map((action) => (
                <MacDot key={action} action={action} />
              ))}
            </div>
            <div className="window__title">{title}</div>
          </>
        ) : (
          <>
            <div className="window__title">{title}</div>
            <div className="window__controls">
              {actions.map((action) => (
                <Caption key={action} frame={frame} action={action} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="window__body">{children}</div>
    </div>
  );
});
