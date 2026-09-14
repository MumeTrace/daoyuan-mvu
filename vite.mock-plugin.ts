import * as fs from "node:fs";
import type { Plugin } from "vite";
import { transformWithEsbuild } from "vite";

/** Compile the typed development host to a classic IIFE before the app loads. */
export function createMvuMockPlugin(
  mockPath: string,
  onlyPath?: string,
): Plugin {
  let compiledMock: Promise<string> | null = null;

  const compile = (): Promise<string> => {
    compiledMock ??= transformWithEsbuild(
      fs.readFileSync(mockPath, "utf8"),
      mockPath,
      {
        loader: "ts",
        target: "es2022",
        format: "iife",
        minify: false,
      },
    ).then(result => result.code);
    return compiledMock;
  };

  return {
    name: "mvu-typed-mock-plugin",
    apply: "serve",
    transformIndexHtml: {
      order: "pre",
      async handler(html, context) {
        if (onlyPath && context.path !== onlyPath) return html;
        return [
          {
            tag: "script",
            children: await compile(),
            injectTo: "head-prepend",
          },
        ];
      },
    },
  };
}
