import * as vscode from "vscode";
import { watch } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  ids,
  label,
  titles,
  type ThemeId,
  type Mode,
  validateSelection,
} from "../../core/src/tokens.js";
import {
  desired,
  select,
  record,
  stateRoot,
  readJson,
  type Selection,
} from "../../core/src/state.js";
let panel: vscode.WebviewPanel | undefined;
export async function activate(context: vscode.ExtensionContext) {
  await mkdir(stateRoot(), { recursive: true });
  let applying = false;
  let handled = "";
  if (
    !(await desired("vscode")) &&
    !(await readJson(join(stateRoot(), "vscode.receipt.json"), null))
  )
    await select("endfield", "system", "vscode");
  const keys = [
    "workbench.colorTheme",
    "workbench.preferredLightColorTheme",
    "workbench.preferredDarkColorTheme",
    "window.autoDetectColorScheme",
  ];
  async function apply() {
    if (applying) return;
    applying = true;
    try {
      const choice = await desired("vscode");
      const receipt = await readJson<any>(
        join(stateRoot(), "vscode.receipt.json"),
        null,
      );
      if (!choice) {
        if (
          receipt?.phase === "restored" ||
          receipt?.phase === "reload-required"
        ) {
          const backup =
            context.globalState.get<Record<string, unknown>>("backup");
          const owned =
            context.globalState.get<Record<string, unknown>>("owned");
          if (backup && owned) {
            for (const key of keys) {
              const current = vscode.workspace
                .getConfiguration()
                .inspect(key)?.globalValue;
              if (current === owned[key])
                await vscode.workspace
                  .getConfiguration()
                  .update(key, backup[key], vscode.ConfigurationTarget.Global);
            }
            await context.globalState.update("backup", undefined);
            await context.globalState.update("owned", undefined);
            handled = "";
          }
        }
        if (receipt?.phase === "reload-required")
          await record(
            "vscode",
            "restored",
            "Owned native settings restored; later user changes preserved.",
          );
        return;
      }
      if (choice.revision === handled) return;
      if (!context.globalState.get("backup")) {
        const backup: Record<string, unknown> = {};
        for (const key of keys)
          backup[key] = vscode.workspace
            .getConfiguration()
            .inspect(key)?.globalValue;
        await context.globalState.update("backup", backup);
      }
      const mode =
        choice.mode === "system"
          ? vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light
            ? "light"
            : "dark"
          : choice.mode;
      const owned: Record<string, unknown> = {
        "workbench.colorTheme": label(choice.themeId, mode),
        "workbench.preferredLightColorTheme": label(choice.themeId, "light"),
        "workbench.preferredDarkColorTheme": label(choice.themeId, "dark"),
        "window.autoDetectColorScheme": choice.mode === "system",
      };
      for (const key of keys)
        await vscode.workspace
          .getConfiguration()
          .update(key, owned[key], vscode.ConfigurationTarget.Global);
      await context.globalState.update("owned", owned);
      handled = choice.revision;
      await record(
        "vscode",
        "applied",
        "Native theme applied; enhancement is a separately managed CSS patch.",
        choice.revision,
      );
    } catch (e: any) {
      const s = await desired("vscode");
      await record("vscode", "compatibility-failed", e.message, s?.revision);
    } finally {
      applying = false;
    }
  }
  let timer: NodeJS.Timeout | undefined;
  const watcher = watch(stateRoot(), (_event, file) => {
    if (file === "vscode.json" || file === "vscode.receipt.json") {
      clearTimeout(timer);
      timer = setTimeout(() => void apply(), 150);
    }
  });
  context.subscriptions.push({
    dispose() {
      watcher.close();
      clearTimeout(timer);
    },
  });
  context.subscriptions.push(
    vscode.commands.registerCommand("arktheme.open", () => openPanel(context)),
    vscode.commands.registerCommand("arktheme.sync", async () => {
      const id = await vscode.window.showQuickPick(
        ids.map((id) => ({ label: titles[id], id })),
      );
      if (id) {
        const mode = await vscode.window.showQuickPick([
          "system",
          "light",
          "dark",
        ]);
        if (mode) {
          await select(id.id, mode as Mode, "all");
          await apply();
          vscode.window.showInformationMessage(
            "Two selections saved. Codex needs the running Ark bridge to apply automatically.",
          );
        }
      }
    }),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!applying && e.affectsConfiguration("workbench.colorTheme")) {
        const current = vscode.workspace
          .getConfiguration()
          .get<string>("workbench.colorTheme");
        for (const id of ids)
          for (const mode of ["light", "dark"] as const)
            if (current === label(id, mode)) {
              void desired("vscode")
                .then(async (s) => {
                  if (s?.mode === "system" && s.themeId === id) {
                    const owned =
                      context.globalState.get<Record<string, unknown>>("owned");
                    if (owned) {
                      owned["workbench.colorTheme"] = vscode.workspace
                        .getConfiguration()
                        .inspect("workbench.colorTheme")?.globalValue;
                      await context.globalState.update("owned", owned);
                    }
                    return;
                  }
                  return select(id, mode, "vscode");
                })
                .catch((e) =>
                  vscode.window.showErrorMessage(`Ark Theme: ${e.message}`),
                );
              return;
            }
        handled = "";
        void rm(join(stateRoot(), "vscode.json"), { force: true })
          .then(() =>
            record(
              "vscode",
              "manual-required",
              "A non-Ark native theme was selected; automatic application paused.",
            ),
          )
          .catch(() => {});
      }
    }),
  );
  const heartbeat = setInterval(() => {
    void desired("vscode")
      .then((s) => {
        if (s?.revision === handled)
          return record(
            "vscode",
            "applied",
            "Native theme active; extension heartbeat.",
            s.revision,
          );
      })
      .catch(() => {});
  }, 15000);
  context.subscriptions.push({ dispose: () => clearInterval(heartbeat) });
  await apply();
}
function openPanel(context: vscode.ExtensionContext) {
  if (panel) {
    panel.reveal();
    return;
  }
  panel = vscode.window.createWebviewPanel(
    "arktheme",
    "Oh My Ark / Theme Atlas",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: false,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "assets")],
    },
  );
  const nonce = String(Date.now());
  const webview = panel.webview;
  webview.html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"><meta name="viewport" content="width=device-width"><style>body{font-family:var(--vscode-font-family);padding:32px;color:var(--vscode-foreground);background:var(--vscode-editor-background)}h1{font-size:38px}p{line-height:1.8}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}article{border:1px solid var(--vscode-panel-border);padding:12px}img{width:100%}button,select{padding:9px;margin:4px;border:1px solid var(--vscode-focusBorder);color:var(--vscode-button-foreground);background:var(--vscode-button-background);cursor:pointer}:focus-visible{outline:2px solid var(--vscode-focusBorder)}#status{min-height:30px}</style><h1>OH / MY / ARK</h1><p>终末地 · 众生行记 · 火山旅梦<br>配色可独立使用。Codex 同步需要启动增强桥；首次安装 VS Code 背景需运行增强安装命令并重载。</p><label>明暗 <select id="mode"><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label><div id="status" role="status"></div><main class="grid">${ids.map((id) => `<article><img src="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "assets", `${id}-light-cover.webp`))}" alt="${titles[id]} light"><img src="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "assets", `${id}-dark-cover.webp`))}" alt="${titles[id]} dark"><h2>${titles[id]}</h2><button data-id="${id}" data-target="vscode">仅 VS Code</button><button data-id="${id}" data-target="codex">仅 Codex</button><button data-id="${id}" data-target="all">同步两端</button></article>`).join("")}</main><script nonce="${nonce}">const api=acquireVsCodeApi();document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>api.postMessage({id:b.dataset.id,target:b.dataset.target,mode:document.getElementById('mode').value})));window.addEventListener('message',e=>document.getElementById('status').textContent=e.data.message);</script></html>`;
  const subscription = webview.onDidReceiveMessage(async (m) => {
    try {
      validateSelection(m.id, m.mode);
      if (!["codex", "vscode", "all"].includes(m.target))
        throw Error("Invalid target");
      await select(m.id as ThemeId, m.mode, m.target);
      await webview.postMessage({
        message: "选择已保存。VS Code 将应用；Codex 等待运行中的增强桥。",
      });
    } catch (e: any) {
      await webview.postMessage({ message: e.message });
    }
  });
  panel.onDidDispose(() => {
    subscription.dispose();
    panel = undefined;
  });
}
export function deactivate() {
  panel?.dispose();
}
