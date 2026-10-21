import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
await mkdir("dist/releases", { recursive: true });
const vsix = "oh-my-ark-theme-0.1.0.vsix";
execFileSync(
  process.execPath,
  [
    "../../node_modules/@vscode/vsce/vsce",
    "package",
    "--no-dependencies",
    "--allow-missing-repository",
    "--out",
    `../../dist/releases/${vsix}`,
  ],
  { cwd: "packages/vscode", stdio: "inherit" },
);
for (const platform of ["windows", "macos"]) {
  const root = `dist/arktheme-${platform}`;
  await mkdir(root, { recursive: true });
  for (const path of [
    "dist/cli.mjs",
    "dist/preview",
    "packages/vscode/assets",
    "assets/generated",
    "assets/fonts",
    "scripts/codex-platform.ps1",
    "scripts/codex-platform.sh",
    "vendor/dream-skin",
    "README.md",
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
    "docs",
  ])
    await cp(path, join(root, path), { recursive: true });
  await writeFile(
    join(root, "arktheme.cmd"),
    '@echo off\r\nnode "%~dp0dist\\cli.mjs" %*\r\n',
  );
  await writeFile(
    join(root, "arktheme"),
    '#!/bin/sh\nexec node "$(dirname "$0")/dist/cli.mjs" "$@"\n',
    { mode: 0o755 },
  );
  await cp(`dist/releases/${vsix}`, join(root, vsix));
  if (platform === "windows")
    execFileSync(
      "tar",
      [
        "-a",
        "-cf",
        "dist/releases/arktheme-windows-0.1.0.zip",
        "-C",
        "dist/arktheme-windows",
        ".",
      ],
      { stdio: "inherit" },
    );
  else
    execFileSync(
      "tar",
      [
        "-czf",
        "dist/releases/arktheme-macos-0.1.0.tar.gz",
        "-C",
        "dist/arktheme-macos",
        ".",
      ],
      { stdio: "inherit" },
    );
}
const files = [
  vsix,
  "arktheme-windows-0.1.0.zip",
  "arktheme-macos-0.1.0.tar.gz",
];
await writeFile(
  "dist/releases/SHA256SUMS",
  (
    await Promise.all(
      files.map(
        async (f) =>
          `${createHash("sha256")
            .update(await readFile(`dist/releases/${f}`))
            .digest("hex")}  ${f}`,
      ),
    )
  ).join("\n") + "\n",
);
