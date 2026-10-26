/* ============================================================
   @dialect-ui/react 浏览器验收页

   断言风格沿用 test/*.test.html：PASS / FAIL 行 + 结尾 ALL PASS / FAILED n，
   tools/test-fixture.sh 用 `grep '^FAIL'` 决定退出码。

   覆盖：Theme / Button / TextField 的 DOM 契约与属性透传；Select 的
   DOM 契约、控制器挂载、打开 / 选择 / 键盘 / Esc、受控 value 外部同步、
   卸载清理、disabled 选项与 disabled 整体、StrictMode 双执行下不重复绑定。
   v0.2：Checkbox / Radio / Switch / Progress / Slider 的表单契约与受控非受控，
   Segmented / Tabs 的点击、方向键分档、受控同步，Tooltip 的悬停 / Esc / 滚动，
   Menu / ContextMenu 的展开、选择、Esc、卸载清理，Window 的六个 frame
   结构与 action 派发、右键拦截。
   ============================================================ */
import "@dialect-ui/core/css/tokens.css";
import "@dialect-ui/core/css/components.css";
import "@dialect-ui/core/css/window.css";
import "@dialect-ui/core/css/themes/macos.css";
import "@dialect-ui/core/css/themes/win10.css";
import "@dialect-ui/core/css/themes/win11.css";

import { StrictMode, createRef, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import {
  Theme,
  Button,
  TextField,
  Select,
  Checkbox,
  Radio,
  Switch,
  Progress,
  Slider,
  SegmentedControl,
  Tabs,
  Tooltip,
  TooltipProvider,
  Menu,
  ContextMenu,
  Window,
} from "@dialect-ui/react";
import type { MenuEntry, SegmentedOption, TabItem, WindowAction } from "@dialect-ui/react";

type Option = { value: string; label: string; disabled?: boolean };

const OPTIONS: Option[] = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C" },
  { value: "d", label: "Option D" },
];

const SEG_OPTIONS: SegmentedOption[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const TAB_ITEMS: TabItem[] = [
  { value: "general", label: "General" },
  { value: "advanced", label: "Advanced" },
  { value: "about", label: "About" },
];

const TAB_PANELS = [
  <p key="general">General panel</p>,
  <p key="advanced">Advanced panel</p>,
  <p key="about">About panel</p>,
];

const MENU_ITEMS: MenuEntry[] = [
  { label: "New window", value: "new" },
  { label: "Duplicate", value: "duplicate", disabled: true },
  { separator: true },
  { label: "Rename", value: "rename", shortcut: "F2" },
  { label: "Delete", value: "delete" },
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

/** 轮询等待条件成立（CI 比本地慢，固定 sleep 不够稳）。 */
async function waitFor(fn: () => boolean, timeout = 2000, step = 20): Promise<boolean> {
  const start = performance.now();
  while (performance.now() - start < timeout) {
    if (fn()) return true;
    await wait(step);
  }
  return fn();
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

function rightClick(el: Element, x = 120, y = 120): boolean {
  // 返回 false 表示浏览器菜单被 preventDefault 拦掉了。
  return el.dispatchEvent(
    new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y })
  );
}

function hover(el: Element): void {
  el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: null }));
}

function unhover(el: Element): void {
  el.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: null }));
}

