/* ============================================================
   window.ts — <Window>

   复刻 index.html 里六个 frame 的 .window 结构（data-window-frame 是
   CSS 契约，必须写；data-window 是自动初始化标记，不写）：

     <div class="window" data-window-frame="win11">
       <div class="window__bar">
         <div class="window__title">Settings</div>
         <div class="window__controls">
           <button type="button" class="window__caption"
                   data-window-action="minimize" aria-label="最小化">–</button>
           …
         </div>
       </div>
       <div class="window__body">…</div>
     </div>

   macOS 用 .window__traffic 三个红绿灯 + 内联 SVG glyph；GNOME 只有关闭按钮。
   窗口按钮的 window:action、窗口内右键的 window:contextmenu 由 core 的
   createWindow 派发，组件映射成 action / contextmenu 事件。
   ============================================================ */
import {
  defineComponent,
  h,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
} from "vue";
import type { PropType, VNode } from "vue";
import { createWindow as createWindowController } from "@dialect-ui/core";
import type { WindowController } from "@dialect-ui/core";

/** 六个平台代际，和 packages/core/css/themes/*.css 的文件名一一对应 */
export type WindowFrame = "win10" | "win11" | "winxp" | "macos" | "macos15" | "gnome";

/** 窗口按钮动作；宿主自己决定最小化 / 最大化 / 关闭做什么 */
export type WindowControlAction = "minimize" | "maximize" | "close";

/** macOS 交通灯分别是 --close / --min / --zoom */
const MAC_DOT_CLASS: Record<WindowControlAction, string> = {
  close: "window__traffic-dot--close",
  minimize: "window__traffic-dot--min",
  maximize: "window__traffic-dot--zoom",
};

const ACTION_LABEL: Record<WindowControlAction, string> = {
  close: "关闭",
  minimize: "最小化",
  maximize: "最大化",
};

const MAC_ACTION_LABEL: Record<WindowControlAction, string> = {
  close: "关闭",
  minimize: "最小化",
  maximize: "缩放",
};

/** macOS 内联 glyph，路径照抄 index.html */
const MAC_GLYPH: Record<WindowControlAction, () => VNode[]> = {
  close: () => [
    h("path", {
      d: "M3.1 3.1l5.8 5.8M8.9 3.1L3.1 8.9",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2.2",
      "stroke-linecap": "round",
    }),
  ],
  minimize: () => [
    h("path", {
      d: "M2.55 6h6.9",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2.2",
      "stroke-linecap": "round",
    }),
  ],
  maximize: () => [
    h("path", {
      d: "M2.05 2.05v6.6L8.65 2.05zM9.95 9.95V3.35L3.35 9.95z",
      fill: "currentColor",
    }),
  ],
};

/** Windows / XP / GNOME 的标题栏按钮文字 */
const CAPTION_GLYPH: Record<WindowControlAction, string> = {
  minimize: "–",
  maximize: "□",
  close: "✕",
};

const XP_CAPTION_GLYPH: Record<WindowControlAction, string> = {
  minimize: "_",
  maximize: "□",
  close: "✕",
};

const DEFAULT_CONTROLS: WindowControlAction[] = ["minimize", "maximize", "close"];

function isMac(frame: WindowFrame): boolean {
  return frame === "macos" || frame === "macos15";
}

/** 按平台习惯的视觉顺序排列用户要求的按钮 */
function controlsFor(frame: WindowFrame, wanted?: WindowControlAction[]): WindowControlAction[] {
  const order: WindowControlAction[] = isMac(frame)
    ? ["close", "minimize", "maximize"]
    : ["minimize", "maximize", "close"];
  // GNOME 的标题栏只有关闭按钮，其余动作不渲染
  const allowed = frame === "gnome" ? (["close"] as WindowControlAction[]) : order;
  const requested = wanted && wanted.length ? wanted : DEFAULT_CONTROLS;
  return allowed.filter((action) => requested.includes(action));
}

export const Window = defineComponent({
  name: "DialectWindow",
  props: {
    frame: { type: String as PropType<WindowFrame>, required: true },
    title: { type: String, default: undefined },
    /** 要显示的窗口按钮；缺省 Windows / macOS 三个、GNOME 只有关闭 */
    controls: {
      type: Array as PropType<WindowControlAction[] | undefined>,
      default: undefined,
    },
    /** 额外的根节点 class */
    className: { type: String, default: undefined },
  },
  emits: ["action", "contextmenu"],
  setup(props, { emit, slots }) {
    const rootEl = ref<HTMLElement | null>(null);
    let ctrl: WindowController | null = null;

    function onWindowAction(event: Event): void {
      const detail = (event as CustomEvent<{ action: string }>).detail;
      emit("action", detail.action, event);
    }

    function onWindowContextMenu(event: Event): void {
      const detail = (event as CustomEvent<{ prevented: boolean }>).detail;
      emit("contextmenu", detail, event);
    }

    function createController(): void {
      if (ctrl || !rootEl.value) return;
      ctrl = createWindowController(rootEl.value);
      rootEl.value.addEventListener("window:action", onWindowAction);
      rootEl.value.addEventListener("window:contextmenu", onWindowContextMenu);
    }

    function destroyController(): void {
      if (!ctrl) return;
      rootEl.value?.removeEventListener("window:action", onWindowAction);
      rootEl.value?.removeEventListener("window:contextmenu", onWindowContextMenu);
      ctrl.destroy();
      ctrl = null;
    }

    onMounted(createController);
    onActivated(createController);
    onDeactivated(destroyController);
    onBeforeUnmount(destroyController);

    return () => {
      const frame = props.frame;
      const controls = controlsFor(frame, props.controls);
      const title = h("div", { class: "window__title" }, props.title ?? "");

      const controlNodes = controls.map((action) => {
        if (isMac(frame)) {
          return h(
            "button",
            {
              type: "button",
              class: ["window__traffic-dot", MAC_DOT_CLASS[action]],
              "data-window-action": action,
              "aria-label": MAC_ACTION_LABEL[action],
            },
            [
              h("span", { class: "window__traffic-glyph" }, [
                h("svg", { viewBox: "-2 -2 16 16", "aria-hidden": "true" }, MAC_GLYPH[action]()),
              ]),
            ]
          );
        }
        const glyph =
          frame === "winxp" ? XP_CAPTION_GLYPH[action] : CAPTION_GLYPH[action];
        return h(
          "button",
          {
            type: "button",
            class: [
              "window__caption",
              action === "close" ? "window__caption--close" : null,
            ],
            "data-window-action": action,
            "aria-label": ACTION_LABEL[action],
          },
          glyph
        );
      });

      const bar = h(
        "div",
        { class: "window__bar" },
        isMac(frame)
          ? [h("div", { class: "window__traffic" }, controlNodes), title]
          : [title, h("div", { class: "window__controls" }, controlNodes)]
      );

      return h(
        "div",
        {
          ref: rootEl,
          class: ["window", props.className],
          "data-window-frame": frame,
        },
        [bar, h("div", { class: "window__body" }, slots.default ? slots.default() : [])]
      );
    };
  },
});
