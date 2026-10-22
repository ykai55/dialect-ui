/* ============================================================
   @dialect-ui/core — 手写的公共类型

   和 src/index.js 的导出一一对应。行为契约见 docs/framework-packages.md。
   ============================================================ */

export interface MenuOpenOptions {
  /** 锚点元素；不传时用 createMenu 的 options.anchor */
  anchor?: Element;
  /** 视口坐标定位（右键菜单用） */
  point?: { x: number; y: number };
  /** 关闭时焦点归还的目标 */
  invoker?: Element;
}

export interface MenuCloseOptions {
  /** 关闭后是否把焦点还给 invoker，默认 true */
  restoreFocus?: boolean;
}

export interface MenuOptions {
  /** 触发器集合：菜单开着时按下它们只关不开 */
  triggers?: Element[];
  /** 默认锚点 */
  anchor?: Element;
  /** 收 aria-activedescendant 的元素，默认菜单本身 */
  activeHost?: HTMLElement;
  /** 打开后是否把焦点移到 activeHost，默认 true */
  focusOnOpen?: boolean;
  /** 打开时的高亮策略，默认 "none" */
  initialActive?: "none" | "first" | "selected";
  /** 菜单最小宽度跟随锚点，下拉框用 */
  matchAnchorWidth?: boolean;
  /** ARIA 角色，默认 "menu" */
  role?: "menu" | "listbox";
  onOpen?: () => void;
  onClose?: () => void;
  onChoose?: (item: HTMLElement, index: number) => void;
}

export interface MenuController {
  el: HTMLElement;
  menu: HTMLElement;
  open(opts?: MenuOpenOptions): void;
  close(opts?: MenuCloseOptions): void;
  isOpen(): boolean;
  setActive(index: number): void;
  move(dir: 1 | -1): void;
  first(): void;
  last(): void;
  activate(): void;
  typeahead(key: string): number;
  /** 菜单开着时按下自己的触发器，click 里用来避免「关不掉」 */
  consumePointerDismiss(): boolean;
  /** 重新收集菜单项 */
  refresh(): void;
  destroy(): void;
}

export interface SelectOptions {
  onChange?: (value: string, index: number, item: HTMLElement) => void;
  onOpenChange?: (open: boolean) => void;
}

export interface SelectController {
  el: HTMLElement;
  open(opts?: MenuOpenOptions): void;
  close(opts?: MenuCloseOptions): void;
  isOpen(): boolean;
  select(index: number, opts?: { silent?: boolean }): void;
  selectedIndex(): number;
  value(): string;
  destroy(): void;
}

export interface SegmentedOptions {
  onChange?: (value: string, index: number, item: HTMLElement) => void;
}

export interface SegmentedController {
  el: HTMLElement;
  select(index: number, opts?: { silent?: boolean }): boolean;
  selectedIndex(): number;
  value(): string;
  destroy(): void;
}

export interface TabsOptions {
  onChange?: (value: string, index: number, tab: HTMLElement) => void;
}

export interface TabsController {
  el: HTMLElement;
  select(index: number, opts?: { silent?: boolean }): boolean;
  selectedIndex(): number;
  value(): string;
  destroy(): void;
}

export interface TooltipController {
  el: HTMLElement;
  show(target: HTMLElement): void;
  hide(): void;
  destroy(): void;
}

export interface WindowOptions {
  [key: string]: unknown;
}

export interface WindowController {
  el: HTMLElement;
  options: WindowOptions;
  destroy(): void;
}

export interface TextMenuController {
  el: HTMLElement;
  destroy(): void;
}

export interface SliderController {
  el: HTMLInputElement;
  destroy(): void;
}

export function initAll(root?: ParentNode): void;
export function initMenus(root?: ParentNode): void;
export function initMenuBox(box: Element): void;
export function initTextMenus(root?: ParentNode): void;
export function initWindows(root?: ParentNode): void;
export function initSelects(root?: ParentNode): void;
export function initSegmenteds(root?: ParentNode): void;
export function initTabs(root?: ParentNode): void;
export function initSliders(root?: ParentNode): void;
export function initTooltips(root?: ParentNode): void;

export function createMenu(menuEl: HTMLElement, options?: MenuOptions): MenuController;
export function createSelect(rootEl: HTMLElement, options?: SelectOptions): SelectController | null;
export function createSegmented(
  rootEl: HTMLElement,
  options?: SegmentedOptions
): SegmentedController | null;
export function createTabs(rootEl: HTMLElement, options?: TabsOptions): TabsController | null;
export function createSlider(el: HTMLInputElement): SliderController;
export function createTooltip(layer: HTMLElement): TooltipController;
export function createTextMenu(menuEl: HTMLElement): TextMenuController;
export function createWindow(el: HTMLElement, options?: WindowOptions): WindowController | null;
