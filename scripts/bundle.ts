import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["packages/cli/src/cli.ts"],
  outfile: "dist/cli.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
});
await build({
  entryPoints: ["packages/vscode/src/extension.ts"],
  outfile: "packages/vscode/dist/extension.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  external: ["vscode"],
});
