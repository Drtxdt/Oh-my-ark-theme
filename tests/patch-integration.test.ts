import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { patchVSCode, BEGIN } from "../packages/core/src/vscode-patch.js";
test("versioned patch rejects unknown apps, restores only its block across upgrades, retains external edits", async () => {
  await mkdir(".test-state", { recursive: true });
  const root = await mkdtemp(join(process.cwd(), ".test-state", "patch-"));
  const previous = process.env.ARKTHEME_HOME;
  process.env.ARKTHEME_HOME = join(root, "state");
  try {
    const app = join(root, "app");
    const htmlDir = join(app, "out/vs/code/electron-browser/workbench");
    await mkdir(htmlDir, { recursive: true });
    await writeFile(
      join(app, "package.json"),
      JSON.stringify({ name: "Code", version: "1.143.0" }),
    );
    const path = join(htmlDir, "workbench.html"),
      original = `<html><head><meta content="style-src 'self' 'unsafe-inline'"><title>workbench</title></head></html>`;
    await writeFile(path, original);
    await patchVSCode(app, "body{color:red}", true);
    const once = await readFile(path, "utf8");
    assert.ok(once.includes(BEGIN));
    await patchVSCode(app, "body{color:red}", true);
    assert.equal(await readFile(path, "utf8"), once);
    const upgraded = once.replace(
      "workbench</title>",
      "workbench updated</title>",
    );
    await writeFile(path, upgraded);
    await writeFile(
      join(app, "package.json"),
      JSON.stringify({ name: "Code", version: "9.0.0" }),
    );
    await assert.rejects(
      () => patchVSCode(app, "body{}", true),
      /not validated/,
    );
    await patchVSCode(app, "", false);
    assert.equal(
      await readFile(path, "utf8"),
      original.replace("workbench</title>", "workbench updated</title>"),
    );
  } finally {
    if (previous === undefined) delete process.env.ARKTHEME_HOME;
    else process.env.ARKTHEME_HOME = previous;
    await rm(root, { recursive: true, force: true });
  }
});
