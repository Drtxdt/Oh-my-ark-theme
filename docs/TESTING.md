# Reproducible verification

Run `npm run build`, `npm run check`, `npm test` and `npm run package` from the repository. Generated output is offline and fonts are vendored. `npm audit` returned zero vulnerabilities after build dependencies were upgraded on 2026-10-21.

The eight automated tests cover palette contrast on both surfaces, ANSI mapping, patch idempotence and malformed input, independent app state and stale acknowledgements, CDP target filtering, generated assets, version changes with unrelated workbench edits, and 30 renderer swaps with listener/style cleanup. The renderer test is a controlled DOM model, not a real Codex screenshot or memory benchmark.

Real Windows VS Code extension-host test (PowerShell; substitute the installed Code path):

```powershell
$env:ARKTHEME_HOME = "$PWD/.test-state/vscode-bridge"
& 'D:/Microsoft VS Code/bin/code.cmd' `
  --user-data-dir "$PWD/.test-state/vscode-profile" `
  --extensions-dir "$PWD/.test-state/extensions" `
  --extensionDevelopmentPath "$PWD/packages/vscode" `
  --extensionTestsPath "$PWD/tests/vscode-integration.cjs" `
  --disable-gpu --disable-workspace-trust --skip-welcome --skip-release-notes --wait
```

The test writes `docs/vscode-integration-result.json` only after 30 theme switches, opening/closing the panel and restoring global theme settings have passed. It uses isolated application configuration, not the normal user profile. On macOS use the VS Code command-line executable with the same arguments; a macOS run has not yet been performed.

The dependency lock and release SHA256SUMS identify reproducible inputs/outputs. Packages contain no game or fan-art images. To remove an installed preview, run `restore` while the extension is still installed, reload VS Code, then uninstall the extension. Close Codex normally if restoration cannot verify process ownership; do not force-kill an unverified PID.
