#!/usr/bin/env node
import { readFile, access } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ids,
  titles,
  validateSelection,
  type ThemeId,
  type Mode,
} from "../../core/src/tokens.js";
import {
  select,
  status,
  desired,
  clear,
  record,
  stateRoot,
  readJson,
} from "../../core/src/state.js";
import { patchVSCode } from "../../core/src/vscode-patch.js";
import {
  applyCodex,
  bridge,
  platform,
  stopBridge,
} from "../../core/src/codex.js";
const args = process.argv.slice(2),
  command = args[0] || "help";
const option = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return fallback;
  if (!args[i + 1] || args[i + 1].startsWith("--"))
    throw Error(`Missing --${name} value`);
  return args[i + 1];
};
const root = resolve(
  process.env.ARKTHEME_ROOT ||
    join(dirname(fileURLToPath(import.meta.url)), ".."),
);
const output = (x: unknown) => console.log(JSON.stringify(x, null, 2));
async function main() {
  const target = option("target", "all");
  if (!["all", "codex", "vscode"].includes(target))
    throw Error("Invalid target");
  const targets =
    target === "all"
      ? (["codex", "vscode"] as const)
      : [target as "codex" | "vscode"];
  const port = Number(option("port", "9357"));
  switch (command) {
    case "list":
      output(
        ids.map((id) => ({
          id,
          title: titles[id],
          modes: ["light", "dark", "system"],
        })),
      );
      break;
    case "apply": {
      const id = args[1],
        mode = option("mode", "system");
      validateSelection(id, mode);
      await select(id, mode as Mode, target as any);
      if (targets.includes("codex")) {
        try {
          await applyCodex(root, port);
        } catch (e: any) {
          const s = await desired("codex");
          await record("codex", "pending-start", e.message, s?.revision);
        }
      }
      output(await status());
      break;
    }
    case "status":
      output({
        ...(await status()),
        vscodeEnhancement: await readJson(
          join(stateRoot(), "vscode-enhancement.json"),
          null,
        ),
      });
      break;
    case "doctor": {
      const checks: any = {
        node: process.version,
        platform: process.platform,
        stateRoot: stateRoot(),
        root,
      };
      try {
        checks.codex = await platform(root, "discover", port);
      } catch (e: any) {
        checks.codex = { error: e.message };
      }
      for (const name of [
        "assets/generated/vscode-enhanced.css",
        "packages/vscode/assets/catalog.json",
        "vendor/dream-skin/PROVENANCE.json",
      ]) {
        try {
          await access(join(root, name));
          checks[name] = "present";
        } catch {
          checks[name] = "missing";
        }
      }
      checks.note =
        "Presence checks do not certify real-app compatibility. Native-only Codex requires manual Appearance settings.";
      output(checks);
      break;
    }
    case "enhance":
    case "disable": {
      if (target !== "vscode")
        throw Error(
          "Use --target vscode with --app-root <resources/app>. Codex uses launch/bridge.",
        );
      const appRoot = option("app-root", "");
      if (!appRoot) throw Error("--app-root required");
      output(
        await patchVSCode(
          appRoot,
          await readFile(
            join(root, "assets/generated/vscode-enhanced.css"),
            "utf8",
          ),
          command === "enhance",
        ),
      );
      break;
    }
    case "launch": {
      if (target !== "codex") throw Error("Use launch --target codex");
      if (!(await desired("codex")))
        await select("endfield", "system", "codex");
      output(await platform(root, "launch", port));
      console.log(
        "Bridge running; Ctrl+C pauses decoration. Full restore closes the debug app and returns to normal launch.",
      );
      await bridge(root, port);
      break;
    }
    case "bridge":
      await bridge(root, port);
      break;
    case "pause":
      await stopBridge();
      try {
        output(await applyCodex(root, port, true));
      } catch (e: any) {
        output({ phase: "pending-start", message: e.message });
      }
      break;
    case "restore": {
      let failed = false;
      for (const t of targets) {
        try {
          if (t === "codex") {
            await stopBridge();
            let attached = false;
            try {
              await applyCodex(root, port, true);
              attached = true;
            } catch {}
            let owned = false;
            try {
              await access(
                join(
                  stateRoot(),
                  process.platform === "win32"
                    ? "codex-launch.json"
                    : "codex-launch.port",
                ),
              );
              owned = true;
            } catch {}
            if (owned) output(await platform(root, "restore", port));
            else if (attached)
              throw Error(
                "Decoration removed, but debug app was not launched by this project. Restart Codex normally to close its port; no process was stopped.",
              );
            await clear(t);
            output({ target: t, phase: "restored" });
          } else {
            const installed = await readJson<any>(
              join(stateRoot(), "vscode-enhancement.json"),
              null,
            );
            const appRoot = option(
              "app-root",
              installed?.enabled ? installed.appRoot : "",
            );
            if (appRoot) output(await patchVSCode(appRoot, "", false));
            await clear(t);
            output({
              target: t,
              phase: "reload-required",
              message:
                "Extension restores managed color settings on next activation; reload if background patch was removed.",
            });
          }
        } catch (e: any) {
          failed = true;
          output({
            target: t,
            phase: "compatibility-failed",
            message: e.message,
          });
        }
      }
      if (failed) process.exitCode = 1;
      break;
    }
    default:
      console.log(
        `arktheme list\narktheme apply <endfield|masses|siesta> --mode <light|dark|system> --target <all|codex|vscode>\narktheme status | doctor\narktheme enhance|disable --target vscode --app-root <VS Code resources/app>\narktheme launch --target codex [--port 9357]\narktheme bridge [--port 9357]\narktheme pause\narktheme restore --target <all|codex|vscode> [--app-root <path>]\nEnvironment: ARKTHEME_HOME overrides state directory; ARKTHEME_ROOT overrides asset root.`,
      );
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
