import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { stateRoot, readJson, atomicWrite } from "./state.js";
export const BEGIN = "<!-- OH-MY-ARK-THEME:BEGIN v1 -->",
  END = "<!-- OH-MY-ARK-THEME:END -->";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function removePatch(html: string) {
  const start = html.indexOf(BEGIN),
    end = html.indexOf(END);
  if (start < 0 && end < 0) return html;
  if (start < 0 || end < start || html.indexOf(BEGIN, start + 1) >= 0)
    throw Error("Ambiguous project patch markers; refusing to modify.");
  return html.slice(0, start) + html.slice(end + END.length);
}
export function patchHtml(html: string, css: string) {
  const clean = removePatch(html);
  if (!clean.includes("</head>") || !clean.includes("workbench"))
    throw Error("Unrecognized workbench HTML");
  if (/<\/style/i.test(css)) throw Error("Invalid CSS payload");
  return clean.replace(
    "</head>",
    `${BEGIN}<style data-arktheme="1">${css}</style>${END}</head>`,
  );
}
export async function patchVSCode(
  appRoot: string,
  css: string,
  enable: boolean,
) {
  const root = resolve(appRoot),
    pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  if (!["code-oss", "code"].includes(String(pkg.name).toLowerCase()))
    throw Error("Not a recognized VS Code app directory");
  const htmlPath = join(
    root,
    "out",
    "vs",
    "code",
    "electron-browser",
    "workbench",
    "workbench.html",
  );
  await stat(htmlPath);
  const html = await readFile(htmlPath, "utf8");
  const clean = removePatch(html);
  const key = hash(root).slice(0, 16);
  const dir = join(stateRoot(), "backups", key);
  await mkdir(dir, { recursive: true });
  const manifest = await readJson<any>(join(dir, "manifest.json"), null);
  if (enable) {
    if (
      pkg.version !== "1.143.0" &&
      process.env.ARKTHEME_ALLOW_UNVERIFIED !== "1"
    )
      throw Error(
        `VS Code ${pkg.version} not validated; native themes remain available. Use an explicit compatibility probe before opting in.`,
      );
    if (html !== clean && manifest && manifest.cleanHash !== hash(clean))
      throw Error(
        "Workbench changed since patch; restore project block before re-enabling.",
      );
    if (!html.includes("'unsafe-inline'"))
      throw Error("Inline styles not permitted by current CSP");
    await writeFile(join(dir, `${pkg.version}-${hash(clean)}.html`), clean);
    await atomicWrite(join(dir, "manifest.json"), {
      version: pkg.version,
      path: htmlPath,
      cleanHash: hash(clean),
      timestamp: new Date().toISOString(),
    });
  }
  const result = enable ? patchHtml(clean, css) : clean;
  if (result !== html) await writeFile(htmlPath, result);
  await atomicWrite(join(stateRoot(), "vscode-enhancement.json"), {
    enabled: enable,
    appRoot: root,
    version: pkg.version,
    phase: "reload-required",
    updatedAt: new Date().toISOString(),
  });
  return {
    version: pkg.version,
    changed: result !== html,
    phase: "reload-required",
    message: enable
      ? "Enhancement installed; reload VS Code. Integrity warnings are not suppressed."
      : "Only project style block removed; reload VS Code.",
  };
}
