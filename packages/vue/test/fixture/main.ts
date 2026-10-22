/* ============================================================
   @dialect-ui/vue 验收页

   用 createApp 挂真组件，在 DOM 上跑断言，结果写进 <pre id="result">。
   tools/test-fixture.sh 构建后用 headless Chrome 读这个页面，
   只要有 FAIL 行就以非零退出码收场。

   覆盖：
   - v0.1：Theme / Button / TextField / Select
   - v0.2：Checkbox / Radio / Switch / Progress / Slider / SegmentedControl /
     Tabs / TooltipProvider+Tooltip / Menu / ContextMenu / Window
   ============================================================ */
import "@dialect-ui/core/css/tokens.css";
import "@dialect-ui/core/css/components.css";
import "@dialect-ui/core/css/window.css";
import "@dialect-ui/core/css/themes/macos.css";

import { createApp, h, KeepAlive, nextTick, ref } from "vue";
import DialectVue, {
  Button,
  Checkbox,
  ContextMenu,
  Menu,
  Progress,
  Radio,
  SegmentedControl,
  Select,
  Slider,
  Switch,
  Tabs,
  TextField,
  Theme,
  Tooltip,
  TooltipProvider,
  Window,
} from "@dialect-ui/vue";
import type { MenuEntry, SegmentedOption, SelectOption, TabsItem } from "@dialect-ui/vue";

const resultEl = document.getElementById("result") as HTMLPreElement;
const lines: string[] = [];
let failures = 0;

function check(name: string, fn: () => boolean): void {
  let ok = false;
  try {
    ok = !!fn();
  } catch (error) {
    failures += 1;
    lines.push(`FAIL ${name} — ${(error as Error).message}`);
    return;
  }
  if (!ok) failures += 1;
  lines.push(`${ok ? "PASS" : "FAIL"} ${name}`);
}

function wait(ms = 30): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 等 Vue 的 patch 和控制器回调都落完 */
async function settle(): Promise<void> {
  await nextTick();
  await wait(30);
}

function press(el: Element | Document, key: string): void {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

/** 轮询等一个异步 DOM 状态（popover 的 toggle 事件、tooltip 的延迟计时器） */
async function waitFor(predicate: () => boolean, timeout = 200): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) return;
    await wait(5);
  }
}

/* ---------- v0.1 状态：父组件持有，用来验证 v-model 双向同步 ---------- */
const clickCount = ref(0);
const disabledClickCount = ref(0);
const textValue = ref("seed");
const selectValue = ref("b");
const showSelect = ref(true);
const keptValue = ref("b");
const showKeptSelect = ref(true);
const openEvents: boolean[] = [];
const changeEvents: string[] = [];

const options: SelectOption[] = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C", disabled: true },
  { value: "d", label: "Option D" },
];

/* ---------- v0.2 状态 ---------- */
// 强制父组件重渲染，验证「非受控状态不会被无关重渲染覆盖」
const probe = ref(0);

const cbControlled = ref(true);
const cbControlledEvents: boolean[] = [];
const cbUncontrolledEvents: boolean[] = [];

const radioPick = ref("light");
const radioEvents: string[] = [];

const switchOn = ref(false);
const switchEvents: boolean[] = [];
const switchUncontrolledEvents: boolean[] = [];

const sliderValue = ref(40);
const sliderChanges: number[] = [];
const showSlider = ref(true);

const segValue = ref("day");
const segChanges: Array<{ value: string; option?: SegmentedOption }> = [];
const showSegmented = ref(true);
const keptSegValue = ref("week");
const showKeptSeg = ref(true);

const tabsValue = ref("general");
const tabsChanges: Array<{ value: string; index: number }> = [];
const tabsFocusValue = ref("general");
const showTabs = ref(true);

const menuSelections: Array<{ entry: MenuEntry; index: number }> = [];
const showMenu = ref(true);

const contextSelections: Array<{ entry: MenuEntry; index: number }> = [];

const windowActions: Array<{ action: string; event: Event }> = [];
const windowContextMenus: Array<{ detail: unknown; event: Event }> = [];
const showWindow = ref(true);

const showTooltipProvider = ref(true);

const segOptions: SegmentedOption[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month", disabled: true },
  { value: "quarter", label: "Quarter" },
];

const tabItems: TabsItem[] = [
  { value: "general", label: "General" },
  { value: "advanced", label: "Advanced" },
  { value: "about", label: "About" },
];

const menuItems: MenuEntry[] = [
  { label: "New", value: "new", shortcut: "⌘N" },
  { label: "Open", value: "open", shortcut: "⌘O" },
  { separator: true },
  { label: "Delete", value: "delete", disabled: true },
  { label: "Preferences", value: "prefs", shortcut: "⌘," },
];

const contextItems: MenuEntry[] = [
  { label: "Cut", value: "cut", shortcut: "⌘X" },
  { label: "Copy", value: "copy", shortcut: "⌘C" },
  { separator: true },
  { label: "Paste", value: "paste", shortcut: "⌘V" },
];

