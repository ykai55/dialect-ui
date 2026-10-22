import { defineConfig } from "vite";

// 验收页用 vite build 出 dist/，再由 tools/test-fixture.sh 用 headless Chrome 打开 file://。
// - base "./"：file:// 下资源用相对路径，不能以 / 开头。
// - define process.env.NODE_ENV = development：让 React 走开发构建，StrictMode 才会真的
//   mount → cleanup → mount。只写 mode: "development" 不够 —— vite build 在读取配置前就把
//   进程的 NODE_ENV 定成 production 了，React 会被编译成生产构建，StrictMode 断言等于空跑。
export default defineConfig({
  base: "./",
  mode: "development",
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
  },
  esbuild: { jsx: "automatic" },
  build: { outDir: "dist", emptyOutDir: true },
});