function scrollWindow(): void {
  window.dispatchEvent(new Event("scroll"));
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

  /* ============================================================
     v0.2 —— 纯 CSS 控件
     ============================================================ */

  const v2RootEl = document.createElement("div");
  document.body.appendChild(v2RootEl);

  const checkboxRef = createRef<HTMLInputElement>();
  const radioRef = createRef<HTMLInputElement>();
  const switchRef = createRef<HTMLInputElement>();
  const sliderRef = createRef<HTMLInputElement>();
  const segmentedRef = createRef<HTMLDivElement>();
  const tabsRef = createRef<HTMLDivElement>();

  const checkboxChanges: boolean[] = [];
  const radioClicks: string[] = [];
  const switchChanges: boolean[] = [];
  const sliderChanges: number[] = [];
  const segmentedChanges: { value: string; option: SegmentedOption | undefined }[] = [];
  const tabChanges: { value: string; index: number }[] = [];

  const v2Root = createRoot(v2RootEl);
  v2Root.render(
    <Theme theme="macos" mode="dark" id="v2-theme">
      <Checkbox
        ref={checkboxRef}
        id="chk-uncontrolled"
        className="inline"
        label="Remember me"
        defaultChecked
        onChange={(event) => checkboxChanges.push(event.target.checked)}
      />
      <Checkbox id="chk-plain" label="Plain" />
      <Radio
        ref={radioRef}
        id="radio-a"
        name="plan"
        value="free"
        label="Free"
        defaultChecked
        onClick={() => radioClicks.push("free")}
      />
      <Radio id="radio-b" name="plan" value="pro" label="Pro" onClick={() => radioClicks.push("pro")} />
      <Radio id="radio-c" name="plan" value="team" label="Team" disabled />
      <Switch
        ref={switchRef}
        id="switch-uncontrolled"
        label="Wi-Fi"
        defaultChecked
        onChange={(event) => switchChanges.push(event.target.checked)}
      />
      <Progress id="progress-main" value={40} aria-label="Copying" />
      <Progress id="progress-indeterminate" indeterminate aria-label="Loading" />
      <Slider
        ref={sliderRef}
        id="slider-main"
        showValue
        defaultValue={40}
        aria-label="Volume"
        onChange={(value) => sliderChanges.push(value)}
      />
      <Slider id="slider-plain" defaultValue={25} aria-label="Plain volume" />
      <SegmentedControl
        ref={segmentedRef}
        id="seg-main"
        aria-label="Interval"
        options={SEG_OPTIONS}
        defaultValue="week"
        onValueChange={(value, option) => segmentedChanges.push({ value, option })}
      />
      <Tabs
        ref={tabsRef}
        id="tabs-main"
        aria-label="Sections"
        items={TAB_ITEMS}
        defaultValue="general"
        onValueChange={(value, index) => tabChanges.push({ value, index })}
      >
        {TAB_PANELS}
      </Tabs>
    </Theme>
  );
  await wait(40);

  /* ---------------- Checkbox ---------------- */
  const chk = document.getElementById("chk-uncontrolled") as HTMLInputElement;
  const chkLabel = chk.closest("label.check") as HTMLElement;
  const chkBox = chkLabel.querySelector(".check__box") as HTMLElement;
  const chkMark = chkBox?.querySelector("svg.check__mark") as SVGElement | null;
  check("Checkbox DOM = label.check > input.check__input + span.check__box + .check__label", () =>
    !!chkLabel &&
    chkLabel.tagName === "LABEL" &&
    chk.className === "check__input" &&
    chk.type === "checkbox" &&
    chkBox?.parentElement === chkLabel &&
    chkLabel.querySelector(".check__label")?.textContent === "Remember me");
  check("Checkbox className 落在 label 上", () => chkLabel.classList.contains("inline"));
  check("Checkbox mark 是固定 viewBox 的 svg path", () =>
    !!chkMark &&
    chkMark.getAttribute("viewBox") === "0 0 20 20" &&
    chkMark.getAttribute("aria-hidden") === "true" &&
    chkMark.querySelector("path")?.getAttribute("d") === "M5.2 10.3 L8 14 L13.5 5.7");
  check("Checkbox forwardRef 指向 input", () => checkboxRef.current === chk);
  check("Checkbox defaultChecked 生效", () => chk.checked === true);
  chk.click();
  await wait(20);
  check("Checkbox 非受控点击切换并回调", () =>
    chk.checked === false && checkboxChanges.length === 1 && checkboxChanges[0] === false);
  chk.click();
  await wait(20);
  check("Checkbox 再点切回选中", () => chk.checked === true && checkboxChanges.length === 2);

  /* ---------------- Radio ---------------- */
  const radioA = document.getElementById("radio-a") as HTMLInputElement;
  const radioB = document.getElementById("radio-b") as HTMLInputElement;
  const radioC = document.getElementById("radio-c") as HTMLInputElement;
  const radioALabel = radioA.closest("label.radio") as HTMLElement;
  check("Radio DOM = label.radio > input.radio__input + span.radio__dot + .radio__label", () =>
    radioALabel.tagName === "LABEL" &&
    radioA.className === "radio__input" &&
    radioA.type === "radio" &&
    radioALabel.querySelector(".radio__dot") !== null &&
    radioALabel.querySelector(".radio__label")?.textContent === "Free");
  check("Radio forwardRef 指向 input 且同组共用 name", () =>
    radioRef.current === radioA && radioA.name === "plan" && radioB.name === "plan");
  check("Radio 初始只有默认项选中", () => radioA.checked && !radioB.checked && !radioC.checked);
  radioB.click();
  await wait(20);
  check("Radio 同组互斥（点 B 后 A 取消）", () => radioB.checked && !radioA.checked);
  radioC.click();
  await wait(20);
  check("Radio disabled 项点不动", () => !radioC.checked && radioB.checked);
  radioA.click();
  await wait(20);
  check("Radio onClick 透传到 input", () =>
    radioA.checked && radioClicks.join(",") === "pro,free");

  /* ---------------- Switch ---------------- */
  const sw = document.getElementById("switch-uncontrolled") as HTMLInputElement;
  const swLabel = sw.closest("label.switch") as HTMLElement;
  check("Switch DOM = label.switch > input.switch__input + track > knob + .switch__label", () =>
    swLabel.tagName === "LABEL" &&
    sw.className === "switch__input" &&
    sw.type === "checkbox" &&
    swLabel.querySelector(".switch__track > .switch__knob") !== null &&
    swLabel.querySelector(".switch__label")?.textContent === "Wi-Fi");
  check("Switch forwardRef 指向 input", () => switchRef.current === sw);
  check("Switch defaultChecked 生效", () => sw.checked === true);
  sw.click();
  await wait(20);
  check("Switch 非受控点击切换并回调", () =>
    sw.checked === false && switchChanges.length === 1 && switchChanges[0] === false);

  /* ---------------- Checkbox / Switch 受控 ---------------- */
  const hostControlled = document.createElement("div");
  document.body.appendChild(hostControlled);
  const controlledRoot = createRoot(hostControlled);
  let controlledCheckboxCalls = 0;
  let controlledSwitchCalls = 0;
  function ControlledChoiceProbe() {
    const [checkOn, setCheckOn] = useState(true);
    const [switchOn, setSwitchOn] = useState(false);
    return (
      <>
        <Checkbox
          id="chk-controlled"
          label="Controlled"
          checked={checkOn}
          onChange={(event) => {
            controlledCheckboxCalls += 1;
            setCheckOn(event.target.checked);
          }}
        />
        <span id="chk-state">{checkOn ? "on" : "off"}</span>
        <Switch
          id="switch-controlled"
          label="Controlled switch"
          checked={switchOn}
          onChange={(event) => {
            controlledSwitchCalls += 1;
            setSwitchOn(event.target.checked);
          }}
        />
        <span id="switch-state">{switchOn ? "on" : "off"}</span>
      </>
    );
  }
  controlledRoot.render(<ControlledChoiceProbe />);
  await wait(40);
  const chkC = document.getElementById("chk-controlled") as HTMLInputElement;
  const swC = document.getElementById("switch-controlled") as HTMLInputElement;
  check("Checkbox 受控初始 checked 生效", () =>
    chkC.checked === true && document.getElementById("chk-state")?.textContent === "on");
  chkC.click();
  await wait(30);
  check("Checkbox 受控点击后由 prop 回写", () =>
    chkC.checked === false &&
    document.getElementById("chk-state")?.textContent === "off" &&
    controlledCheckboxCalls === 1);
  check("Switch 受控初始 checked 生效", () => swC.checked === false);
  swC.click();
  await wait(30);
  check("Switch 受控点击后由 prop 回写", () =>
    swC.checked === true &&
    document.getElementById("switch-state")?.textContent === "on" &&
    controlledSwitchCalls === 1);
  controlledRoot.unmount();
  hostControlled.remove();

  /* ---------------- Progress ---------------- */
  const progress = document.getElementById("progress-main") as HTMLElement;
  check("Progress DOM = div.progress[role=progressbar] > .progress__fill", () =>
    progress.className === "progress" &&
    progress.getAttribute("role") === "progressbar" &&
    progress.querySelector(".progress__fill") !== null);
  check("Progress 确定态 ARIA 与 --progress-value", () =>
    progress.getAttribute("aria-valuemin") === "0" &&
    progress.getAttribute("aria-valuemax") === "100" &&
    progress.getAttribute("aria-valuenow") === "40" &&
    !progress.hasAttribute("data-indeterminate") &&
    progress.style.getPropertyValue("--progress-value").trim() === "40%");
  const progressIndet = document.getElementById("progress-indeterminate") as HTMLElement;
  check("Progress 不确定态：data-indeterminate、无 aria-valuenow", () =>
    progressIndet.hasAttribute("data-indeterminate") &&
    !progressIndet.hasAttribute("aria-valuenow") &&
    progressIndet.style.getPropertyValue("--progress-value") === "");

  const hostProgress = document.createElement("div");
  document.body.appendChild(hostProgress);
  const progressRoot = createRoot(hostProgress);
  progressRoot.render(<Progress value={40} max={200} aria-label="Copy progress" />);
  await wait(30);
  const progDyn = hostProgress.querySelector(".progress") as HTMLElement;
  check("Progress max 透传并折算百分比", () =>
    progDyn.getAttribute("aria-valuemax") === "200" &&
    progDyn.getAttribute("aria-valuenow") === "40" &&
    progDyn.style.getPropertyValue("--progress-value").trim() === "20%");
  progressRoot.render(<Progress value={250} max={200} aria-label="Copy progress" />);
  await wait(30);
  check("Progress 值变化重渲染并夹到量程内", () =>
    progDyn.getAttribute("aria-valuenow") === "200" &&
    progDyn.style.getPropertyValue("--progress-value").trim() === "100%");
  progressRoot.unmount();
  hostProgress.remove();

  /* ---------------- Slider ---------------- */
  const slider = document.getElementById("slider-main") as HTMLInputElement;
  const sliderRow = slider.closest("div.slider-row") as HTMLElement;
  const sliderValue = sliderRow?.querySelector(".slider__value") as HTMLElement | null;
  check("Slider showValue DOM = div.slider-row > input.slider[type=range] + span.slider__value", () =>
    !!sliderRow &&
    slider.className === "slider" &&
    slider.type === "range" &&
    sliderValue?.textContent === "40");
  check("Slider forwardRef 指向 input", () => sliderRef.current === slider);
  check("Slider 无 showValue 时直接渲染 input.slider", () => {
    const plain = document.getElementById("slider-plain") as HTMLInputElement;
    return plain.className === "slider" && plain.type === "range" && !plain.closest(".slider-row");
  });
  slider.focus();
  key(slider, "Home");
  await wait(30);
  check("Slider Home 到最小值（走 core createSlider）", () =>
    slider.value === "0" && sliderValue?.textContent === "0");
  key(slider, "End");
  await wait(30);
  check("Slider End 到最大值", () => slider.value === "100" && sliderValue?.textContent === "100");
  check("Slider onChange 收到 Home/End 的数值", () =>
    sliderChanges[0] === 0 && sliderChanges[sliderChanges.length - 1] === 100);

  const hostSlider = document.createElement("div");
  document.body.appendChild(hostSlider);
  const sliderRoot = createRoot(hostSlider);
  sliderRoot.render(<Slider showValue value={70} aria-label="Controlled volume" />);
  await wait(30);
  const ctrlSlider = hostSlider.querySelector("input.slider") as HTMLInputElement;
  const ctrlSliderValue = hostSlider.querySelector(".slider__value") as HTMLElement;
  check("Slider 受控初始值来自 prop", () =>
    ctrlSlider.value === "70" && ctrlSliderValue.textContent === "70");
  sliderRoot.render(<Slider showValue value={20} aria-label="Controlled volume" />);
  await wait(30);
  check("Slider 受控外部更新同步 DOM 与显示值", () =>
    ctrlSlider.value === "20" && ctrlSliderValue.textContent === "20");
  sliderRoot.unmount();
  hostSlider.remove();

  /* ---------------- SegmentedControl ---------------- */
  const seg = document.getElementById("seg-main") as HTMLElement;
  const segItems = Array.from(seg.querySelectorAll(".segmented__item")) as HTMLButtonElement[];
  check("Segmented DOM = div.segmented[role=radiogroup] > button.segmented__item[role=radio]", () =>
    seg.className === "segmented" &&
    seg.getAttribute("role") === "radiogroup" &&
    seg.getAttribute("aria-label") === "Interval" &&
    !seg.hasAttribute("data-segmented") &&
    segItems.length === SEG_OPTIONS.length &&
    segItems.every(
      (item, index) =>
        item.className === "segmented__item" &&
        item.getAttribute("role") === "radio" &&
        item.getAttribute("data-value") === SEG_OPTIONS[index].value
    ));
  check("Segmented forwardRef 指向根节点", () => segmentedRef.current === seg);
  check("Segmented defaultValue 决定初始 aria-checked", () =>
    segItems[1].getAttribute("aria-checked") === "true" &&
    segItems[0].getAttribute("aria-checked") === "false");
  check("Segmented 初始挂载不回调 onValueChange", () => segmentedChanges.length === 0);
  segItems[2].click();
  await wait(20);
  check("Segmented 点击选择并回调", () =>
    segItems[2].getAttribute("aria-checked") === "true" &&
    segItems[1].getAttribute("aria-checked") === "false" &&
    segmentedChanges.length === 1 &&
    segmentedChanges[0].value === "month" &&
    segmentedChanges[0].option?.label === "Month");
  key(segItems[2], "ArrowRight");
  await wait(20);
  check("Segmented 方向键移动并选中（循环）", () =>
    segItems[0].getAttribute("aria-checked") === "true" &&
    segmentedChanges[segmentedChanges.length - 1].value === "day");
  key(segItems[0], "End");
  await wait(20);
  check("Segmented End 到末项", () =>
    segItems[2].getAttribute("aria-checked") === "true" &&
    segmentedChanges[segmentedChanges.length - 1].value === "month");

  const hostSeg = document.createElement("div");
  document.body.appendChild(hostSeg);
  const segRoot = createRoot(hostSeg);
  let segControlledCalls = 0;
  const renderSegmented = (val: string) => {
    segRoot.render(
      <SegmentedControl
        options={SEG_OPTIONS}
        value={val}
        onValueChange={() => {
          segControlledCalls += 1;
        }}
      />
    );
  };
  renderSegmented("week");
  await wait(40);
  const segC = hostSeg.querySelector(".segmented") as HTMLElement;
  const segCItems = Array.from(segC.querySelectorAll(".segmented__item"));
  check("Segmented 受控初始值同步", () => segCItems[1].getAttribute("aria-checked") === "true");
  renderSegmented("month");
  await wait(40);
  check("Segmented 受控外部更新走 silent 同步", () =>
    segCItems[2].getAttribute("aria-checked") === "true" &&
    segCItems[1].getAttribute("aria-checked") === "false" &&
    segControlledCalls === 0);
  segRoot.unmount();
  hostSeg.remove();

  /* ---------------- Tabs ---------------- */
  const tabs = document.getElementById("tabs-main") as HTMLElement;
  const tabList = tabs.querySelector(".tabs__list") as HTMLElement;
  const tabEls = Array.from(tabs.querySelectorAll(".tabs__tab")) as HTMLButtonElement[];
  const tabPanels = Array.from(tabs.querySelectorAll(".tabs__panel")) as HTMLElement[];
  check("Tabs DOM = div.tabs > div.tabs__list[role=tablist] > button.tabs__tab[role=tab]", () =>
    tabs.className === "tabs" &&
    !tabs.hasAttribute("data-tabs") &&
    tabList.getAttribute("role") === "tablist" &&
    tabList.getAttribute("aria-label") === "Sections" &&
    tabEls.length === TAB_ITEMS.length &&
    tabEls.every(
      (tab, index) =>
        tab.className === "tabs__tab" &&
        tab.getAttribute("role") === "tab" &&
        tab.getAttribute("data-value") === TAB_ITEMS[index].value
    ));
  check("Tabs children 按顺序渲染成 .tabs__panel", () =>
    tabPanels.length === TAB_PANELS.length &&
    tabPanels[0].textContent === "General panel" &&
    tabPanels[2].textContent === "About panel");
  check("Tabs forwardRef 指向根节点", () => tabsRef.current === tabs);
  check("Tabs 初始选中与 panel hidden", () =>
    tabEls[0].getAttribute("aria-selected") === "true" &&
    !tabPanels[0].hidden &&
    tabPanels[1].hidden === true &&
    tabPanels[2].hidden === true);
  check("Tabs 控制器补 aria-controls / tabpanel / roving tabindex", () =>
    tabEls.every((tab, index) => tab.getAttribute("aria-controls") === tabPanels[index].id) &&
    tabPanels.every((panel) => panel.getAttribute("role") === "tabpanel") &&
    tabEls[0].tabIndex === 0 &&
    tabEls[1].tabIndex === -1);
  tabEls[2].click();
  await wait(20);
  check("Tabs 点击切换选中与面板显隐", () =>
    tabEls[2].getAttribute("aria-selected") === "true" &&
    !tabPanels[2].hidden &&
    tabPanels[0].hidden === true &&
    tabChanges.length === 1 &&
    tabChanges[0].value === "about" &&
    tabChanges[0].index === 2);
  tabEls[2].focus();
  key(tabEls[2], "ArrowLeft");
  await wait(20);
  check("Tabs 在 macOS 主题下方向键不切换（--tabs-arrow-mode: none）", () =>
    tabEls[2].getAttribute("aria-selected") === "true" &&
    tabChanges.length === 1 &&
    document.activeElement === tabEls[2]);

  const hostTabsW11 = document.createElement("div");
  document.body.appendChild(hostTabsW11);
  const tabsW11Root = createRoot(hostTabsW11);
  const w11Changes: string[] = [];
  tabsW11Root.render(
    <Theme theme="win11" id="tabs-w11-theme">
      <Tabs
        items={TAB_ITEMS}
        defaultValue="general"
        onValueChange={(value) => {
          w11Changes.push(value);
        }}
      >
        {TAB_PANELS}
      </Tabs>
    </Theme>
  );
  await wait(40);
  const w11Tabs = Array.from(hostTabsW11.querySelectorAll(".tabs__tab")) as HTMLButtonElement[];
  w11Tabs[0].focus();
  key(w11Tabs[0], "ArrowRight");
  await wait(20);
  check("Tabs win11 方向键只移焦点不改选中（--tabs-arrow-mode: focus）", () =>
    document.activeElement === w11Tabs[1] &&
    w11Tabs[0].getAttribute("aria-selected") === "true" &&
    w11Tabs[1].getAttribute("aria-selected") === "false" &&
    w11Changes.length === 0);
  key(w11Tabs[1], "Enter");
  await wait(20);
  check("Tabs win11 回车确认选中并回调", () =>
    w11Tabs[1].getAttribute("aria-selected") === "true" && w11Changes[0] === "advanced");
  tabsW11Root.unmount();
  hostTabsW11.remove();

  const hostTabsW10 = document.createElement("div");
  document.body.appendChild(hostTabsW10);
  const tabsW10Root = createRoot(hostTabsW10);
  const w10Changes: string[] = [];
  tabsW10Root.render(
    <Theme theme="win10" id="tabs-w10-theme">
      <Tabs
        items={TAB_ITEMS}
        defaultValue="general"
        onValueChange={(value) => {
          w10Changes.push(value);
        }}
      >
        {TAB_PANELS}
      </Tabs>
    </Theme>
  );
  await wait(40);
  const w10Tabs = Array.from(hostTabsW10.querySelectorAll(".tabs__tab")) as HTMLButtonElement[];
  w10Tabs[0].focus();
  key(w10Tabs[0], "ArrowRight");
  await wait(20);
  check("Tabs win10 方向键直接切换（--tabs-arrow-mode: select）", () =>
    w10Tabs[1].getAttribute("aria-selected") === "true" && w10Changes[0] === "advanced");
  key(w10Tabs[1], "End");
  await wait(20);
  check("Tabs win10 End 到末项", () =>
    w10Tabs[2].getAttribute("aria-selected") === "true" &&
    w10Changes[w10Changes.length - 1] === "about");
  key(w10Tabs[2], "Home");
  await wait(20);
  check("Tabs win10 Home 到首项", () =>
    w10Tabs[0].getAttribute("aria-selected") === "true" &&
    w10Changes[w10Changes.length - 1] === "general");
  tabsW10Root.unmount();
  hostTabsW10.remove();

  const hostTabsCtrl = document.createElement("div");
  document.body.appendChild(hostTabsCtrl);
  const tabsCtrlRoot = createRoot(hostTabsCtrl);
  let tabsControlledCalls = 0;
  const renderTabsControlled = (val: string) => {
    tabsCtrlRoot.render(
      <Tabs
        items={TAB_ITEMS}
        value={val}
        onValueChange={() => {
          tabsControlledCalls += 1;
        }}
      >
        {TAB_PANELS}
      </Tabs>
    );
  };
  renderTabsControlled("advanced");
  await wait(40);
  const tabsC = hostTabsCtrl.querySelector(".tabs") as HTMLElement;
  const tabsCItems = Array.from(tabsC.querySelectorAll(".tabs__tab")) as HTMLElement[];
  const tabsCPanels = Array.from(tabsC.querySelectorAll(".tabs__panel")) as HTMLElement[];
  check("Tabs 受控初始值同步", () =>
    tabsCItems[1].getAttribute("aria-selected") === "true" && !tabsCPanels[1].hidden);
  renderTabsControlled("about");
  await wait(40);
  check("Tabs 受控外部更新走 silent 同步", () =>
    tabsCItems[2].getAttribute("aria-selected") === "true" &&
    !tabsCPanels[2].hidden &&
    tabsCPanels[1].hidden === true &&
    tabsControlledCalls === 0);
  tabsCtrlRoot.unmount();
  hostTabsCtrl.remove();

  /* ---------------- Tooltip ---------------- */
  const hostTip = document.createElement("div");
  document.body.appendChild(hostTip);
  const tipRoot = createRoot(hostTip);
  const tipRef = createRef<HTMLButtonElement>();
  tipRoot.render(
    <div
      style={
        {
          "--tooltip-show-delay": "0ms",
          "--tooltip-hide-delay": "0ms",
        } as CSSProperties
      }
    >
      <TooltipProvider>
        <Tooltip ref={tipRef} text="Saves your changes">
          <Button id="tip-target">Save</Button>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
  await wait(40);
  const tipTarget = tipRef.current as HTMLButtonElement;
  const tipHost = hostTip.querySelector(".tooltip-host") as HTMLElement;
  const tipLayer = hostTip.querySelector(".tooltip") as HTMLElement;
  await waitFor(() => !!(tipLayer as unknown as { _tooltip?: unknown })._tooltip);
  check("TooltipProvider DOM = .tooltip-host[display:contents] + 子节点 + .tooltip 层", () =>
    !!tipHost &&
    tipHost.style.display === "contents" &&
    tipLayer.getAttribute("role") === "tooltip" &&
    tipLayer.hasAttribute("data-tooltip-layer") &&
    tipLayer.hidden === true);
  check("Tooltip 只给唯一子元素加 data-tooltip，不产生包装节点", () =>
    !!tipTarget &&
    tipTarget.getAttribute("data-tooltip") === "Saves your changes" &&
    tipTarget.parentElement === tipHost &&
    tipTarget.className === "btn");
  check("Tooltip forwardRef 指向子元素", () => tipRef.current === document.getElementById("tip-target"));
  hover(tipTarget);
  await waitFor(() => tipLayer.hidden === false);
  check("Tooltip 悬停出现并写 aria-describedby", () =>
    tipLayer.hidden === false &&
    tipLayer.getAttribute("data-open") === "" &&
    tipLayer.textContent === "Saves your changes" &&
    !!tipLayer.id &&
    tipTarget.getAttribute("aria-describedby") === tipLayer.id);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await waitFor(() => tipLayer.hidden === true);
  check("Tooltip Esc 关闭并清 aria-describedby", () =>
    tipLayer.hidden === true && !tipTarget.hasAttribute("aria-describedby"));
  hover(tipTarget);
  await waitFor(() => tipLayer.hidden === false);
  check("Tooltip 再次悬停能重新出现", () => tipLayer.hidden === false);
  scrollWindow();
  await waitFor(() => tipLayer.hidden === true);
  check("Tooltip 滚动关闭", () => tipLayer.hidden === true);
  tipRoot.unmount();
  hostTip.remove();

  /* ---------------- Menu ---------------- */
  const hostMenu = document.createElement("div");
  document.body.appendChild(hostMenu);
  const menuRoot = createRoot(hostMenu);
  const menuBoxRef = createRef<HTMLDivElement>();
  const menuSelections: { entry: MenuEntry; index: number }[] = [];
  menuRoot.render(
    <Menu
      ref={menuBoxRef}
      trigger={<Button id="menu-trigger">Actions</Button>}
      items={MENU_ITEMS}
      aria-label="Actions"
      onSelect={(entry, index) => menuSelections.push({ entry, index })}
    />
  );
  await wait(40);
  const menuBox = hostMenu.querySelector(".menu-box") as HTMLElement;
  const menuTrigger = document.getElementById("menu-trigger") as HTMLButtonElement;
  const menuEl = menuBox.querySelector("ul.menu") as HTMLElement;
  const menuEntries = Array.from(menuEl.querySelectorAll(".menu__item")) as HTMLElement[];
  const menuSeparators = Array.from(menuEl.querySelectorAll(".menu__separator")) as HTMLElement[];
  check("Menu DOM = div.menu-box > 触发器 + ul.menu[popover=manual][role=menu]", () =>
    menuBox.className === "menu-box" &&
    menuBoxRef.current === menuBox &&
    menuTrigger.parentElement === menuBox &&
    menuEl.getAttribute("popover") === "manual" &&
    menuEl.getAttribute("role") === "menu" &&
    menuEl.getAttribute("aria-label") === "Actions");
  check("Menu 不渲染 data-menu 自动初始化标记", () =>
    !menuBox.hasAttribute("data-menu") &&
    !menuBox.querySelector("[data-menu]") &&
    !menuBox.querySelector("[data-menu-trigger]"));
  check("Menu items 渲染菜单项 / 分隔线 / 快捷键 / disabled", () =>
    menuEntries.length === 4 &&
    menuSeparators.length === 1 &&
    menuEntries[2].getAttribute("data-entry-index") === "3" &&
    menuEntries[2].querySelector(".menu__shortcut")?.textContent === "F2" &&
    menuEntries[1].getAttribute("aria-disabled") === "true");
  check("Menu 触发器初始 ARIA 由组件写出", () =>
    menuTrigger.getAttribute("aria-haspopup") === "menu" &&
    menuTrigger.getAttribute("aria-expanded") === "false" &&
    menuTrigger.getAttribute("aria-controls") === menuEl.id);
  await waitFor(() => menuEl.hasAttribute("tabindex"));
  menuTrigger.click();
  await waitFor(() => menuEl.matches(":popover-open"));
  check("Menu 点击触发器展开", () =>
    menuEl.matches(":popover-open") && menuTrigger.getAttribute("aria-expanded") === "true");
  key(menuEl, "ArrowDown");
  await wait(20);
  check("Menu 方向键高亮第一项", () =>
    menuEntries[0].classList.contains("is-active") &&
    menuEl.getAttribute("aria-activedescendant") === menuEntries[0].id);
  key(menuEl, "Escape");
  await wait(20);
  check("Menu Esc 关闭并复位 aria-expanded", () =>
    !menuEl.matches(":popover-open") &&
    menuTrigger.getAttribute("aria-expanded") === "false" &&
    !menuEntries[0].classList.contains("is-active"));
  menuTrigger.click();
  await wait(20);
  menuEntries[2].click();
  await wait(20);
  check("Menu 选择回调收到 entry 与 entries 下标", () => {
    const last = menuSelections[menuSelections.length - 1];
    return (
      menuSelections.length === 1 &&
      last.index === 3 &&
      !("separator" in last.entry) &&
      last.entry.value === "rename" &&
      last.entry.label === "Rename"
    );
  });
  check("Menu 选择后关闭", () => !menuEl.matches(":popover-open"));
  menuTrigger.click();
  await wait(20);
  menuEntries[1].click();
  await wait(20);
  check("Menu disabled 项不触发选择", () => menuSelections.length === 1);
  menuTrigger.click();
  await wait(20);
  menuRoot.unmount();
  await wait(20);
  check("Menu 卸载时控制器关掉还开着的弹层", () => !menuEl.matches(":popover-open"));

  const menuRoot2 = createRoot(hostMenu);
  menuRoot2.render(
    <Menu
      trigger={<Button id="menu-trigger-2">Actions</Button>}
      items={MENU_ITEMS}
      onSelect={(entry, index) => menuSelections.push({ entry, index })}
    />
  );
  await wait(40);
  const menuTrigger2 = document.getElementById("menu-trigger-2") as HTMLButtonElement;
  const menuEl2 = hostMenu.querySelector("ul.menu") as HTMLElement;
  await waitFor(() => menuEl2.hasAttribute("tabindex"));
  menuTrigger2.click();
  await waitFor(() => menuEl2.matches(":popover-open"));
  check("Menu 重新挂载后单击只展开一次（无残留双绑）", () =>
    menuEl2.matches(":popover-open") && menuTrigger2.getAttribute("aria-expanded") === "true");
  menuRoot2.unmount();
  hostMenu.remove();

  /* ---------------- ContextMenu ---------------- */
  const hostCtx = document.createElement("div");
  document.body.appendChild(hostCtx);
  const ctxRoot = createRoot(hostCtx);
  const ctxSelections: MenuEntry[] = [];
  ctxRoot.render(
    <ContextMenu
      items={MENU_ITEMS}
      aria-label="Context"
      onSelect={(entry) => ctxSelections.push(entry)}
    >
      <div id="ctx-area" tabIndex={0}>
        Right-click here
      </div>
    </ContextMenu>
  );
  await wait(40);
  const ctxBox = hostCtx.querySelector(".menu-box") as HTMLElement;
  const ctxContent = ctxBox.querySelector(".menu-box__content") as HTMLElement;
  const ctxMenuEl = ctxBox.querySelector("ul.menu") as HTMLElement;
  const ctxEntries = Array.from(ctxMenuEl.querySelectorAll(".menu__item")) as HTMLElement[];
  const ctxArea = document.getElementById("ctx-area") as HTMLElement;
  check("ContextMenu DOM = div.menu-box > div.menu-box__content + ul.menu", () =>
    ctxBox.className === "menu-box" &&
    ctxContent.parentElement === ctxBox &&
    ctxArea.parentElement === ctxContent &&
    ctxMenuEl.getAttribute("popover") === "manual" &&
    !ctxBox.hasAttribute("data-menu"));
  // 控制器是 useEffect 里建的，CI 上可能比固定 sleep 慢：等 createMenu 补的 tabindex。
  await waitFor(() => ctxMenuEl.hasAttribute("tabindex"));
  const ctxNotPrevented = rightClick(ctxArea);
  await waitFor(() => ctxMenuEl.matches(":popover-open"));
  check("ContextMenu 右键打开菜单", () => ctxMenuEl.matches(":popover-open"));
  check("ContextMenu 右键拦截浏览器菜单（contextmenu 被 preventDefault）", () =>
    ctxNotPrevented === false);
  ctxEntries[0].click();
  await waitFor(() => ctxSelections.length > 0);
  check("ContextMenu 选择回调", () => {
    const entry = ctxSelections[ctxSelections.length - 1];
    return ctxSelections.length === 1 && !("separator" in entry) && entry.value === "new";
  });
  check("ContextMenu 选择后关闭", () => !ctxMenuEl.matches(":popover-open"));
  rightClick(ctxArea);
  await wait(20);
  key(ctxMenuEl, "Escape");
  await wait(20);
  check("ContextMenu Esc 关闭", () => !ctxMenuEl.matches(":popover-open"));
  ctxRoot.unmount();
  hostCtx.remove();

  /* ---------------- Window ---------------- */
  const hostWin = document.createElement("div");
  document.body.appendChild(hostWin);
  const winRoot = createRoot(hostWin);
  const winRef = createRef<HTMLDivElement>();
  const windowActions: { action: WindowAction; event: Event }[] = [];
  winRoot.render(
    <Theme theme="win11" id="win-theme">
      <Window
        ref={winRef}
        id="win-win11"
        frame="win11"
        title="Settings"
        onAction={(action, event) => windowActions.push({ action, event })}
      >
        <p id="win11-body">Body copy</p>
      </Window>
      <Window id="win-macos" frame="macos" title="Settings" />
      <Window id="win-gnome" frame="gnome" title="Settings" />
      <Window id="win-xp" frame="winxp" title="Settings" />
      <Window id="win-custom" frame="win11" title="Custom" controls={["close"]} />
    </Theme>
  );
  await wait(40);
  const win11 = document.getElementById("win-win11") as HTMLElement;
  const win11Bar = win11.querySelector(".window__bar") as HTMLElement;
  const win11Captions = Array.from(
    win11.querySelectorAll(".window__controls .window__caption")
  ) as HTMLButtonElement[];
  check("Window DOM = div.window[data-window-frame] > .window__bar + .window__body", () =>
    win11.className === "window" &&
    win11.getAttribute("data-window-frame") === "win11" &&
    !win11.hasAttribute("data-window") &&
    !!win11Bar &&
    win11.querySelector(".window__body")?.contains(document.getElementById("win11-body")) === true);
  check("Window forwardRef 指向窗口根节点", () => winRef.current === win11);
  check("Window 标题进 .window__title", () =>
    win11.querySelector(".window__title")?.textContent === "Settings");
  check("Windows frame 默认三个窗口按钮（– □ ✕，close 带修饰类）", () =>
    win11Captions.length === 3 &&
    win11Captions.map((btn) => btn.getAttribute("data-window-action")).join(",") ===
      "minimize,maximize,close" &&
    win11Captions.map((btn) => btn.textContent).join("") === "–□✕" &&
    win11Captions[2].classList.contains("window__caption--close") &&
    win11Captions.every((btn) => !!btn.getAttribute("aria-label")));
  const xp = document.getElementById("win-xp") as HTMLElement;
  const xpMin = xp.querySelector('[data-window-action="minimize"]') as HTMLElement;
  check("Windows XP 最小化 glyph 是下划线", () => xpMin.textContent === "_");
  const gnome = document.getElementById("win-gnome") as HTMLElement;
  check("GNOME frame 只有关闭按钮", () => {
    const buttons = gnome.querySelectorAll(".window__caption");
    return (
      buttons.length === 1 &&
      buttons[0].getAttribute("data-window-action") === "close" &&
      !gnome.querySelector(".window__traffic")
    );
  });
  check("controls 显式传入时只渲染指定按钮", () => {
    const custom = document.getElementById("win-custom") as HTMLElement;
    const buttons = custom.querySelectorAll(".window__caption");
    return buttons.length === 1 && buttons[0].getAttribute("data-window-action") === "close";
  });
  const mac = document.getElementById("win-macos") as HTMLElement;
  const macDots = Array.from(mac.querySelectorAll(".window__traffic-dot")) as HTMLElement[];
  check("macOS frame 用 .window__traffic 红绿灯 + 内联 SVG glyph", () =>
    !!mac.querySelector(".window__traffic") &&
    macDots.length === 3 &&
    macDots[0].classList.contains("window__traffic-dot--close") &&
    macDots[1].classList.contains("window__traffic-dot--min") &&
    macDots[2].classList.contains("window__traffic-dot--zoom") &&
    macDots.map((dot) => dot.getAttribute("data-window-action")).join(",") ===
      "close,minimize,maximize" &&
    macDots.every((dot) => !!dot.querySelector(".window__traffic-glyph > svg")) &&
    macDots[0].querySelector("svg path")?.getAttribute("d") === "M3.1 3.1l5.8 5.8M8.9 3.1L3.1 8.9" &&
    macDots[2].getAttribute("aria-label") === "缩放");
  (win11Captions[2] as HTMLButtonElement).click();
  await wait(20);
  check("Window 关闭按钮派发 action=close 并带事件对象", () =>
    windowActions.length === 1 &&
    windowActions[0].action === "close" &&
    windowActions[0].event instanceof Event);
  (win11Captions[0] as HTMLButtonElement).click();
  await wait(20);
  check("Window 最小化按钮派发 action=minimize", () =>
    windowActions.length === 2 && windowActions[1].action === "minimize");
  const winBody = win11.querySelector(".window__body") as HTMLElement;
  const winCtxNotPrevented = rightClick(winBody);
  await wait(20);
  check("Window 右键拦截浏览器菜单（contextmenu 被 preventDefault）", () =>
    winCtxNotPrevented === false);
  winRoot.unmount();
  hostWin.remove();

  const hostWin2 = document.createElement("div");
  document.body.appendChild(hostWin2);
  const winRoot2 = createRoot(hostWin2);
  let win2Actions = 0;
  winRoot2.render(
    <Window
      frame="win11"
      title="Cleanup"
      onAction={() => {
        win2Actions += 1;
      }}
    />
  );
  await wait(40);
  const win2 = hostWin2.querySelector(".window") as HTMLElement;
  await waitFor(() => win2.hasAttribute("data-window-ready"));
  check("createWindow 挂载后写 data-window-ready", () => win2.hasAttribute("data-window-ready"));
  (win2.querySelector('[data-window-action="close"]') as HTMLElement).click();
  await wait(20);
  check("Window 卸载前 action 派发一次", () => win2Actions === 1);
  winRoot2.unmount();
  await wait(20);
  (win2.querySelector('[data-window-action="close"]') as HTMLElement).click();
  await wait(20);
  check("Window 卸载后控制器监听已移除（不再派发 action）", () => win2Actions === 1);
  hostWin2.remove();

  /* ---------------- v0.2 StrictMode：mount → cleanup → mount ---------------- */
  const hostSM = document.createElement("div");
  document.body.appendChild(hostSM);
  const smRoot = createRoot(hostSM);
  let smEffectProbe = 0;
  function V2EffectProbe() {
    useEffect(() => {
      smEffectProbe += 1;
    }, []);
    return null;
  }
  const smSegChanges: string[] = [];
  const smTabChanges: string[] = [];
  const smMenuSelections: string[] = [];
  const smWindowActions: WindowAction[] = [];
  smRoot.render(
    <StrictMode>
      <SegmentedControl
        options={SEG_OPTIONS}
        defaultValue="week"
        onValueChange={(value) => {
          smSegChanges.push(value);
        }}
      />
      <Tabs
        items={TAB_ITEMS}
        defaultValue="general"
        onValueChange={(value) => {
          smTabChanges.push(value);
        }}
      >
        {TAB_PANELS}
      </Tabs>
      <Menu
        className="sm-menu"
        trigger={<Button id="sm-menu-trigger">Actions</Button>}
        items={MENU_ITEMS}
        onSelect={(entry) => {
          if (!("separator" in entry) && entry.value) smMenuSelections.push(entry.value);
        }}
      />
      <TooltipProvider>
        <Tooltip text="sm tip">
          <Button id="sm-tip">Tip</Button>
        </Tooltip>
      </TooltipProvider>
      <Window
        id="sm-window"
        frame="win11"
        title="Strict"
        onAction={(action) => {
          smWindowActions.push(action);
        }}
      />
      <V2EffectProbe />
    </StrictMode>
  );
  await wait(30);
  check("v0.2 组件跑在 StrictMode 双执行下", () => smEffectProbe === 2);
  check("StrictMode 下每个控制器组件只有一套 DOM", () =>
    hostSM.querySelectorAll(".segmented").length === 1 &&
    hostSM.querySelectorAll(".tabs").length === 1 &&
    hostSM.querySelectorAll(".menu-box").length === 1 &&
    hostSM.querySelectorAll(".tooltip-host").length === 1 &&
    hostSM.querySelectorAll(".window").length === 1);
  const smSegItems = Array.from(hostSM.querySelectorAll(".segmented__item")) as HTMLElement[];
  smSegItems[2].click();
  await wait(20);
  check("StrictMode 下 Segmented 单击只回调一次", () =>
    smSegChanges.length === 1 && smSegChanges[0] === "month");
  const smTabItems = Array.from(hostSM.querySelectorAll(".tabs__tab")) as HTMLElement[];
  smTabItems[2].click();
  await wait(20);
  check("StrictMode 下 Tabs 单击只回调一次", () =>
    smTabChanges.length === 1 && smTabChanges[0] === "about");
  const smTrigger = document.getElementById("sm-menu-trigger") as HTMLButtonElement;
  const smMenuEl = hostSM.querySelector(".sm-menu .menu") as HTMLElement;
  smTrigger.click();
  await wait(20);
  check("StrictMode 下 Menu 单击只展开一次", () =>
    smMenuEl.matches(":popover-open") && smTrigger.getAttribute("aria-expanded") === "true");
  (hostSM.querySelector(".sm-menu [data-entry-index='3']") as HTMLElement).click();
  await wait(20);
  check("StrictMode 下 Menu 选择只回调一次", () =>
    smMenuSelections.length === 1 && smMenuSelections[0] === "rename");
  const smWindow = document.getElementById("sm-window") as HTMLElement;
  (smWindow.querySelector('[data-window-action="close"]') as HTMLElement).click();
  await wait(20);
  check("StrictMode 下 Window action 只派发一次", () =>
    smWindowActions.length === 1 && smWindowActions[0] === "close");
  smRoot.unmount();
  hostSM.remove();

  v2Root.unmount();
  v2RootEl.remove();

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
