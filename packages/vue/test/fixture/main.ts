/* ============================================================
   @dialect-ui/vue 验收页

   用 createApp 挂真组件，在 DOM 上跑断言，结果写进 <pre id="result">。
   tools/test-fixture.sh 构建后用 headless Chrome 读这个页面，
   只要有 FAIL 行就以非零退出码收场。

   覆盖：
   - Theme：data-theme / data-mode / class 透传
   - Button：.btn / .btn--primary、type、原生 click、disabled
   - TextField：label 结构、modelValue 初值、输入 emit、multiline textarea、原生属性透传
   - Select：静态站同款 DOM、初始选中、打开/选择/关闭、父子 v-model 双向同步、
     Esc、禁用项、禁用态、卸载清理（无残留）与重新挂载
   ============================================================ */
import "@dialect-ui/core/css/tokens.css";
import "@dialect-ui/core/css/components.css";
import "@dialect-ui/core/css/themes/macos.css";

import { createApp, h, KeepAlive, nextTick, ref } from "vue";
import { Button, Select, TextField, Theme } from "@dialect-ui/vue";
import type { SelectOption } from "@dialect-ui/vue";

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

function press(el: Element, key: string): void {
  el.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
}

/* ---------- 状态：父组件持有，用来验证 v-model 双向同步 ---------- */
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
  } catch (error) {
    failures += 1;
    lines.push(`FAIL 测试中断 — ${(error as Error).message}`);
  }

  const summary = failures === 0 ? `ALL PASS (${lines.length})` : `FAILED ${failures}`;
  resultEl.textContent = `${lines.join("\n")}\n\n${summary}`;
  document.title = failures === 0 ? "PASS" : "FAIL";
})();
