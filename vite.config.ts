import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  build: {
    // 운영 번들에 소스맵을 싣지 않는다 — 원본 소스·주석·API 경로 구조가 그대로 공개된다.
    sourcemap: false
  },
  server: {
    port: 5173,
    host: true
  }
});