/* ---------- 应用 ---------- */
createApp({
  name: "FixtureApp",
  render() {
    return h(
      Theme,
      { theme: "macos", mode: "light", id: "theme-root", class: "fixture-theme panel" },
      () => [
        h("div", { id: "btn-host", class: "row" }, [
          h(
            Button,
            {
              id: "btn-default",
              class: "fixture-btn",
              onClick: () => {
                clickCount.value += 1;
              },
            },
            () => "Cancel"
          ),
          h(
            Button,
            {
              id: "btn-primary",
              variant: "primary",
              onClick: () => {
                clickCount.value += 1;
              },
            },
            () => "Save changes"
          ),
          h(
            Button,
            {
              id: "btn-disabled",
              disabled: true,
              onClick: () => {
                disabledClickCount.value += 1;
              },
            },
            () => "Disabled"
          ),
        ]),

        h(TextField, {
          id: "text-single",
          label: "Email address",
          modelValue: textValue.value,
          placeholder: "name@example.com",
          name: "email",
          autocomplete: "off",
          "onUpdate:modelValue": (value: string) => {
            textValue.value = value;
          },
        }),

        h(TextField, {
          id: "text-multi",
          label: "Notes",
          modelValue: textValue.value,
          multiline: true,
          rows: 3,
        }),

        showSelect.value
          ? h(Select, {
              id: "select-main",
              className: "fixture-select",
              ariaLabel: "Choose an option",
              options,
              modelValue: selectValue.value,
              "onUpdate:modelValue": (value: string) => {
                selectValue.value = value;
              },
              "onUpdate:open": (open: boolean) => {
                openEvents.push(open);
              },
              onChange: (value: string) => {
                changeEvents.push(value);
              },
            })
          : null,

        // keep-alive：失活走 deactivated（销毁控制器），激活走 activated（重建）
        h(KeepAlive, null, {
          default: () =>
            showKeptSelect.value
              ? h(Select, {
                  id: "select-kept",
                  options,
                  modelValue: keptValue.value,
                  "onUpdate:modelValue": (value: string) => {
                    keptValue.value = value;
                  },
                })
              : null,
        }),

        h(Select, {
          id: "select-disabled",
          options,
          modelValue: "a",
          disabled: true,
        }),

        /* ================= v0.2：表单类纯 CSS 控件 ================= */
        h("div", { id: "choice-host", class: "fixture-section" }, [
          h(Checkbox, {
            id: "check-controlled",
            className: "fixture-check",
            label: "Send me a copy",
            checked: cbControlled.value,
            "onUpdate:checked": (checked: boolean) => {
              cbControlled.value = checked;
              cbControlledEvents.push(checked);
            },
          }),
          h(Checkbox, {
            id: "check-uncontrolled",
            label: "Remember this device",
            defaultChecked: true,
            onChange: (checked: boolean) => {
              cbUncontrolledEvents.push(checked);
            },
          }),
          h(Checkbox, {
            id: "check-rejected",
            label: "Rejected by parent",
            checked: false,
          }),
          h(Checkbox, {
            id: "check-disabled",
            label: "Disabled check",
            disabled: true,
            defaultChecked: true,
          }),
          h("div", { id: "radio-group" }, [
            ...["light", "dark", "auto"].map((value) =>
              h(Radio, {
                id: `radio-${value}`,
                name: "fixture-mode",
                value,
                label: value[0].toUpperCase() + value.slice(1),
                checked: radioPick.value === value,
                "onUpdate:checked": (checked: boolean) => {
                  if (checked) {
                    radioPick.value = value;
                    radioEvents.push(value);
                  }
                },
              })
            ),
          ]),
          h(Switch, {
            id: "switch-controlled",
            label: "Wi-Fi",
            checked: switchOn.value,
            "onUpdate:checked": (checked: boolean) => {
              switchOn.value = checked;
              switchEvents.push(checked);
            },
          }),
          h(Switch, {
            id: "switch-uncontrolled",
            label: "Bluetooth",
            defaultChecked: true,
            onChange: (checked: boolean) => {
              switchUncontrolledEvents.push(checked);
            },
          }),
        ]),

        h("div", { id: "progress-host", class: "fixture-section" }, [
          h(Progress, {
            id: "progress-main",
            value: 40,
            max: 100,
            ariaLabel: "Upload progress",
            className: "fixture-progress",
          }),
          h(Progress, { id: "progress-half", value: 50, max: 200 }),
          h(Progress, {
            id: "progress-indeterminate",
            indeterminate: true,
            ariaLabel: "Loading",
          }),
        ]),

        h("div", { id: "slider-host", class: "fixture-section" }, [
          showSlider.value
            ? h(Slider, {
                id: "slider-main",
                showValue: true,
                modelValue: sliderValue.value,
                min: 0,
                max: 100,
                step: 1,
                ariaLabel: "Volume",
                className: "fixture-slider",
                "onUpdate:modelValue": (value: number) => {
                  sliderValue.value = value;
                },
                onChange: (value: number) => {
                  sliderChanges.push(value);
                },
              })
            : null,
          h(Slider, {
            id: "slider-plain",
            defaultValue: 10,
            className: "fixture-slider-plain",
            ariaLabel: "Plain slider",
          }),
        ]),

        /* ================= v0.2：有控制器的复合控件 ================= */
        h("div", { id: "segmented-host", class: "fixture-section" }, [
          showSegmented.value
            ? h(SegmentedControl, {
                id: "segmented-main",
                options: segOptions,
                modelValue: segValue.value,
                ariaLabel: "Interval",
                "onUpdate:modelValue": (value: string) => {
                  segValue.value = value;
                },
                onChange: (value: string, option?: SegmentedOption) => {
                  segChanges.push({ value, option });
                },
              })
            : null,
          h(KeepAlive, null, {
            default: () =>
              showKeptSeg.value
                ? h(SegmentedControl, {
                    id: "segmented-kept",
                    options: segOptions,
                    modelValue: keptSegValue.value,
                    "onUpdate:modelValue": (value: string) => {
                      keptSegValue.value = value;
                    },
                  })
                : null,
          }),
        ]),

        h("div", { id: "tabs-host", class: "fixture-section" }, [
          showTabs.value
            ? h(
                Tabs,
                {
                  id: "tabs-main",
                  items: tabItems,
                  modelValue: tabsValue.value,
                  ariaLabel: "Sections",
                  // 本页主题是 macOS，令牌默认 --tabs-arrow-mode: none；
                  // 这里显式要 select 模式来验证方向键分档
                  style: { "--tabs-arrow-mode": "select" },
                  "onUpdate:modelValue": (value: string) => {
                    tabsValue.value = value;
                  },
                  onChange: (value: string, index: number) => {
                    tabsChanges.push({ value, index });
                  },
                },
                {
                  default: () => [
                    h("p", { id: "panel-general" }, "General settings live here."),
                    h("p", { id: "panel-advanced" }, "Advanced settings live here."),
                    h("p", { id: "panel-about" }, "About this window."),
                  ],
                }
              )
            : null,
          // 第二个实例验证 --tabs-arrow-mode: focus（方向键只移焦点、Enter 确认）
          h(
            Tabs,
            {
              id: "tabs-focus",
              items: tabItems,
              modelValue: tabsFocusValue.value,
              ariaLabel: "Focus mode sections",
              style: { "--tabs-arrow-mode": "focus" },
              "onUpdate:modelValue": (value: string) => {
                tabsFocusValue.value = value;
              },
            },
            {
              default: () => [
                h("p", null, "Focus panel 1"),
                h("p", null, "Focus panel 2"),
                h("p", null, "Focus panel 3"),
              ],
            }
          ),
        ]),

        showTooltipProvider.value
          ? h(TooltipProvider, null, {
              default: () => [
                h(
                  Tooltip,
                  { text: "Saves your changes" },
                  {
                    default: () =>
                      h("button", { id: "tip-save", type: "button", class: "btn" }, "Save"),
                  }
                ),
                h(
                  Tooltip,
                  { text: "Another tip" },
                  {
                    // 包一层 DialectButton：验证 cloneVNode 对组件 vnode 也生效，
                    // data-tooltip 通过 Button 的 attrs 落到真正的 <button> 上
                    default: () => h(Button, { id: "tip-other" }, () => "Other"),
                  }
                ),
              ],
            })
          : null,

        h("div", { id: "menu-host", class: "fixture-section" }, [
          showMenu.value
            ? h(
                Menu,
                {
                  id: "menu-main",
                  role: "menu",
                  ariaLabel: "Actions",
                  items: menuItems,
                  onSelect: (entry: MenuEntry, index: number) => {
                    menuSelections.push({ entry, index });
                  },
                },
                {
                  trigger: () =>
                    h("button", { id: "menu-trigger", type: "button", class: "btn" }, "Actions"),
                }
              )
            : null,
        ]),

        h("div", { id: "context-host", class: "fixture-section" }, [
          h(
            ContextMenu,
            {
              id: "context-main",
              tabindex: 0,
              ariaLabel: "Right-click actions",
              items: contextItems,
              onSelect: (entry: MenuEntry, index: number) => {
                contextSelections.push({ entry, index });
              },
            },
            {
              default: () =>
                h(
                  "div",
                  {
                    id: "context-area",
                    class: "fixture-context",
                    tabindex: 0,
                    style: "padding: 12px; border: 1px dashed currentColor",
                  },
                  "Right-click here"
                ),
            }
          ),
        ]),

        h("div", { id: "window-host", class: "fixture-section" }, [
          showWindow.value
            ? [
                h(
                  Window,
                  {
                    id: "window-win11",
                    frame: "win11",
                    title: "Settings",
                    onAction: (action: string, event: Event) => {
                      windowActions.push({ action, event });
                    },
                    onContextmenu: (detail: unknown, event: Event) => {
                      windowContextMenus.push({ detail, event });
                    },
                  },
                  { default: () => h("p", { id: "window-win11-body" }, "win11 body") }
                ),
                h(
                  Window,
                  { id: "window-winxp", frame: "winxp", title: "Display Properties" },
                  { default: () => h("p", null, "xp body") }
                ),
                h(
                  Window,
                  { id: "window-macos", frame: "macos", title: "Settings" },
                  { default: () => h("p", null, "mac body") }
                ),
                h(
                  Window,
                  { id: "window-gnome", frame: "gnome", title: "Settings" },
                  { default: () => h("p", null, "gnome body") }
                ),
                h(
                  Window,
                  {
                    id: "window-close-only",
                    frame: "win11",
                    title: "Close only",
                    controls: ["close"],
                  },
                  { default: () => h("p", null, "close only body") }
                ),
              ]
            : null,
        ]),

        // 给断言用的「强制父组件重渲染」开关
        h("div", { id: "render-probe", "data-tick": probe.value }),
      ]
    );
  },
}).mount("#app");

