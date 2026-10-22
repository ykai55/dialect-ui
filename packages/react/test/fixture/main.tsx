/* ============================================================
   @dialect-ui/react 浏览器验收页

   断言风格沿用 test/*.test.html：PASS / FAIL 行 + 结尾 ALL PASS / FAILED n，
   tools/test-fixture.sh 用 `grep '^FAIL'` 决定退出码。

   覆盖：Theme / Button / TextField 的 DOM 契约与属性透传；Select 的
   DOM 契约、控制器挂载、打开 / 选择 / 键盘 / Esc、受控 value 外部同步、
   卸载清理、disabled 选项与 disabled 整体、StrictMode 双执行下不重复绑定。
   ============================================================ */
import "@dialect-ui/core/css/tokens.css";
import "@dialect-ui/core/css/components.css";
import "@dialect-ui/core/css/themes/macos.css";

import { StrictMode, createRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Theme, Button, TextField, Select } from "@dialect-ui/react";

type Option = { value: string; label: string; disabled?: boolean };

const OPTIONS: Option[] = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C" },
  { value: "d", label: "Option D" },
];

const lines: string[] = [];
let finished = false;

function check(name: string, fn: () => boolean): void {
  let ok = false;
  try {
    ok = !!fn();
  } catch (error) {
    lines.push("FAIL " + name + " — " + (error as Error).message);
    return;
  }
  lines.push((ok ? "PASS " : "FAIL ") + name);
}

function writeResult(): void {
  if (finished) return;
  finished = true;
  const failed = lines.filter((line) => line.indexOf("FAIL") === 0).length;
  const result = document.getElementById("result");
  if (result) {
    result.textContent =
      lines.join("\n") +
      "\n\n" +
      (failed ? "FAILED " + failed : "ALL PASS (" + lines.length + ")");
  }
  document.title = failed ? "FAIL" : "PASS";
}

const watchdog = setTimeout(() => {
  if (!finished) {
    lines.push("FAIL 测试超时（断言流程没有跑完）");
    writeResult();
  }
}, 4000);

function wait(ms = 40): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function key(el: Element, k: string): void {
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
}

