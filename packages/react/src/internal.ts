/* ============================================================
   internal.ts — 适配层自用的小工具，不进公共导出

   只做 class 拼接和 ref 合并这两件与框架生命周期有关的事，
   不碰 DOM 状态，也不实现任何组件行为。
   ============================================================ */
import { useCallback, useRef } from "react";
import type { Ref, RefCallback } from "react";

/** 拼接 class：className 为空时不留下多余空格。 */
export function cx(base: string, className?: string): string {
  return className ? base + " " + className : base;
}

/** 把值写进 callback ref 或 object ref。 */
export function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/**
 * 合并多个 ref，返回稳定的 callback ref。
 *
 * 组件既要拿到内部 DOM 节点建控制器，又要转发调用方的 ref；
 * 用固定 identity 的回调避免每次渲染都把 ref 置空再挂上（那会丢焦点）。
 */
export function useMergedRef<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  const latest = useRef(refs);
  latest.current = refs;
  return useCallback((value: T | null) => {
    latest.current.forEach((ref) => assignRef(ref, value));
  }, []);
}
