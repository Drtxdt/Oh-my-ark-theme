import { mkdir, readFile, writeFile, rename, open, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { type ThemeId, type Mode, validateSelection } from "./tokens.js";
export type Target = "codex" | "vscode";
export type Phase =
  | "applied"
  | "pending-start"
  | "reload-required"
  | "compatibility-failed"
  | "manual-required"
  | "restored";
export interface Selection {
  themeId: ThemeId;
  mode: Mode;
  revision: string;
  updatedAt: string;
}
export interface Receipt {
  phase: Phase;
  message: string;
  revision?: string;
  updatedAt: string;
}
export const stateRoot = () =>
  process.env.ARKTHEME_HOME ||
  join(
    process.platform === "win32"
      ? process.env.LOCALAPPDATA || homedir()
      : process.platform === "darwin"
        ? join(homedir(), "Library", "Application Support")
        : join(homedir(), ".local", "share"),
    "OhMyArkTheme",
  );
export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (e: any) {
    if (e.code === "ENOENT") return fallback;
    throw e;
  }
}
export async function atomicWrite(file: string, data: unknown) {
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
    for (let attempt = 0; ; attempt++) {
      try {
        await rename(temp, file);
        break;
      } catch (e: any) {
        if (!["EPERM", "EACCES", "EBUSY"].includes(e.code) || attempt >= 5)
          throw e;
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
      }
    }
  } finally {
    await rm(temp, { force: true });
  }
}
export async function desired(target: Target): Promise<Selection | null> {
  return readJson(join(stateRoot(), `${target}.json`), null);
}
export async function record(
  target: Target,
  phase: Phase,
  message: string,
  revision?: string,
) {
  await mkdir(stateRoot(), { recursive: true });
  const r = { phase, message, revision, updatedAt: new Date().toISOString() };
  await atomicWrite(join(stateRoot(), `${target}.receipt.json`), r);
  return r;
}
export async function select(
  themeId: ThemeId,
  mode: Mode,
  target: Target | "all",
) {
  validateSelection(themeId, mode);
  await mkdir(stateRoot(), { recursive: true });
  const lock = join(stateRoot(), "selection.lock");
  let handle;
  try {
    handle = await open(lock, "wx");
  } catch {
    throw Error("Another selection is in progress; retry after it completes.");
  }
  try {
    const selection = {
      themeId,
      mode,
      revision: randomUUID(),
      updatedAt: new Date().toISOString(),
    };
    for (const t of target === "all"
      ? (["codex", "vscode"] as const)
      : [target]) {
      await atomicWrite(join(stateRoot(), `${t}.json`), selection);
      await record(
        t,
        "pending-start",
        "Selection saved; waiting for application adapter.",
        selection.revision,
      );
    }
    return selection;
  } finally {
    await handle.close();
    await rm(lock, { force: true });
  }
}
export async function status() {
  const result: Record<string, unknown> = {};
  for (const t of ["codex", "vscode"] as const) {
    const d = await desired(t);
    const r = await readJson<Receipt | null>(
      join(stateRoot(), `${t}.receipt.json`),
      null,
    );
    const fresh =
      r?.phase !== "applied" || Date.now() - Date.parse(r.updatedAt) < 45000;
    result[t] = {
      selection: d,
      receipt:
        r && r.revision === d?.revision && fresh
          ? r
          : r?.phase === "restored"
            ? r
            : {
                phase: "pending-start",
                message: "No recent matching application acknowledgement.",
              },
    };
  }
  return result;
}
export async function clear(target: Target) {
  await mkdir(stateRoot(), { recursive: true });
  await rm(join(stateRoot(), `${target}.json`), { force: true });
  await record(
    target,
    target === "vscode" ? "reload-required" : "restored",
    target === "vscode"
      ? "Waiting for extension to restore owned native settings."
      : "Project selection removed.",
  );
}