/** 绕过 React 的 value tracker，让 input 事件真的被 onChange 看到。 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

function dispatchInput(el: Element): void {
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

async function main(): Promise<void> {
  const themeRef = createRef<HTMLDivElement>();
  const buttonRef = createRef<HTMLButtonElement>();
  const textRef = createRef<HTMLInputElement>();
  const multiRef = createRef<HTMLTextAreaElement>();
  const selectRef = createRef<HTMLDivElement>();

  let buttonClicks = 0;
  const inputChanges: string[] = [];
  const selectChanges: { value: string; option: Option | undefined }[] = [];
  const openChanges: boolean[] = [];

  const rootEl = document.getElementById("root") as HTMLElement;
  const root = createRoot(rootEl);
  root.render(
    <Theme ref={themeRef} theme="macos" mode="dark" id="theme-root" className="demo panel">
      <Button
        ref={buttonRef}
        id="btn-default"
        onClick={() => {
          buttonClicks += 1;
        }}
      >
        Cancel
      </Button>
      <Button id="btn-primary" variant="primary">Save changes</Button>
      <Button id="btn-disabled" disabled>Disabled</Button>
      <Button id="btn-classed" className="custom">Classed</Button>

      <TextField
        ref={textRef}
        id="field-email"
        className="stacked"
        label="Email address"
        placeholder="name@example.com"
        onChange={(event) => {
          inputChanges.push(event.target.value);
        }}
      />
      <TextField ref={multiRef} id="field-notes" label="Notes" multiline rows={4} />

      <Select
        ref={selectRef}
        id="select-main"
        className="wide"
        options={OPTIONS}
        defaultValue="a"
        onValueChange={(value, option) => {
          selectChanges.push({ value, option });
        }}
        onOpenChange={(open) => {
          openChanges.push(open);
        }}
      />

      <Theme theme="win11" id="theme-plain">
        <span>plain</span>
      </Theme>
    </Theme>
  );
  await wait(80);

  /* ---------------- Theme ---------------- */
  check("Theme 渲染 data-theme", () => themeRef.current?.getAttribute("data-theme") === "macos");
  check("Theme 渲染 data-mode", () => themeRef.current?.getAttribute("data-mode") === "dark");
  check("Theme 透传 className 和其余 div 属性", () =>
    themeRef.current?.classList.contains("demo") === true &&
    themeRef.current?.classList.contains("panel") === true &&
    themeRef.current?.id === "theme-root");
  check("Theme forwardRef 指向容器", () => themeRef.current === document.getElementById("theme-root"));
  check("Theme 不传 mode 时不渲染 data-mode（走令牌默认浅色）", () => {
    const el = document.getElementById("theme-plain");
    return !!el && el.getAttribute("data-theme") === "win11" && !el.hasAttribute("data-mode");
  });

  /* ---------------- Button ---------------- */
  const btnDefault = document.getElementById("btn-default") as HTMLButtonElement;
  check("Button 渲染 class=btn", () => btnDefault.className === "btn");
  check("Button 默认 type=button", () => btnDefault.getAttribute("type") === "button");
  check("Button 默认 variant 不带 btn--primary", () => !btnDefault.classList.contains("btn--primary"));
  check("Button primary 同时有 btn 和 btn--primary", () => {
    const el = document.getElementById("btn-primary") as HTMLElement;
    return el.classList.contains("btn") && el.classList.contains("btn--primary");
  });
  check("Button 透传 className", () =>
    (document.getElementById("btn-classed") as HTMLElement).className === "btn custom");
  check("Button 透传 disabled", () =>
    (document.getElementById("btn-disabled") as HTMLButtonElement).disabled === true);
  check("Button forwardRef 指向 button 元素", () => buttonRef.current === btnDefault);
  btnDefault.click();
  check("Button onClick 触发一次", () => buttonClicks === 1);

  /* ---------------- TextField ---------------- */
  const fieldEmail = document.getElementById("field-email") as HTMLInputElement;
  const emailLabel = fieldEmail.closest("label.field");
  check("TextField 渲染 label.field", () => !!emailLabel);
  check("TextField label 文字进 .field__label", () =>
    emailLabel?.querySelector(".field__label")?.textContent === "Email address");
  check("TextField input 类名 field__input", () => fieldEmail.className === "field__input");
  check("TextField className 落在 .field 外壳上", () =>
    emailLabel?.classList.contains("field") === true &&
    emailLabel?.classList.contains("stacked") === true);
  check("TextField input 在 .field__wrap 里", () =>
    emailLabel?.querySelector(".field__wrap > .field__input") === fieldEmail);
  check("TextField 透传 placeholder", () => fieldEmail.placeholder === "name@example.com");
  check("TextField forwardRef 指向 input", () => textRef.current === fieldEmail);
  setNativeValue(fieldEmail, "hello@example.com");
  dispatchInput(fieldEmail);
  check("TextField onChange 收到输入值", () =>
    inputChanges[inputChanges.length - 1] === "hello@example.com");

  const fieldNotes = document.getElementById("field-notes") as HTMLTextAreaElement;
  check("TextField multiline 渲染 textarea", () => fieldNotes instanceof HTMLTextAreaElement);
  check("TextField multiline 类名", () =>
    fieldNotes.className === "field__input field__input--multiline");
  check("TextField multiline rows 透传", () => fieldNotes.rows === 4);
  check("TextField multiline forwardRef 指向 textarea", () => multiRef.current === fieldNotes);
  check("TextField multiline 的 label", () =>
    fieldNotes.closest("label.field")?.querySelector(".field__label")?.textContent === "Notes");

  /* ---------------- Select：初始 DOM 契约 ---------------- */
  const sel = document.getElementById("select-main") as HTMLElement;
  const btn = sel.querySelector(".select__button") as HTMLButtonElement;
  const menu = sel.querySelector(".menu") as HTMLElement;
  const items = Array.from(sel.querySelectorAll(".menu__item")) as HTMLElement[];
  const shown = btn.querySelector(".select__value") as HTMLElement;

  check("Select 根节点 class=select + 透传 className", () =>
    sel.classList.contains("select") && sel.classList.contains("wide"));
  check("Select 不渲染 data-select 自动初始化标记", () =>
    !sel.hasAttribute("data-select") && !sel.querySelector("[data-menu]"));
  check("Select 菜单 popover=manual", () => menu.getAttribute("popover") === "manual");
  check("Select 初始按钮文字=第一项", () => shown.textContent === "Option A");
  check("Select 初始 aria-selected 只有第一项为 true", () =>
    items[0].getAttribute("aria-selected") === "true" &&
    items.slice(1).every((item) => item.getAttribute("aria-selected") === "false"));
  check("Select 初始 aria-expanded=false", () => btn.getAttribute("aria-expanded") === "false");
  check("Select 初始菜单收起（控制器未打开）", () => !menu.matches(":popover-open"));
  check("Select 控制器挂载后按钮 aria-haspopup=listbox", () =>
    btn.getAttribute("aria-haspopup") === "listbox");
  check("Select 控制器给菜单 role=listbox、项 role=option", () =>
    menu.getAttribute("role") === "listbox" &&
    items.every((item) => item.getAttribute("role") === "option"));
  check("Select aria-controls 指向菜单 id", () =>
    !!menu.id && btn.getAttribute("aria-controls") === menu.id);
  check("Select 选项带 data-value（控制器 value() 的来源）", () =>
    items.every((item, index) => item.getAttribute("data-value") === OPTIONS[index].value));
  check("Select forwardRef 指向根节点", () => selectRef.current === sel);

  /* ---------------- Select：打开 / 选择 / 关闭 ---------------- */
  btn.click();
  await wait();
  check("点击按钮打开菜单（:popover-open）", () => menu.matches(":popover-open"));
  check("打开后 aria-expanded=true", () => btn.getAttribute("aria-expanded") === "true");
  check("打开后按钮加 is-open", () => btn.classList.contains("is-open"));
  check("onOpenChange(true) 回调一次", () =>
    openChanges.length === 1 && openChanges[0] === true);
  check("打开时高亮当前选中项", () =>
    items[0].classList.contains("is-active") &&
    btn.getAttribute("aria-activedescendant") === items[0].id);

  items[2].click();
  await wait();
  check("选择后按钮文字更新", () => shown.textContent === "Option C");
  check("选择后 aria-selected 跟随", () =>
    items[2].getAttribute("aria-selected") === "true" &&
    items[0].getAttribute("aria-selected") === "false");
  check("选择后菜单关闭", () => !menu.matches(":popover-open"));
  check("选择后 aria-expanded=false 且去掉 is-open", () =>
    btn.getAttribute("aria-expanded") === "false" && !btn.classList.contains("is-open"));
  check("onValueChange 收到 value 和对应 option", () => {
    const last = selectChanges[selectChanges.length - 1];
    return selectChanges.length === 1 &&
      last.value === "c" &&
      last.option?.value === "c" &&
      last.option?.label === "Option C";
  });
  check("onOpenChange(false) 在关闭时回调一次", () =>
    openChanges.length === 2 && openChanges[1] === false);

  /* ---------------- Select：键盘（行为来自 core） ---------------- */
  btn.focus();
  key(btn, "ArrowDown");
  await wait();
  check("方向键打开菜单并高亮当前项", () =>
    menu.matches(":popover-open") && items[2].classList.contains("is-active"));
  key(btn, "ArrowDown");
  await wait();
  check("方向键移动高亮", () => items[3].classList.contains("is-active"));
  key(btn, "Escape");
  await wait();
  check("Esc 关闭菜单", () =>
    !menu.matches(":popover-open") && btn.getAttribute("aria-expanded") === "false");

  /* ---------------- Select：受控 value 外部更新 ---------------- */
  const host2 = document.createElement("div");
  document.body.appendChild(host2);
  const root2 = createRoot(host2);
  let controlledCalls = 0;
  const renderControlled = (val: string) => {
    root2.render(
      <Select
        value={val}
        options={OPTIONS}
        onValueChange={() => {
          controlledCalls += 1;
        }}
      />
    );
  };
  renderControlled("b");
  await wait(80);
  const sel2 = host2.querySelector(".select") as HTMLElement;
  const shown2 = sel2.querySelector(".select__value") as HTMLElement;
  const items2 = Array.from(sel2.querySelectorAll(".menu__item")) as HTMLElement[];
  check("受控 value 初始选中 B", () =>
    shown2.textContent === "Option B" && items2[1].getAttribute("aria-selected") === "true");
  check("受控初始挂载不回调 onValueChange", () => controlledCalls === 0);
  renderControlled("d");
  await wait(80);
  check("受控 value 外部更新后按钮文字同步", () => shown2.textContent === "Option D");
  check("受控 value 外部更新后 aria-selected 同步", () =>
    items2[3].getAttribute("aria-selected") === "true" &&
    items2[1].getAttribute("aria-selected") === "false");
  check("受控同步走 silent，不回调 onValueChange", () => controlledCalls === 0);
  root2.unmount();
  host2.remove();

  /* ---------------- Select：卸载清理 ---------------- */
  const host3 = document.createElement("div");
  document.body.appendChild(host3);
  const root3 = createRoot(host3);
  root3.render(<Select options={OPTIONS} />);
  await wait(80);
  const sel3 = host3.querySelector(".select") as HTMLElement;
  const menu3 = sel3.querySelector(".menu") as HTMLElement;
  (sel3.querySelector(".select__button") as HTMLElement).click();
  await wait();
  check("卸载前菜单已打开", () => menu3.matches(":popover-open"));
  root3.unmount();
  await wait();
  check("卸载后 DOM 移除", () => !document.contains(menu3));
  check("卸载时控制器关掉了还开着的弹层", () => !menu3.matches(":popover-open"));

  // 同一容器重新挂载：控制器 destroy 清掉标记后还能重新 create。
  const root3b = createRoot(host3);
  root3b.render(<Select options={OPTIONS} />);
  await wait(80);
  const sel3b = host3.querySelector(".select") as HTMLElement;
  const menu3b = sel3b.querySelector(".menu") as HTMLElement;
  const btn3b = sel3b.querySelector(".select__button") as HTMLButtonElement;
  btn3b.click();
  await wait();
  check("重新挂载后单击只打开一次（没有残留双绑）", () =>
    menu3b.matches(":popover-open") && btn3b.getAttribute("aria-expanded") === "true");
  root3b.unmount();
  host3.remove();

  /* ---------------- Select：disabled ---------------- */
  const host4 = document.createElement("div");
  document.body.appendChild(host4);
  const root4 = createRoot(host4);
  let disabledCalls = 0;
  root4.render(
    <Select
      options={[
        { value: "x", label: "X" },
        { value: "y", label: "Y", disabled: true },
      ]}
      onValueChange={() => {
        disabledCalls += 1;
      }}
    />
  );
  await wait(80);
  const sel4 = host4.querySelector(".select") as HTMLElement;
  const btn4 = sel4.querySelector(".select__button") as HTMLButtonElement;
  const shown4 = sel4.querySelector(".select__value") as HTMLElement;
  const items4 = Array.from(sel4.querySelectorAll(".menu__item")) as HTMLElement[];
  check("disabled 选项渲染 aria-disabled=true", () =>
    items4[1].getAttribute("aria-disabled") === "true");
  btn4.click();
  await wait();
  items4[1].click();
  await wait();
  check("点 disabled 选项不改值、不回调", () =>
    disabledCalls === 0 && shown4.textContent === "X");
  root4.unmount();
  host4.remove();

  const host5 = document.createElement("div");
  document.body.appendChild(host5);
  const root5 = createRoot(host5);
  root5.render(<Select options={OPTIONS} disabled />);
  await wait(80);
  const sel5 = host5.querySelector(".select") as HTMLElement;
  const btn5 = sel5.querySelector(".select__button") as HTMLButtonElement;
  const menu5 = sel5.querySelector(".menu") as HTMLElement;
  check("Select disabled 时按钮 disabled", () => btn5.disabled === true);
  btn5.click();
  await wait();
  check("Select disabled 时点不开菜单", () => !menu5.matches(":popover-open"));
  root5.unmount();
  host5.remove();

  /* ---------------- StrictMode：mount → cleanup → mount ---------------- */
  let effectProbe = 0;
  function EffectProbe() {
    useEffect(() => {
      effectProbe += 1;
    }, []);
    return null;
  }

  const host6 = document.createElement("div");
  document.body.appendChild(host6);
  const root6 = createRoot(host6);
  const strictChanges: string[] = [];
  const strictOpens: boolean[] = [];
  root6.render(
    <StrictMode>
      <Select
        options={OPTIONS}
        onValueChange={(value) => {
          strictChanges.push(value);
        }}
        onOpenChange={(open) => {
          strictOpens.push(open);
        }}
      />
      <EffectProbe />
    </StrictMode>
  );
  await wait(150);
  check("验收页跑在 React 开发构建上（StrictMode effect 真的双执行）", () => effectProbe === 2);

  const sel6 = host6.querySelector(".select") as HTMLElement;
  const btn6 = sel6.querySelector(".select__button") as HTMLButtonElement;
  const menu6 = sel6.querySelector(".menu") as HTMLElement;
  const items6 = Array.from(sel6.querySelectorAll(".menu__item")) as HTMLElement[];
  check("StrictMode 双执行后只有一套按钮 / 菜单 / 选项", () =>
    sel6.querySelectorAll(".select__button").length === 1 &&
    sel6.querySelectorAll(".menu").length === 1 &&
    sel6.querySelectorAll(".menu__item").length === OPTIONS.length);
  check("StrictMode 的 cleanup（destroy）不回调 onOpenChange", () => strictOpens.length === 0);

  btn6.click();
  await wait();
  check("StrictMode 下单击只打开一次（未重复绑定）", () =>
    menu6.matches(":popover-open") && btn6.getAttribute("aria-expanded") === "true");
  check("StrictMode 下 onOpenChange(true) 只回调一次", () =>
    strictOpens.length === 1 && strictOpens[0] === true);
  items6[1].click();
  await wait();
  check("StrictMode 下选择只回调一次 onValueChange", () =>
    strictChanges.length === 1 && strictChanges[0] === "b");
  check("StrictMode 下选择后按钮文字同步", () =>
    (sel6.querySelector(".select__value") as HTMLElement).textContent === "Option B");
  root6.unmount();
  host6.remove();

  /* ---------------- 全局：不泄漏自动初始化标记 ---------------- */
  check("整页没有 data-select / data-menu 自动初始化标记", () =>
    document.querySelectorAll("[data-select], [data-menu]").length === 0);
}

main()
  .then(() => {
    clearTimeout(watchdog);
    writeResult();
  })
  .catch((error) => {
    lines.push("FAIL 测试中断 — " + ((error as Error)?.message ?? String(error)));
    clearTimeout(watchdog);
    writeResult();
  });

window.addEventListener("error", (event) => {
  if (!finished) {
    lines.push("FAIL 未捕获异常 — " + (event.message ?? ""));
    clearTimeout(watchdog);
    writeResult();
  }
});
