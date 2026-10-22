import { defineConfig } from "vite";

// 验收页用 file:// + headless Chrome 跑（tools/test-fixture.sh），
// 所以产物里所有引用都得是相对路径；组件是 render function，不需要 Vue 插件。
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
