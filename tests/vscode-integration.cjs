const vscode = require("vscode");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
exports.run = async function () {
  const ext = vscode.extensions.getExtension("arktheme.oh-my-ark-theme");
  assert.ok(ext, "extension registered");
  await ext.activate();
  const dir = process.env.ARKTHEME_HOME;
  assert.ok(dir, "isolated state required");
  await fs.mkdir(dir, { recursive: true });
  const results = [];
  for (let i = 0; i < 30; i++) {
    const themeId = ["endfield", "masses", "siesta"][Math.floor(i / 2) % 3],
      mode = i % 2 ? "dark" : "light",
      revision = `integration-${Date.now()}-${i}`;
    await fs.writeFile(
      path.join(dir, "vscode.json"),
      JSON.stringify({
        themeId,
        mode,
        revision,
        updatedAt: new Date().toISOString(),
      }),
    );
    const expected = `Ark ${themeId[0].toUpperCase() + themeId.slice(1)} ${mode === "light" ? "Light" : "Dark"}`;
    const deadline = Date.now() + 10000;
    let receipt;
    do {
      await new Promise((r) => setTimeout(r, 100));
      try {
        receipt = JSON.parse(
          await fs.readFile(path.join(dir, "vscode.receipt.json"), "utf8"),
        );
      } catch {}
    } while (
      (receipt?.revision !== revision || receipt?.phase !== "applied") &&
      Date.now() < deadline
    );
    assert.equal(receipt?.phase, "applied", JSON.stringify(receipt));
    assert.equal(receipt?.revision, revision);
    assert.equal(
      vscode.workspace.getConfiguration().get("workbench.colorTheme"),
      expected,
    );
    results.push(expected);
  }
  const systemRevision = `system-${Date.now()}`;
  await fs.writeFile(
    path.join(dir, "vscode.json"),
    JSON.stringify({
      themeId: "endfield",
      mode: "system",
      revision: systemRevision,
      updatedAt: new Date().toISOString(),
    }),
  );
  let systemReceipt;
  const systemDeadline = Date.now() + 10000;
  do {
    await new Promise((r) => setTimeout(r, 100));
    systemReceipt = JSON.parse(
      await fs.readFile(path.join(dir, "vscode.receipt.json"), "utf8"),
    );
  } while (
    systemReceipt.revision !== systemRevision &&
    Date.now() < systemDeadline
  );
  assert.equal(systemReceipt.phase, "applied");
  assert.equal(systemReceipt.revision, systemRevision);
  assert.equal(
    vscode.workspace.getConfiguration().get("window.autoDetectColorScheme"),
    true,
  );
  await vscode.commands.executeCommand("arktheme.open");
  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  await fs.writeFile(
    path.join(dir, "vscode.receipt.json"),
    JSON.stringify({ phase: "reload-required" }),
  );
  await fs.rm(path.join(dir, "vscode.json"));
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(
    vscode.workspace.getConfiguration().inspect("workbench.colorTheme")
      .globalValue,
    undefined,
    "native settings restored",
  );
  await fs.mkdir(path.join(process.cwd(), "docs"), { recursive: true });
  await fs.writeFile(
    path.join(__dirname, "../docs/vscode-integration-result.json"),
    JSON.stringify(
      {
        version: vscode.version,
        platform: process.platform,
        switches: results.length,
        themes: [...new Set(results)],
        panelOpened: true,
        restored: true,
        systemMode: true,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
};