/* ---------- 断言 ---------- */
(async function run() {
  try {
    await settle();

    /* ===== Theme ===== */
    const themeRoot = document.getElementById("theme-root") as HTMLElement;
    check("Theme 渲染 data-theme", () => themeRoot?.getAttribute("data-theme") === "macos");
    check("Theme 渲染 data-mode", () => themeRoot?.getAttribute("data-mode") === "light");
    check("Theme attrs 透传 class", () => themeRoot?.classList.contains("fixture-theme") === true);

    /* ===== Button ===== */
    const btnDefault = document.getElementById("btn-default") as HTMLButtonElement;
    const btnPrimary = document.getElementById("btn-primary") as HTMLButtonElement;
    const btnDisabled = document.getElementById("btn-disabled") as HTMLButtonElement;

    check("Button 渲染 .btn 且默认不带 btn--primary", () => {
      return (
        btnDefault.tagName === "BUTTON" &&
        btnDefault.classList.contains("btn") &&
        !btnDefault.classList.contains("btn--primary")
      );
    });
    check("Button type 默认 button", () => btnDefault.getAttribute("type") === "button");
    check("Button class 合并透传", () => btnDefault.classList.contains("fixture-btn"));
    check("Button variant=primary 加 btn--primary", () => {
      return (
        btnPrimary.classList.contains("btn") &&
        btnPrimary.classList.contains("btn--primary")
      );
    });
    check("Button disabled 落到原生 button", () => {
      return btnDisabled.disabled && btnDisabled.hasAttribute("disabled");
    });

    btnDefault.click();
    btnPrimary.click();
    await settle();
    check("Button 原生 click 透传", () => clickCount.value === 2);

    btnDisabled.click();
    await settle();
    check("Button disabled 不触发 click", () => disabledClickCount.value === 0);

    /* ===== TextField ===== */
    const textInput = document.getElementById("text-single") as HTMLInputElement;
    const field = textInput.closest("label.field") as HTMLLabelElement | null;
    const fieldLabel = field?.querySelector(":scope > .field__label") as HTMLElement | null;
    const fieldWrap = textInput.parentElement as HTMLElement;

    check("TextField 渲染 label.field 外壳", () => {
      return !!field && field.tagName === "LABEL" && field.classList.contains("field");
    });
    check("TextField 渲染 field__label", () => fieldLabel?.textContent === "Email address");
    check("TextField 渲染 .field__wrap > input.field__input", () => {
      return (
        fieldWrap.classList.contains("field__wrap") &&
        textInput.tagName === "INPUT" &&
        textInput.classList.contains("field__input")
      );
    });
    check("TextField 初始值来自 modelValue", () => textInput.value === "seed");
    check("TextField 原生属性落到 input", () => {
      return (
        textInput.placeholder === "name@example.com" &&
        textInput.name === "email" &&
        textInput.id === "text-single" &&
        textInput.getAttribute("autocomplete") === "off"
      );
    });

    textInput.value = "typed@example.com";
    textInput.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    check("输入触发 update:modelValue", () => textValue.value === "typed@example.com");

    const textarea = document.getElementById("text-multi") as HTMLTextAreaElement;
    check("multiline 渲染 textarea", () => textarea.tagName === "TEXTAREA");
    check("multiline 类名是 field__input + field__input--multiline", () => {
      return (
        textarea.classList.contains("field__input") &&
        textarea.classList.contains("field__input--multiline")
      );
    });
    check("multiline rows 生效", () => textarea.rows === 3);
    check("multiline 共用 label.field 外壳", () => {
      const multiLabel = textarea
        .closest("label.field")
        ?.querySelector(":scope > .field__label");
      return multiLabel?.textContent === "Notes";
    });

    /* ===== Select：结构与初始状态 ===== */
    let selectRoot = document.getElementById("select-main") as HTMLElement;
    const buttonOf = (root: HTMLElement) =>
      root.querySelector(".select__button") as HTMLButtonElement;
    const menuOf = (root: HTMLElement) => root.querySelector(".menu") as HTMLElement;
    const itemsOf = (root: HTMLElement) =>
      Array.from(root.querySelectorAll(".menu__item")) as HTMLElement[];
    const valueOf = (root: HTMLElement) =>
      root.querySelector(".select__value") as HTMLElement;

    check("Select 根节点是 .select 且 className 合并", () => {
      return (
        selectRoot.tagName === "DIV" &&
        selectRoot.classList.contains("select") &&
        selectRoot.classList.contains("fixture-select") &&
        selectRoot.id === "select-main"
      );
    });
    check("Select 按钮结构与静态站一致", () => {
      const button = buttonOf(selectRoot);
      return (
        button.tagName === "BUTTON" &&
        button.getAttribute("type") === "button" &&
        button.firstElementChild === valueOf(selectRoot) &&
        !!button.querySelector(".select__chevron > .select__chevron-up") &&
        !!button.querySelector(".select__chevron > .select__chevron-down")
      );
    });
    check("Select 菜单是 ul.menu[popover=manual]", () => {
      const menu = menuOf(selectRoot);
      return (
        menu.tagName === "UL" &&
        menu.classList.contains("menu") &&
        menu.getAttribute("popover") === "manual"
      );
    });
    check("Select 选项数量与文案来自 options", () => {
      const items = itemsOf(selectRoot);
      return (
        items.length === options.length &&
        items.every((item, i) => item.textContent === options[i].label)
      );
    });
    check("Select 不渲染 data-select / data-menu", () => {
      return (
        !selectRoot.hasAttribute("data-select") &&
        !selectRoot.hasAttribute("data-menu") &&
        !menuOf(selectRoot).hasAttribute("data-menu")
      );
    });
    check("Select 初始选中 modelValue=b", () => {
      const items = itemsOf(selectRoot);
      return (
        valueOf(selectRoot).textContent === "Option B" &&
        items[1].getAttribute("aria-selected") === "true" &&
        items[0].getAttribute("aria-selected") === "false"
      );
    });
    check("Select 初始 aria-expanded=false", () => {
      return buttonOf(selectRoot).getAttribute("aria-expanded") === "false";
    });
    check("控制器挂载后补 listbox 语义", () => {
      const menu = menuOf(selectRoot);
      const button = buttonOf(selectRoot);
      const items = itemsOf(selectRoot);
      return (
        menu.getAttribute("role") === "listbox" &&
        button.getAttribute("aria-haspopup") === "listbox" &&
        button.getAttribute("aria-controls") === menu.id &&
        items[0].getAttribute("role") === "option"
      );
    });
    check("disabled 选项渲染 aria-disabled", () => {
      const items = itemsOf(selectRoot);
      return (
        items[2].getAttribute("aria-disabled") === "true" &&
        !items[3].hasAttribute("aria-disabled")
      );
    });
    check("ariaLabel 落到按钮", () => {
      return buttonOf(selectRoot).getAttribute("aria-label") === "Choose an option";
    });

    /* ===== Select：点击打开 → 选择 → 子到父 ===== */
    buttonOf(selectRoot).click();
    await settle();
    check("点击打开菜单", () => {
      return (
        menuOf(selectRoot).matches(":popover-open") &&
        buttonOf(selectRoot).getAttribute("aria-expanded") === "true" &&
        buttonOf(selectRoot).classList.contains("is-open")
      );
    });
    check("打开时高亮当前选中项", () => {
      return itemsOf(selectRoot)[1].classList.contains("is-active");
    });
    check("打开触发 update:open(true)", () => {
      return openEvents[openEvents.length - 1] === true;
    });

    itemsOf(selectRoot)[0].click();
    await settle();
    check("选择后按钮文字更新", () => valueOf(selectRoot).textContent === "Option A");
    check("选择后 aria-selected 跟随", () => {
      const items = itemsOf(selectRoot);
      return (
        items[0].getAttribute("aria-selected") === "true" &&
        items[1].getAttribute("aria-selected") === "false"
      );
    });
    check("选择后菜单关闭且 aria-expanded=false", () => {
      return (
        !menuOf(selectRoot).matches(":popover-open") &&
        buttonOf(selectRoot).getAttribute("aria-expanded") === "false" &&
        !buttonOf(selectRoot).classList.contains("is-open")
      );
    });
    check("子选择 → 父 v-model 同步", () => selectValue.value === "a");
    check("change 事件带回 option.value", () => {
      return changeEvents[changeEvents.length - 1] === "a";
    });
    check("关闭触发 update:open(false)", () => {
      return openEvents[openEvents.length - 1] === false;
    });

    /* ===== Select：父改值 → DOM 同步（watch + ctrl.select silent） ===== */
    selectValue.value = "d";
    await settle();
    check("父改 modelValue → 按钮文字同步", () => {
      return valueOf(selectRoot).textContent === "Option D";
    });
    check("父改 modelValue → aria-selected 同步", () => {
      const items = itemsOf(selectRoot);
      return (
        items[3].getAttribute("aria-selected") === "true" &&
        items[0].getAttribute("aria-selected") === "false"
      );
    });

    /* ===== Select：键盘模型来自 core（适配层不自己实现） ===== */
    press(buttonOf(selectRoot), "ArrowDown");
    await settle();
    check("方向键打开菜单", () => menuOf(selectRoot).matches(":popover-open"));
    check("打开时高亮当前值 D", () => {
      return itemsOf(selectRoot)[3].classList.contains("is-active");
    });
    press(buttonOf(selectRoot), "ArrowDown");
    await settle();
    check("方向键移动高亮（跳过 disabled 项）", () => {
      return itemsOf(selectRoot)[0].classList.contains("is-active");
    });
    press(buttonOf(selectRoot), "Enter");
    await settle();
    check("回车选中并关闭", () => {
      return (
        valueOf(selectRoot).textContent === "Option A" &&
        !menuOf(selectRoot).matches(":popover-open") &&
        selectValue.value === "a"
      );
    });

    /* ===== Select：Esc 关闭 ===== */
    buttonOf(selectRoot).click();
    await settle();
    check("Esc 前菜单已打开", () => menuOf(selectRoot).matches(":popover-open"));
    press(buttonOf(selectRoot), "Escape");
    await settle();
    check("Esc 关闭菜单", () => {
      return (
        !menuOf(selectRoot).matches(":popover-open") &&
        buttonOf(selectRoot).getAttribute("aria-expanded") === "false"
      );
    });

    /* ===== Select：disabled 选项点不动 ===== */
    buttonOf(selectRoot).click();
    await settle();
    itemsOf(selectRoot)[2].click();
    await settle();
    check("点击 disabled 选项不改变选中", () => {
      return (
        selectValue.value === "a" &&
        menuOf(selectRoot).matches(":popover-open") &&
        itemsOf(selectRoot)[2].getAttribute("aria-selected") === "false"
      );
    });
    press(buttonOf(selectRoot), "Escape");
    await settle();

    /* ===== Select：卸载清理 + 重新挂载 ===== */
    const oldRoot = selectRoot;
    const oldButton = buttonOf(oldRoot);
    showSelect.value = false;
    await settle();
    check("卸载后节点脱离文档", () => !oldRoot.isConnected);
    check("卸载后 core 控制器标记清除", () => {
      return (oldRoot as unknown as { _select?: unknown })._select == null;
    });
    check("卸载后按钮状态复位", () => {
      return (
        oldButton.getAttribute("aria-expanded") === "false" &&
        !oldButton.classList.contains("is-open")
      );
    });

    showSelect.value = true;
    await settle();
    selectRoot = document.getElementById("select-main") as HTMLElement;
    check("重新挂载后按 modelValue 恢复选中", () => {
      return (
        valueOf(selectRoot).textContent === "Option A" &&
        itemsOf(selectRoot)[0].getAttribute("aria-selected") === "true"
      );
    });
    buttonOf(selectRoot).click();
    await settle();
    check("重新挂载后控制器仍可打开（未重复绑定）", () => {
      return menuOf(selectRoot).matches(":popover-open");
    });
    buttonOf(selectRoot).click();
    await settle();
    check("重新挂载后点击可正常关闭", () => {
      return !menuOf(selectRoot).matches(":popover-open");
    });

    /* ===== Select：keep-alive 反复失活 / 激活 ===== */
    const keptRoot = document.getElementById("select-kept") as HTMLElement;
    check("keep-alive Select 初始挂载并按 modelValue 选中", () => {
      return valueOf(keptRoot).textContent === "Option B";
    });
    buttonOf(keptRoot).click();
    await settle();
    check("keep-alive Select 可以打开", () => menuOf(keptRoot).matches(":popover-open"));

    showKeptSelect.value = false;
    await settle();
    check("keep-alive 失活后关闭弹层并销毁控制器", () => {
      const marker = (keptRoot as unknown as { _select?: unknown })._select;
      return marker == null && !menuOf(keptRoot).matches(":popover-open");
    });

    showKeptSelect.value = true;
    await settle();
    const keptRootAfter = document.getElementById("select-kept") as HTMLElement;
    check("keep-alive 激活后控制器重新创建", () => {
      return (keptRootAfter as unknown as { _select?: unknown })._select != null;
    });
    buttonOf(keptRootAfter).click();
    await settle();
    check("keep-alive 激活后仍可打开", () => menuOf(keptRootAfter).matches(":popover-open"));
    press(buttonOf(keptRootAfter), "Escape");
    await settle();
    check("keep-alive 激活后仍可 Esc 关闭", () => {
      return !menuOf(keptRootAfter).matches(":popover-open");
    });

    /* ===== Select：disabled 态 ===== */
    const disabledRoot = document.getElementById("select-disabled") as HTMLElement;
    check("disabled Select 按钮禁用", () => buttonOf(disabledRoot).disabled === true);
    buttonOf(disabledRoot).click();
    await settle();
    check("disabled Select 点不开菜单", () => {
      return !menuOf(disabledRoot).matches(":popover-open");
    });

    /* ============================================================
       v0.2：Checkbox
       ============================================================ */
    const cbControlledEl = document.getElementById("check-controlled") as HTMLInputElement;
    const cbControlledLabel = cbControlledEl.closest("label") as HTMLLabelElement;

    check("Checkbox 结构：label.check > input.check__input", () => {
      return (
        cbControlledLabel.tagName === "LABEL" &&
        cbControlledLabel.classList.contains("check") &&
        cbControlledEl.tagName === "INPUT" &&
        cbControlledEl.classList.contains("check__input") &&
        cbControlledEl.type === "checkbox"
      );
    });
    check("Checkbox 装饰结构：box > svg.check__mark(path) + check__label", () => {
      const box = cbControlledLabel.querySelector(":scope > .check__box");
      const mark = box?.querySelector(":scope > svg.check__mark");
      const path = mark?.querySelector("path");
      const text = cbControlledLabel.querySelector(":scope > .check__label");
      return (
        !!box &&
        box.tagName === "SPAN" &&
        !!mark &&
        mark.getAttribute("viewBox") === "0 0 20 20" &&
        mark.getAttribute("aria-hidden") === "true" &&
        path?.getAttribute("d") === "M5.2 10.3 L8 14 L13.5 5.7" &&
        text?.textContent === "Send me a copy"
      );
    });
    check("Checkbox 原生 attrs 落 input、class 落 label", () => {
      return (
        cbControlledEl.id === "check-controlled" &&
        !cbControlledLabel.id &&
        cbControlledLabel.classList.contains("check") &&
        cbControlledLabel.classList.contains("fixture-check")
      );
    });
    check("Checkbox 受控初值来自 checked", () => cbControlledEl.checked === true);

    cbControlledEl.click();
    await nextTick();
    check("Checkbox 受控：点击同步父 v-model", () => {
      return cbControlled.value === false && cbControlledEl.checked === false;
    });
    check("Checkbox 受控：emit update:checked 携带新值", () => {
      return cbControlledEvents[0] === false;
    });
    cbControlledEl.click();
    await nextTick();
    check("Checkbox 受控：再次点击恢复", () => {
      return cbControlled.value === true && cbControlledEl.checked === true;
    });

    const cbRejectedEl = document.getElementById("check-rejected") as HTMLInputElement;
    cbRejectedEl.click();
    await nextTick();
    check("Checkbox 受控：父不回写时拨回 props（类 React 行为）", () => {
      return cbRejectedEl.checked === false;
    });

    const cbUncontrolledEl = document.getElementById("check-uncontrolled") as HTMLInputElement;
    check("Checkbox 非受控：defaultChecked 生效", () => cbUncontrolledEl.checked === true);
    cbUncontrolledEl.click();
    await nextTick();
    check("Checkbox 非受控：点击由浏览器维护", () => {
      return cbUncontrolledEl.checked === false && cbUncontrolledEvents[0] === false;
    });
    probe.value += 1;
    await nextTick();
    check("Checkbox 非受控：父组件无关重渲染不覆盖用户状态", () => {
      return cbUncontrolledEl.checked === false;
    });

    const cbDisabledEl = document.getElementById("check-disabled") as HTMLInputElement;
    check("Checkbox disabled 落原生 input", () => cbDisabledEl.disabled === true);

    /* ============================================================
       v0.2：Radio（同组互斥）
       ============================================================ */
    const radioLight = document.getElementById("radio-light") as HTMLInputElement;
    const radioDark = document.getElementById("radio-dark") as HTMLInputElement;
    const radioAuto = document.getElementById("radio-auto") as HTMLInputElement;
    const radioLabel = radioLight.closest("label") as HTMLLabelElement;

    check("Radio 结构：label.radio > input.radio__input + radio__dot + radio__label", () => {
      return (
        radioLabel.classList.contains("radio") &&
        radioLight.classList.contains("radio__input") &&
        radioLight.type === "radio" &&
        !!radioLabel.querySelector(":scope > .radio__dot") &&
        radioLabel.querySelector(":scope > .radio__label")?.textContent === "Light"
      );
    });
    check("Radio 同组共用 name", () => {
      return (
        radioLight.name === "fixture-mode" &&
        radioDark.name === "fixture-mode" &&
        radioAuto.name === "fixture-mode"
      );
    });
    check("Radio 初始选中来自受控值", () => {
      return radioLight.checked && !radioDark.checked && !radioAuto.checked;
    });

    radioDark.click();
    await nextTick();
    check("Radio 同组互斥：选 Dark 后 Light 取消", () => {
      return (
        radioDark.checked &&
        !radioLight.checked &&
        radioPick.value === "dark" &&
        radioEvents[radioEvents.length - 1] === "dark"
      );
    });
    radioAuto.click();
    await nextTick();
    check("Radio 同组互斥：选 Auto 后 Dark 取消", () => {
      return radioAuto.checked && !radioDark.checked && radioPick.value === "auto";
    });

    /* ============================================================
       v0.2：Switch
       ============================================================ */
    const switchControlledEl = document.getElementById("switch-controlled") as HTMLInputElement;
    const switchControlledLabel = switchControlledEl.closest("label") as HTMLLabelElement;

    check("Switch 结构：track > knob + switch__label", () => {
      const track = switchControlledLabel.querySelector(":scope > .switch__track");
      return (
        switchControlledLabel.classList.contains("switch") &&
        switchControlledEl.classList.contains("switch__input") &&
        switchControlledEl.type === "checkbox" &&
        !!track &&
        !!track.querySelector(":scope > .switch__knob") &&
        switchControlledLabel.querySelector(":scope > .switch__label")?.textContent === "Wi-Fi"
      );
    });
    check("Switch 受控初值", () => switchControlledEl.checked === false);
    switchControlledEl.click();
    await nextTick();
    check("Switch 受控：点击同步父 v-model", () => {
      return switchOn.value === true && switchControlledEl.checked === true;
    });
    check("Switch 受控：emit update:checked", () => switchEvents[0] === true);

    const switchUncontrolledEl = document.getElementById("switch-uncontrolled") as HTMLInputElement;
    check("Switch 非受控：defaultChecked 生效", () => switchUncontrolledEl.checked === true);
    switchUncontrolledEl.click();
    await nextTick();
    check("Switch 非受控：点击由浏览器维护", () => {
      return switchUncontrolledEl.checked === false && switchUncontrolledEvents[0] === false;
    });
    probe.value += 1;
    await nextTick();
    check("Switch 非受控：父重渲染不覆盖用户状态", () => {
      return switchUncontrolledEl.checked === false;
    });

    /* ============================================================
       v0.2：Progress
       ============================================================ */
    const progressEl = document.getElementById("progress-main") as HTMLElement;
    const progressHalfEl = document.getElementById("progress-half") as HTMLElement;
    const progressIndetEl = document.getElementById("progress-indeterminate") as HTMLElement;

    check("Progress 根节点结构（role / class / 子节点）", () => {
      return (
        progressEl.tagName === "DIV" &&
        progressEl.classList.contains("progress") &&
        progressEl.classList.contains("fixture-progress") &&
        progressEl.getAttribute("role") === "progressbar" &&
        !!progressEl.querySelector(":scope > .progress__fill")
      );
    });
    check("Progress 确定态 ARIA 与 --progress-value", () => {
      return (
        progressEl.getAttribute("aria-valuemin") === "0" &&
        progressEl.getAttribute("aria-valuemax") === "100" &&
        progressEl.getAttribute("aria-valuenow") === "40" &&
        progressEl.style.getPropertyValue("--progress-value").trim() === "40%" &&
        !progressEl.hasAttribute("data-indeterminate")
      );
    });
    check("Progress aria-label 落在根节点", () => {
      return progressEl.getAttribute("aria-label") === "Upload progress";
    });
    check("Progress 按 max 折算百分比", () => {
      return (
        progressHalfEl.getAttribute("aria-valuemax") === "200" &&
        progressHalfEl.getAttribute("aria-valuenow") === "50" &&
        progressHalfEl.style.getPropertyValue("--progress-value").trim() === "25%"
      );
    });
    check("Progress 不确定态：不写 valuenow、写 data-indeterminate", () => {
      return (
        progressIndetEl.getAttribute("role") === "progressbar" &&
        progressIndetEl.hasAttribute("data-indeterminate") &&
        !progressIndetEl.hasAttribute("aria-valuenow") &&
        progressIndetEl.getAttribute("aria-label") === "Loading" &&
        progressIndetEl.style.getPropertyValue("--progress-value").trim() === ""
      );
    });

    /* ============================================================
       v0.2：Slider（行为来自 core createSlider）
       ============================================================ */
    let sliderEl = document.getElementById("slider-main") as HTMLInputElement;
    check("Slider 结构：slider-row > input.slider + span.slider__value", () => {
      const row = sliderEl.closest(".slider-row") as HTMLElement | null;
      return (
        !!row &&
        row.classList.contains("fixture-slider") &&
        row.querySelector(":scope > .slider__value")?.textContent === "40" &&
        sliderEl.type === "range" &&
        sliderEl.classList.contains("slider") &&
        sliderEl.min === "0" &&
        sliderEl.max === "100" &&
        sliderEl.step === "1" &&
        sliderEl.value === "40" &&
        sliderEl.getAttribute("aria-label") === "Volume"
      );
    });
    check("Slider 控制器已挂载（_sliderKeys）", () => {
      return (sliderEl as unknown as { _sliderKeys?: unknown })._sliderKeys != null;
    });

    press(sliderEl, "Home");
    await nextTick();
    check("Slider Home 到最小值并回传", () => {
      return (
        sliderEl.value === "0" &&
        sliderValue.value === 0 &&
        sliderChanges[sliderChanges.length - 1] === 0
      );
    });
    check("Slider 数值标签跟随受控值", () => {
      const row = sliderEl.closest(".slider-row") as HTMLElement;
      return row.querySelector(".slider__value")?.textContent === "0";
    });
    press(sliderEl, "End");
    await nextTick();
    check("Slider End 到最大值并回传", () => {
      return (
        sliderEl.value === "100" &&
        sliderValue.value === 100 &&
        sliderChanges[sliderChanges.length - 1] === 100
      );
    });

    sliderValue.value = 25;
    await nextTick();
    check("Slider 父改 modelValue → input 与标签同步", () => {
      const row = sliderEl.closest(".slider-row") as HTMLElement;
      return sliderEl.value === "25" && row.querySelector(".slider__value")?.textContent === "25";
    });

    const oldSlider = sliderEl;
    showSlider.value = false;
    await settle();
    check("Slider 卸载清理：_sliderKeys 清除", () => {
      return (
        (oldSlider as unknown as { _sliderKeys?: unknown })._sliderKeys == null &&
        !oldSlider.isConnected
      );
    });
    showSlider.value = true;
    await nextTick();
    sliderEl = document.getElementById("slider-main") as HTMLInputElement;
    check("Slider 重新挂载：控制器重建且值按 modelValue 恢复", () => {
      return (
        (sliderEl as unknown as { _sliderKeys?: unknown })._sliderKeys != null &&
        sliderEl.value === "25"
      );
    });

    const plainSlider = document.getElementById("slider-plain") as HTMLInputElement;
    check("Slider showValue=false 时根就是 input，class 落 input", () => {
      return (
        plainSlider.tagName === "INPUT" &&
        plainSlider.classList.contains("slider") &&
        plainSlider.classList.contains("fixture-slider-plain") &&
        plainSlider.closest(".slider-row") === null &&
        plainSlider.value === "10" &&
        plainSlider.getAttribute("aria-label") === "Plain slider"
      );
    });

    /* ============================================================
       v0.2：SegmentedControl
       ============================================================ */
    let segRoot = document.getElementById("segmented-main") as HTMLElement;
    const segButtons = () =>
      Array.from(segRoot.querySelectorAll(".segmented__item")) as HTMLButtonElement[];

    check("Segmented 结构：radiogroup + role=radio + data-value", () => {
      const buttons = segButtons();
      return (
        segRoot.classList.contains("segmented") &&
        segRoot.getAttribute("role") === "radiogroup" &&
        segRoot.getAttribute("aria-label") === "Interval" &&
        buttons.length === segOptions.length &&
        buttons.every((button, i) => {
          return (
            button.tagName === "BUTTON" &&
            button.type === "button" &&
            button.classList.contains("segmented__item") &&
            button.getAttribute("role") === "radio" &&
            button.getAttribute("data-value") === segOptions[i].value
          );
        })
      );
    });
    check("Segmented 初始 aria-checked 来自 modelValue", () => {
      const buttons = segButtons();
      return (
        buttons[0].getAttribute("aria-checked") === "true" &&
        buttons[1].getAttribute("aria-checked") === "false"
      );
    });
    check("Segmented 控制器补 roving tabindex", () => {
      const buttons = segButtons();
      return (
        (segRoot as unknown as { _segmented?: unknown })._segmented != null &&
        buttons[0].tabIndex === 0 &&
        buttons[1].tabIndex === -1
      );
    });
    check("Segmented 不渲染 data-segmented 自动初始化标记", () => {
      return !segRoot.hasAttribute("data-segmented");
    });
    check("Segmented disabled 选项落原生 disabled", () => segButtons()[2].disabled === true);

    segButtons()[1].click();
    await nextTick();
    check("Segmented 点击选择并回传", () => {
      return (
        segValue.value === "week" &&
        segButtons()[1].getAttribute("aria-checked") === "true" &&
        segButtons()[0].getAttribute("aria-checked") === "false" &&
        segChanges[segChanges.length - 1]?.value === "week" &&
        segChanges[segChanges.length - 1]?.option?.label === "Week"
      );
    });
    press(segButtons()[1], "ArrowRight");
    await nextTick();
    check("Segmented 方向键移动并跳过 disabled", () => {
      return (
        segValue.value === "quarter" &&
        segButtons()[3].getAttribute("aria-checked") === "true" &&
        segButtons()[2].getAttribute("aria-checked") === "false"
      );
    });
    press(segButtons()[3], "Home");
    await nextTick();
    check("Segmented Home 到第一个可用段", () => {
      return segValue.value === "day" && segButtons()[0].getAttribute("aria-checked") === "true";
    });
    press(segButtons()[0], "End");
    await nextTick();
    check("Segmented End 到最后一个可用段", () => {
      return (
        segValue.value === "quarter" &&
        segButtons()[3].getAttribute("aria-checked") === "true"
      );
    });

    segValue.value = "week";
    await nextTick();
    check("Segmented 父改 modelValue → 选中同步", () => {
      return (
        segButtons()[1].getAttribute("aria-checked") === "true" &&
        segButtons()[3].getAttribute("aria-checked") === "false"
      );
    });

    segButtons()[2].click();
    await nextTick();
    check("Segmented 点击 disabled 段不改变选中", () => {
      return segValue.value === "week" && segButtons()[2].getAttribute("aria-checked") === "false";
    });

    const oldSegRoot = segRoot;
    showSegmented.value = false;
    await settle();
    check("Segmented 卸载清理：_segmented 清除", () => {
      return (
        (oldSegRoot as unknown as { _segmented?: unknown })._segmented == null &&
        !oldSegRoot.isConnected
      );
    });
    showSegmented.value = true;
    await nextTick();
    segRoot = document.getElementById("segmented-main") as HTMLElement;
    check("Segmented 重新挂载：控制器重建且按 modelValue 选中", () => {
      return (
        (segRoot as unknown as { _segmented?: unknown })._segmented != null &&
        (segRoot.querySelector(".segmented__item[data-value=week]") as HTMLElement).getAttribute(
          "aria-checked"
        ) === "true"
      );
    });

    /* Segmented：keep-alive 反复失活 / 激活 */
    const keptSegRoot = document.getElementById("segmented-kept") as HTMLElement;
    check("keep-alive Segmented 初始挂载并按 modelValue 选中", () => {
      return (
        (keptSegRoot as unknown as { _segmented?: unknown })._segmented != null &&
        keptSegRoot.querySelector('[data-value="week"]')?.getAttribute("aria-checked") === "true"
      );
    });
    (keptSegRoot.querySelector('[data-value="quarter"]') as HTMLButtonElement).click();
    await nextTick();
    check("keep-alive Segmented 可以切换", () => keptSegValue.value === "quarter");

    showKeptSeg.value = false;
    await settle();
    check("keep-alive Segmented 失活后销毁控制器", () => {
      return (keptSegRoot as unknown as { _segmented?: unknown })._segmented == null;
    });
    showKeptSeg.value = true;
    await settle();
    const keptSegAfter = document.getElementById("segmented-kept") as HTMLElement;
    check("keep-alive Segmented 激活后控制器重建且选中保持", () => {
      return (
        (keptSegAfter as unknown as { _segmented?: unknown })._segmented != null &&
        keptSegAfter.querySelector('[data-value="quarter"]')?.getAttribute("aria-checked") ===
          "true"
      );
    });

    /* ============================================================
       v0.2：Tabs
       ============================================================ */
    let tabsRoot = document.getElementById("tabs-main") as HTMLElement;
    const tabButtons = () =>
      Array.from(tabsRoot.querySelectorAll(".tabs__tab")) as HTMLButtonElement[];
    const tabPanels = () =>
      Array.from(tabsRoot.querySelectorAll(".tabs__panel")) as HTMLElement[];

    check("Tabs 结构：tabs__list[tablist] > tabs__tab[tab] + tabs__panel", () => {
      const list = tabsRoot.querySelector(":scope > .tabs__list") as HTMLElement;
      const buttons = tabButtons();
      const panels = tabPanels();
      return (
        tabsRoot.classList.contains("tabs") &&
        !!list &&
        list.getAttribute("role") === "tablist" &&
        list.getAttribute("aria-label") === "Sections" &&
        buttons.length === tabItems.length &&
        buttons.every((button, i) => {
          return (
            button.tagName === "BUTTON" &&
            button.type === "button" &&
            button.classList.contains("tabs__tab") &&
            button.getAttribute("role") === "tab" &&
            button.getAttribute("data-value") === tabItems[i].value
          );
        }) &&
        panels.length === tabItems.length &&
        panels.every((panel) => panel.classList.contains("tabs__panel"))
      );
    });
    check("Tabs 不渲染 data-tabs 自动初始化标记", () => !tabsRoot.hasAttribute("data-tabs"));
    check("Tabs 初始 aria-selected / hidden", () => {
      const buttons = tabButtons();
      const panels = tabPanels();
      return (
        buttons[0].getAttribute("aria-selected") === "true" &&
        buttons[1].getAttribute("aria-selected") === "false" &&
        panels[0].hidden === false &&
        panels[1].hidden === true &&
        panels[2].hidden === true
      );
    });
    check("Tabs 控制器补 id / aria-controls / tabpanel / roving tabindex", () => {
      const buttons = tabButtons();
      const panels = tabPanels();
      return (
        (tabsRoot as unknown as { _tabs?: unknown })._tabs != null &&
        !!buttons[0].getAttribute("aria-controls") &&
        buttons[0].getAttribute("aria-controls") === panels[0].id &&
        panels[0].getAttribute("role") === "tabpanel" &&
        panels[0].getAttribute("aria-labelledby") === buttons[0].id &&
        buttons[0].tabIndex === 0 &&
        buttons[1].tabIndex === -1
      );
    });

    tabButtons()[1].click();
    await nextTick();
    check("Tabs 点击切换 + panel hidden 跟随", () => {
      return (
        tabsValue.value === "advanced" &&
        tabButtons()[1].getAttribute("aria-selected") === "true" &&
        tabButtons()[0].getAttribute("aria-selected") === "false" &&
        tabPanels()[0].hidden === true &&
        tabPanels()[1].hidden === false &&
        tabsChanges[tabsChanges.length - 1]?.value === "advanced" &&
        tabsChanges[tabsChanges.length - 1]?.index === 1
      );
    });
    press(tabButtons()[1], "ArrowRight");
    await nextTick();
    check("Tabs 方向键切换（select 模式）", () => {
      return (
        tabsValue.value === "about" &&
        tabButtons()[2].getAttribute("aria-selected") === "true" &&
        tabPanels()[2].hidden === false
      );
    });
    press(tabButtons()[2], "Home");
    await nextTick();
    check("Tabs Home 到第一个标签", () => {
      return (
        tabsValue.value === "general" &&
        tabButtons()[0].getAttribute("aria-selected") === "true"
      );
    });

    tabsValue.value = "about";
    await nextTick();
    check("Tabs 父改 modelValue → aria-selected / panel hidden 同步", () => {
      return (
        tabButtons()[2].getAttribute("aria-selected") === "true" &&
        tabPanels()[0].hidden === true &&
        tabPanels()[2].hidden === false
      );
    });

    // --tabs-arrow-mode: focus：方向键只移焦点，Enter 才切换
    const focusRoot = document.getElementById("tabs-focus") as HTMLElement;
    const focusButtons = Array.from(
      focusRoot.querySelectorAll(".tabs__tab")
    ) as HTMLButtonElement[];
    focusButtons[0].focus();
    press(focusButtons[0], "ArrowRight");
    await nextTick();
    check("Tabs --tabs-arrow-mode=focus：方向键只移焦点", () => {
      return (
        document.activeElement === focusButtons[1] &&
        focusButtons[0].getAttribute("aria-selected") === "true" &&
        focusButtons[1].getAttribute("aria-selected") === "false"
      );
    });
    press(focusButtons[1], "Enter");
    await nextTick();
    check("Tabs --tabs-arrow-mode=focus：Enter 确认切换", () => {
      return (
        tabsFocusValue.value === "advanced" &&
        focusButtons[1].getAttribute("aria-selected") === "true"
      );
    });

    const oldTabsRoot = tabsRoot;
    showTabs.value = false;
    await settle();
    check("Tabs 卸载清理：_tabs 清除", () => {
      return (
        (oldTabsRoot as unknown as { _tabs?: unknown })._tabs == null && !oldTabsRoot.isConnected
      );
    });
    showTabs.value = true;
    await nextTick();
    tabsRoot = document.getElementById("tabs-main") as HTMLElement;
    const remountedTab = tabsRoot.querySelector(".tabs__tab") as HTMLButtonElement;
    check("Tabs 重新挂载：控制器重建并补 ARIA", () => {
      return (
        (tabsRoot as unknown as { _tabs?: unknown })._tabs != null &&
        !!remountedTab.getAttribute("aria-controls")
      );
    });

    /* ============================================================
       v0.2：TooltipProvider / Tooltip
       ============================================================ */
    let providerHost = document.querySelector(".tooltip-host") as HTMLElement;
    let tipLayer = providerHost.querySelector(".tooltip") as HTMLElement;
    const tipSave = document.getElementById("tip-save") as HTMLButtonElement;

    check("TooltipProvider 渲染 tooltip-host（display:contents）+ 提示层", () => {
      return (
        providerHost.tagName === "DIV" &&
        providerHost.classList.contains("tooltip-host") &&
        providerHost.style.display === "contents" &&
        tipLayer.tagName === "DIV" &&
        tipLayer.classList.contains("tooltip") &&
        tipLayer.getAttribute("role") === "tooltip" &&
        tipLayer.hasAttribute("data-tooltip-layer") &&
        tipLayer.hidden === true
      );
    });
    check("Tooltip 用 cloneVNode 补 data-tooltip，不产生额外节点", () => {
      const other = document.getElementById("tip-other") as HTMLElement;
      return (
        tipSave.parentElement === providerHost &&
        other.parentElement === providerHost &&
        providerHost.children.length === 3 &&
        tipSave.getAttribute("data-tooltip") === "Saves your changes" &&
        other.getAttribute("data-tooltip") === "Another tip"
      );
    });

    tipSave.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await waitFor(() => !tipLayer.hidden);
    check("Tooltip 悬停出现并写 aria-describedby", () => {
      return (
        !tipLayer.hidden &&
        tipLayer.hasAttribute("data-open") &&
        tipLayer.textContent === "Saves your changes" &&
        tipSave.getAttribute("aria-describedby") === tipLayer.id
      );
    });
    press(document, "Escape");
    await nextTick();
    check("Tooltip Esc 关闭并清掉 aria-describedby", () => {
      return (
        tipLayer.hidden &&
        !tipLayer.hasAttribute("data-open") &&
        !tipSave.hasAttribute("aria-describedby")
      );
    });

    tipSave.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await waitFor(() => !tipLayer.hidden);
    check("Tooltip 再次悬停可重新出现", () => !tipLayer.hidden);
    window.dispatchEvent(new Event("scroll"));
    check("Tooltip 滚动关闭", () => tipLayer.hidden && !tipSave.hasAttribute("aria-describedby"));

    tipSave.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await waitFor(() => !tipLayer.hidden);
    tipSave.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: null }));
    await waitFor(() => tipLayer.hidden);
    check("Tooltip 移开鼠标后关闭", () => tipLayer.hidden);

    const oldTipLayer = tipLayer;
    showTooltipProvider.value = false;
    await nextTick();
    check("TooltipProvider 卸载清理：_tooltip 清除", () => {
      return (
        (oldTipLayer as unknown as { _tooltip?: unknown })._tooltip == null &&
        !oldTipLayer.isConnected
      );
    });
    showTooltipProvider.value = true;
    await nextTick();
    providerHost = document.querySelector(".tooltip-host") as HTMLElement;
    tipLayer = providerHost.querySelector(".tooltip") as HTMLElement;
    check("TooltipProvider 重新挂载：控制器重建", () => {
      return (tipLayer as unknown as { _tooltip?: unknown })._tooltip != null;
    });

    /* ============================================================
       v0.2：Menu
       ============================================================ */
    let menuRoot = document.getElementById("menu-main") as HTMLElement;
    let menuTrigger = document.getElementById("menu-trigger") as HTMLButtonElement;
    let menuEl = menuRoot.querySelector(".menu") as HTMLElement;
    const menuItemsOf = () =>
      Array.from(menuEl.querySelectorAll(".menu__item")) as HTMLElement[];
    const menuSeparatorsOf = () =>
      Array.from(menuEl.querySelectorAll(".menu__separator")) as HTMLElement[];

    check("Menu 结构：menu-box > 触发器 + ul.menu[popover=manual]", () => {
      return (
        menuRoot.classList.contains("menu-box") &&
        menuTrigger.parentElement === menuRoot &&
        menuEl.tagName === "UL" &&
        menuEl.classList.contains("menu") &&
        menuEl.getAttribute("popover") === "manual" &&
        menuEl.getAttribute("role") === "menu" &&
        menuEl.getAttribute("aria-label") === "Actions"
      );
    });
    check("Menu 不渲染 data-menu 自动初始化标记", () => {
      return !menuRoot.hasAttribute("data-menu") && !menuTrigger.hasAttribute("data-menu-trigger");
    });
    check("Menu 控制器补触发器 ARIA", () => {
      return (
        menuTrigger.getAttribute("aria-haspopup") === "menu" &&
        menuTrigger.getAttribute("aria-expanded") === "false" &&
        menuTrigger.getAttribute("aria-controls") === menuEl.id
      );
    });
    check("Menu 选项 / 分隔线 / shortcut / disabled 渲染", () => {
      const items = menuItemsOf();
      const separators = menuSeparatorsOf();
      return (
        items.length === 4 &&
        separators.length === 1 &&
        separators[0].getAttribute("role") === "separator" &&
        items[0].querySelector(".menu__shortcut")?.textContent === "⌘N" &&
        items[2].getAttribute("aria-disabled") === "true" &&
        !items[0].hasAttribute("aria-disabled")
      );
    });
    check("Menu data-entry-index 映射回 items 真实下标", () => {
      const items = menuItemsOf();
      return (
        items[0].getAttribute("data-entry-index") === "0" &&
        items[1].getAttribute("data-entry-index") === "1" &&
        items[2].getAttribute("data-entry-index") === "3" &&
        items[3].getAttribute("data-entry-index") === "4"
      );
    });

    menuTrigger.click();
    await nextTick();
    check("Menu 点击触发器展开", () => {
      return (
        menuEl.matches(":popover-open") &&
        menuTrigger.getAttribute("aria-expanded") === "true"
      );
    });
    menuItemsOf()[0].click();
    await waitFor(() => menuTrigger.getAttribute("aria-expanded") === "false");
    check("Menu 选择回调带回 entry 与真实下标", () => {
      const last = menuSelections[menuSelections.length - 1];
      return (
        menuSelections.length === 1 &&
        last?.index === 0 &&
        last?.entry.label === "New" &&
        !menuEl.matches(":popover-open") &&
        menuTrigger.getAttribute("aria-expanded") === "false"
      );
    });
    check("Menu 关闭后焦点归还触发器", () => document.activeElement === menuTrigger);

    menuTrigger.click();
    await nextTick();
    menuItemsOf()[3].click();
    await waitFor(() => menuTrigger.getAttribute("aria-expanded") === "false");
    check("Menu 分隔线后的选项下标映射正确", () => {
      const last = menuSelections[menuSelections.length - 1];
      return last?.index === 4 && last?.entry.label === "Preferences";
    });

    menuTrigger.click();
    await nextTick();
    menuItemsOf()[2].click();
    await nextTick();
    check("Menu 点击 disabled 项不选择、不关闭", () => {
      return menuSelections.length === 2 && menuEl.matches(":popover-open");
    });
    press(menuEl, "Escape");
    await waitFor(() => menuTrigger.getAttribute("aria-expanded") === "false");
    await waitFor(() => document.activeElement === menuTrigger);
    check("Menu Esc 关闭并归还焦点", () => {
      return !menuEl.matches(":popover-open") && document.activeElement === menuTrigger;
    });

    press(menuTrigger, "ArrowDown");
    await nextTick();
    check("Menu 触发器方向键展开并高亮第一项", () => {
      return (
        menuEl.matches(":popover-open") && menuItemsOf()[0].classList.contains("is-active")
      );
    });
    press(menuEl, "Enter");
    await waitFor(() => menuTrigger.getAttribute("aria-expanded") === "false");
    check("Menu 键盘选择并关闭", () => {
      const last = menuSelections[menuSelections.length - 1];
      return last?.entry.label === "New" && !menuEl.matches(":popover-open");
    });

    // 展开状态下卸载：destroy 要收起弹层并清掉两处控制器标记
    menuTrigger.click();
    await nextTick();
    const oldMenuRoot = menuRoot;
    const oldMenuEl = menuEl;
    showMenu.value = false;
    await nextTick();
    check("Menu 卸载清理：收起弹层并清掉控制器标记", () => {
      return (
        (oldMenuEl as unknown as { _menuCtrl?: unknown })._menuCtrl == null &&
        (oldMenuEl as unknown as { _menuBoxCtrl?: unknown })._menuBoxCtrl == null &&
        !oldMenuEl.matches(":popover-open") &&
        !oldMenuRoot.isConnected
      );
    });
    showMenu.value = true;
    await nextTick();
    menuRoot = document.getElementById("menu-main") as HTMLElement;
    menuTrigger = document.getElementById("menu-trigger") as HTMLButtonElement;
    menuEl = menuRoot.querySelector(".menu") as HTMLElement;
    menuTrigger.click();
    await nextTick();
    check("Menu 重新挂载：控制器重建且可展开", () => {
      return menuEl.matches(":popover-open") && menuTrigger.getAttribute("aria-expanded") === "true";
    });
    press(menuEl, "Escape");
    await nextTick();

    /* ============================================================
       v0.2：ContextMenu
       ============================================================ */
    const contextContent = document.getElementById("context-main") as HTMLElement;
    const contextRoot = contextContent.closest(".menu-box") as HTMLElement;
    const contextMenu = contextRoot.querySelector(".menu") as HTMLElement;
    const contextItemsOf = () =>
      Array.from(contextMenu.querySelectorAll(".menu__item")) as HTMLElement[];

    check("ContextMenu 结构：menu-box > content + ul.menu[popover=manual]", () => {
      return (
        contextRoot.classList.contains("menu-box") &&
        contextContent.classList.contains("menu-box__content") &&
        contextContent.parentElement === contextRoot &&
        contextMenu.tagName === "UL" &&
        contextMenu.classList.contains("menu") &&
        contextMenu.getAttribute("popover") === "manual" &&
        contextMenu.getAttribute("role") === "menu"
      );
    });
    check("ContextMenu 不渲染 data-menu* 自动初始化标记", () => {
      return (
        !contextRoot.hasAttribute("data-menu") &&
        !contextContent.hasAttribute("data-menu-context")
      );
    });
    check("ContextMenu 原生 attrs（tabindex）落在右键区域", () => {
      return contextContent.tabIndex === 0;
    });

    const contextEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 20,
      clientY: 30,
    });
    const contextNotPrevented = contextContent.dispatchEvent(contextEvent);
    await nextTick();
    check("ContextMenu 右键打开并拦截浏览器菜单", () => {
      return contextNotPrevented === false && contextMenu.matches(":popover-open");
    });
    contextItemsOf()[0].click();
    await nextTick();
    check("ContextMenu 选择回调带回 entry 与下标", () => {
      const last = contextSelections[contextSelections.length - 1];
      return (
        contextSelections.length === 1 &&
        last?.index === 0 &&
        last?.entry.label === "Cut" &&
        !contextMenu.matches(":popover-open")
      );
    });

    /* ============================================================
       v0.2：Window
       ============================================================ */
    let win11 = document.getElementById("window-win11") as HTMLElement;
    const captionOf = (root: HTMLElement) =>
      Array.from(root.querySelectorAll("[data-window-action]")) as HTMLElement[];

    check("Window 根节点：.window + data-window-frame，不写 data-window", () => {
      return (
        win11.tagName === "DIV" &&
        win11.classList.contains("window") &&
        win11.getAttribute("data-window-frame") === "win11" &&
        !win11.hasAttribute("data-window")
      );
    });
    check("Window 标题栏结构：title + controls（3 个 caption）", () => {
      const bar = win11.querySelector(":scope > .window__bar") as HTMLElement;
      const title = bar.querySelector(":scope > .window__title") as HTMLElement;
      const controls = bar.querySelector(":scope > .window__controls") as HTMLElement;
      const captions = captionOf(win11);
      return (
        !!bar &&
        title.textContent === "Settings" &&
        bar.firstElementChild === title &&
        !!controls &&
        captions.length === 3 &&
        captions[0].getAttribute("data-window-action") === "minimize" &&
        captions[1].getAttribute("data-window-action") === "maximize" &&
        captions[2].getAttribute("data-window-action") === "close" &&
        captions[2].classList.contains("window__caption--close")
      );
    });
    check("Window Win11 caption 文案与 aria-label（照抄 index.html）", () => {
      const captions = captionOf(win11);
      return (
        captions[0].textContent === "–" &&
        captions[1].textContent === "□" &&
        captions[2].textContent === "✕" &&
        captions[0].getAttribute("aria-label") === "最小化" &&
        captions[1].getAttribute("aria-label") === "最大化" &&
        captions[2].getAttribute("aria-label") === "关闭"
      );
    });
    check("Window 控制器挂载（data-window-ready）", () => {
      return win11.hasAttribute("data-window-ready");
    });

    captionOf(win11)[2].click();
    await nextTick();
    check("Window 按钮派发 action 事件", () => {
      const last = windowActions[windowActions.length - 1];
      return (
        windowActions.length === 1 &&
        last?.action === "close" &&
        last?.event.type === "window:action"
      );
    });

    const winCtxEvent = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 5,
      clientY: 5,
    });
    const winBody = win11.querySelector(".window__body") as HTMLElement;
    const winCtxNotPrevented = winBody.dispatchEvent(winCtxEvent);
    check("Window 右键拦截并派发 contextmenu", () => {
      return (
        winCtxNotPrevented === false &&
        windowContextMenus.length === 1 &&
        windowContextMenus[0]?.event.type === "window:contextmenu"
      );
    });

    check("Window XP 最小化按钮是 _", () => {
      const xp = document.getElementById("window-winxp") as HTMLElement;
      return (
        xp.getAttribute("data-window-frame") === "winxp" &&
        captionOf(xp)[0].textContent === "_"
      );
    });
    check("Window macOS 交通灯结构与 glyph 路径来自 index.html", () => {
      const mac = document.getElementById("window-macos") as HTMLElement;
      const bar = mac.querySelector(":scope > .window__bar") as HTMLElement;
      const traffic = bar.querySelector(":scope > .window__traffic") as HTMLElement;
      const dots = Array.from(traffic.querySelectorAll(".window__traffic-dot")) as HTMLElement[];
      const paths = dots.map((dot) => dot.querySelector(".window__traffic-glyph > svg > path"));
      return (
        mac.getAttribute("data-window-frame") === "macos" &&
        !!traffic &&
        bar.firstElementChild === traffic &&
        bar.children[1]?.classList.contains("window__title") === true &&
        dots.length === 3 &&
        dots[0].classList.contains("window__traffic-dot--close") &&
        dots[1].classList.contains("window__traffic-dot--min") &&
        dots[2].classList.contains("window__traffic-dot--zoom") &&
        paths[0]?.getAttribute("d") === "M3.1 3.1l5.8 5.8M8.9 3.1L3.1 8.9" &&
        paths[1]?.getAttribute("d") === "M2.55 6h6.9" &&
        paths[2]?.getAttribute("d") === "M2.05 2.05v6.6L8.65 2.05zM9.95 9.95V3.35L3.35 9.95z"
      );
    });
    check("Window controls prop 控制渲染哪些按钮", () => {
      const closeOnly = document.getElementById("window-close-only") as HTMLElement;
      const captions = captionOf(closeOnly);
      return (
        captions.length === 1 && captions[0].getAttribute("data-window-action") === "close"
      );
    });
    check("Window GNOME 只有关闭按钮", () => {
      const gnome = document.getElementById("window-gnome") as HTMLElement;
      return (
        gnome.getAttribute("data-window-frame") === "gnome" &&
        captionOf(gnome).length === 1 &&
        captionOf(gnome)[0].getAttribute("data-window-action") === "close"
      );
    });

    showWindow.value = false;
    await nextTick();
    check("Window 卸载清理：_window 与 data-window-ready 清除", () => {
      return (
        (win11 as unknown as { _window?: unknown })._window == null &&
        !win11.hasAttribute("data-window-ready") &&
        !win11.isConnected
      );
    });
    showWindow.value = true;
    await nextTick();
    win11 = document.getElementById("window-win11") as HTMLElement;
    const actionCountBefore = windowActions.length;
    captionOf(win11)[2].click();
    await nextTick();
    check("Window 重新挂载：控制器重建并仍能派发 action", () => {
      return (
        win11.hasAttribute("data-window-ready") &&
        windowActions.length === actionCountBefore + 1 &&
        windowActions[windowActions.length - 1]?.action === "close"
      );
    });

    /* ===== 组件 API 收尾：全局插件注册 ===== */
    check("默认插件 install() 注册所有 DialectXxx 组件", () => {
      const app = createApp({ render: () => null });
      // 直接在空应用上装插件，读组件表，不再多挂一个根
      DialectVue.install(app);
      const names = [
        "DialectTheme",
        "DialectButton",
        "DialectTextField",
        "DialectSelect",
        "DialectCheckbox",
        "DialectRadio",
        "DialectSwitch",
        "DialectProgress",
        "DialectSlider",
        "DialectSegmentedControl",
        "DialectTabs",
        "DialectTooltipProvider",
        "DialectTooltip",
        "DialectMenu",
        "DialectContextMenu",
        "DialectWindow",
      ];
      return names.every((name) => app.component(name) != null);
    });
  } catch (error) {
    failures += 1;
    lines.push(`FAIL 测试中断 — ${(error as Error).message}`);
  }

  const summary = failures === 0 ? `ALL PASS (${lines.length})` : `FAILED ${failures}`;
  resultEl.textContent = `${lines.join("\n")}\n\n${summary}`;
  document.title = failures === 0 ? "PASS" : "FAIL";
})();
