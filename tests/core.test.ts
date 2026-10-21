import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ids,
  palettes,
  nativeTheme,
  validateSelection,
  themeClass,
} from "../packages/core/src/tokens.js";
import { select, desired, status, record } from "../packages/core/src/state.js";
import {
  patchHtml,
  removePatch,
  BEGIN,
} from "../packages/core/src/vscode-patch.js";
import { safeTarget } from "../packages/core/src/codex.js";
const luminance = (hex: string) => {
  const c = hex
    .slice(1)
    .match(/../g)!
    .map((s) => parseInt(s, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
};
const contrast = (a: string, b: string) =>
  (Math.max(luminance(a), luminance(b)) + 0.05) /
  (Math.min(luminance(a), luminance(b)) + 0.05);
test("all palettes retain readable text, semantic tokens and focus on both surfaces", () => {
  for (const id of ids)
    for (const mode of ["light", "dark"] as const) {
      const p = palettes[id][mode];
      for (const bg of [p.bg, p.panel]) {
        for (const key of [
          "fg",
          "muted",
          "accent",
          "red",
          "green",
          "blue",
          "purple",
          "yellow",
        ] as const)
          assert.ok(
            contrast(p[key], bg) >= 4.5,
            `${id}/${mode}/${key} on ${bg}: ${contrast(p[key], bg)}`,
          );
        assert.ok(contrast(p.border, bg) >= 3, `${id} boundary`);
      }
      const t = nativeTheme(id, mode);
      assert.equal(
        Object.keys(t.colors).filter((k) => k.startsWith("terminal.ansi"))
          .length,
        16,
      );
      assert.ok(t.semanticHighlighting);
    }
});
test("CSS patch is idempotent, reversible and preserves unrelated changes", () => {
  const html =
    "<html><head><title>workbench</title></head><body></body></html>";
  const a = patchHtml(html, "body{}");
  assert.equal(patchHtml(a, "body{}"), a);
  assert.equal(removePatch(a), html);
  assert.equal(
    removePatch(a.replace("<body>", '<body data-other="yes">')),
    html.replace("<body>", '<body data-other="yes">'),
  );
  assert.throws(() => removePatch(html + BEGIN));
  assert.throws(() => patchHtml(html, "</style><script>bad</script>"));
});
test("only trusted loopback CDP page endpoints are accepted", () => {
  const good = {
    type: "page",
    url: "app://-/index.html",
    webSocketDebuggerUrl: "ws://127.0.0.1:9357/devtools/page/ABC",
  };
  assert.ok(safeTarget(good, 9357));
  for (const bad of [
    { url: "https://evil.example" },
    { webSocketDebuggerUrl: "ws://evil.example:9357/devtools/page/ABC" },
    { webSocketDebuggerUrl: "ws://127.0.0.1:9999/devtools/page/ABC" },
    { type: "service_worker" },
  ])
    assert.ok(!safeTarget({ ...good, ...bad }, 9357));
});
test("explicit sync persists independent choices and stale acknowledgements cannot report success", async () => {
  await mkdir(".test-state", { recursive: true });
  const dir = await mkdtemp(join(process.cwd(), ".test-state", "core-"));
  process.env.ARKTHEME_HOME = dir;
  try {
    const a = await select("endfield", "system", "all");
    await record("codex", "applied", "test", a.revision);
    await select("siesta", "dark", "vscode");
    assert.equal((await desired("codex"))?.themeId, "endfield");
    assert.equal((await desired("vscode"))?.themeId, "siesta");
    await record("vscode", "applied", "stale", a.revision);
    assert.equal(
      ((await status()).vscode as any).receipt.phase,
      "pending-start",
    );
  } finally {
    delete process.env.ARKTHEME_HOME;
    await rm(dir, { recursive: true, force: true });
  }
});
test("invalid selections are rejected before persistence", () => {
  assert.throws(() => validateSelection("../other", "light"));
  assert.throws(() => validateSelection("endfield", "noon"));
  assert.equal(
    themeClass("masses", "dark"),
    "arktheme-oh-my-ark-theme-themes-masses-dark-json",
  );
});
test("generated SVGs and offline assets exist for all six variants", async () => {
  for (const id of ids)
    for (const mode of ["light", "dark"])
      for (const kind of ["cover", "work", "narrow"]) {
        const svg = await readFile(
          `assets/generated/${id}-${mode}-${kind}.svg`,
          "utf8",
        );
        assert.ok(svg.includes("<svg"));
        assert.ok(!svg.includes("<script"));
        assert.ok(
          (await readFile(`packages/vscode/assets/${id}-${mode}-${kind}.webp`))
            .length > 100,
        );
      }
});
