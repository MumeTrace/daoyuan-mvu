import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { createMvuMockPlugin } from "../vite.mock-plugin";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  root: projectRoot,
  plugins: [
    vue(),
    createMvuMockPlugin(
      path.resolve(projectRoot, "src/adapters/mock.ts"),
      "/src/index.html",
    ),
  ],
  appType: "mpa",
  server: {
    host: "127.0.0.1",
    port: 5174,
    open: "/tavern/",
  },
});
