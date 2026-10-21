import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdir, open, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { palettes } from "./tokens.js";
import { stateRoot, desired, record, readJson } from "./state.js";
import { rendererExpression } from "./codex-renderer.js";
const exec = promisify(execFile);
export async function platform(
  root: string,
  action: "verify" | "discover" | "launch" | "restore",
  port = 9357,
) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw Error("Invalid local port");
  const args =
    process.platform === "win32"
      ? [
          "-NoProfile",
          "-File",
          join(root, "scripts", "codex-platform.ps1"),
          "-Action",
          action,
          "-Port",
          String(port),
          "-ArkState",
          stateRoot(),
        ]
      : [
          join(root, "scripts", "codex-platform.sh"),
          action,
          String(port),
          stateRoot(),
        ];
  if (!["win32", "darwin"].includes(process.platform))
    throw Error("Codex enhanced bridge supports Windows and macOS only");
  if (action === "launch" && process.env.ARKTHEME_ALLOW_UNVERIFIED !== "1")
    throw Error(
      "Codex enhanced versions have not yet passed local acceptance. Native cards remain available. Set ARKTHEME_ALLOW_UNVERIFIED=1 only for explicit experimental validation.",
    );
  const r = await exec(
    process.platform === "win32" ? "powershell.exe" : "/bin/bash",
    args,
    { windowsHide: true, timeout: 60000, maxBuffer: 1024 * 1024 },
  );
  return JSON.parse(r.stdout.trim());
}
export function safeTarget(target: any, port: number) {
  try {
    const ws = new URL(target.webSocketDebuggerUrl);
    const page = new URL(target.url);
    return (
      target.type === "page" &&
      ws.protocol === "ws:" &&
      !ws.username &&
      !ws.password &&
      !ws.search &&
      !ws.hash &&
      ["127.0.0.1", "localhost", "[::1]"].includes(ws.hostname) &&
      Number(ws.port) === port &&
      /^\/devtools\/page\/[a-zA-Z0-9._-]+$/.test(ws.pathname) &&
      ["file:", "app:", "codex:"].includes(page.protocol)
    );
  } catch {
    return false;
  }
}
async function evaluate(url: string, expression: string) {
  return new Promise<any>((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => {
      socket.close();
      reject(Error("CDP evaluation timed out"));
    }, 5000);
    const finish = (error: any, value?: any) => {
      clearTimeout(timer);
      socket.close();
      error ? reject(error) : resolve(value);
    };
    socket.onopen = () =>
      socket.send(
        JSON.stringify({
          id: 1,
          method: "Runtime.evaluate",
          params: { expression, returnByValue: true },
        }),
      );
    socket.onerror = () => finish(Error("CDP socket failed"));
    socket.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id === 1) {
        if (msg.error || msg.result?.exceptionDetails)
          finish(Error("Renderer rejected injection"));
        else finish(null, msg.result?.result?.value);
      }
    };
  });
}
export async function applyCodex(root: string, port = 9357, remove = false) {
  const s = await desired("codex");
  if (!s && !remove) return null;
  await platform(root, "verify", port);
  if (!remove && process.env.ARKTHEME_ALLOW_UNVERIFIED !== "1")
    throw Error(
      "Codex enhanced compatibility is unverified; native appearance preserved. Experimental validation requires ARKTHEME_ALLOW_UNVERIFIED=1.",
    );
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
    signal: AbortSignal.timeout(3000),
    redirect: "error",
  });
  if (!response.ok) throw Error("CDP target listing failed");
  const targets = ((await response.json()) as any[]).filter((t) =>
    safeTarget(t, port),
  );
  if (!targets.length) throw Error("No trusted Codex page target");
  const images: Record<string, string> = {};
  if (s && !remove)
    for (const m of ["light", "dark"])
      for (const k of ["cover", "work"])
        images[`${m}-${k}`] =
          `data:image/webp;base64,${(await readFile(join(root, "packages/vscode/assets", `${s.themeId}-${m}-${k}.webp`))).toString("base64")}`;
  const results = [];
  for (const t of targets) {
    if (!remove) {
      const existing = await evaluate(
        t.webSocketDebuggerUrl,
        `window.__ARK_THEME_REVISION__ === ${JSON.stringify(s!.revision)} && !!document.getElementById('oh-my-ark-theme')`,
      );
      if (existing) {
        results.push({ applied: true });
        continue;
      }
    }
    const expression = rendererExpression({
      id: s?.themeId || "endfield",
      mode: s?.mode || "system",
      palettes,
      images,
      remove,
    });
    const result = await evaluate(t.webSocketDebuggerUrl, expression);
    if (result?.applied)
      await evaluate(
        t.webSocketDebuggerUrl,
        `window.__ARK_THEME_REVISION__=${JSON.stringify(s!.revision)}`,
      );
    results.push(result);
  }
  if (!remove) {
    const ok = results.every((r) => r?.applied);
    return record(
      "codex",
      ok ? "applied" : "compatibility-failed",
      ok
        ? `${results.length} verified page(s) styled.`
        : "Some pages lack required DOM anchors.",
      s!.revision,
    );
  }
  return results;
}
export async function bridge(root: string, port = 9357) {
  await mkdir(stateRoot(), { recursive: true });
  const lock = join(stateRoot(), "bridge.lock");
  let handle;
  try {
    handle = await open(lock, "wx");
  } catch (error: any) {
    if (error.code !== "EEXIST") throw error;
    const pid = Number(await readFile(lock, "utf8"));
    if (!Number.isInteger(pid) || pid < 1)
      throw Error("Bridge lock is incomplete; inspect it before recovery.");
    let stale = false;
    try {
      process.kill(pid, 0);
    } catch (e: any) {
      stale = e.code === "ESRCH";
    }
    if (!stale)
      throw Error(
        "A bridge process or occupied PID still exists; refusing a second bridge.",
      );
    await rm(lock);
    handle = await open(lock, "wx");
  }
  await handle.writeFile(String(process.pid));
  const stop = join(stateRoot(), "bridge.stop");
  await rm(stop, { force: true });
  let stopping = false;
  process.on("SIGINT", () => {
    stopping = true;
  });
  process.on("SIGTERM", () => {
    stopping = true;
  });
  try {
    while (!stopping) {
      if (await readJson(stop, false)) break;
      try {
        await applyCodex(root, port);
      } catch (e: any) {
        const s = await desired("codex");
        if (s)
          await record(
            "codex",
            /unverified|compatibility|assets|ENOENT/i.test(e.message)
              ? "compatibility-failed"
              : "pending-start",
            e.message,
            s.revision,
          );
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  } finally {
    try {
      await applyCodex(root, port, true);
    } catch {}
    await handle.close();
    await rm(lock, { force: true });
    await rm(stop, { force: true });
  }
}
export async function stopBridge() {
  await mkdir(stateRoot(), { recursive: true });
  await writeFile(join(stateRoot(), "bridge.stop"), "true");
}
