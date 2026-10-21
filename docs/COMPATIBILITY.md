# Compatibility and acceptance ledger

Build date: 2026-10-21. Release designation: **local preview, not fully accepted P0–P4 release**.

| Area | Evidence / status |
| --- | --- |
| Host runtime | Windows, Node 24.18.0; targets Node >=22. Node 22 runtime remains to be separately exercised. |
| Native generation | Six VS Code themes, TextMate + semantic colors, 16 ANSI entries, diagnostics and Diff. |
| Assets | 18 editable SVG + 18 WebP; Barlow Condensed / Bodoni Moda / Fraunces display outlines; no runtime network assets. |
| Contrast | Unit checks cover foreground, muted, accent and semantic colors >=4.5:1 against both base and panel; border >=3:1. Composited screenshot acceptance remains pending. |
| VS Code baseline | Installed 1.143.0 HTML and theme class mechanism inspected. Patch targets actual electron-browser/workbench/workbench.html. |
| VS Code real host | **Passed on Windows VS Code 1.143.0**: 30 sequential switches across six themes, system-mode settings, control panel open/close, native setting restoration. Evidence: `vscode-integration-result.json`. This verifies extension APIs, not pixel-level backgrounds. |
| CSS patch | Idempotence, malformed markers, source preservation and unrelated edit retention tested; unknown versions fail closed. Actual installed-file modification not performed during this task. |
| Codex launch mechanism | Fixed upstream platform helpers vendored; independent renderer and loopback target filters implemented. Read-only official package discovery succeeded for Windows 26.1016.6573.0. Login, session visibility, real DOM injection and complete restart/port closure require interactive acceptance. No Codex enhanced version is enabled by default; explicit experimental opt-in is required. |
| macOS | Source adapter and portable package provided; no macOS hardware available, no actual-app claim. |
| Official Codex sharing | Parameter cards provided; official UI-generated share contents not exported. No fabricated import schema. |
| Performance | Static assets, no animation loop; one bridge lock. 100 MB / 1 pp CPU budget and 30-minute retention are **not measured**. |

## Required before stable release

1. Run each series/mode in Codex and VS Code on Windows and macOS (24 cells), recording screenshots and exact application versions.
2. Inspect home, long conversation, code, tool cards, dialogs; editor splits, search, suggestions, terminal, Diff, Notebook and Markdown.
3. Check 1080p, 1440p, ultrawide, narrow windows, Windows 100%/150%, macOS Retina. Confirm key content stays opaque and no native hit targets are displaced.
4. Verify Codex independent profile login and sessions, pause vs full restore, closed port, crash/relaunch, sleep/wake and multiple windows.
5. Measure baseline vs enhanced memory/idle CPU on identical content; 30 switches and 30 minutes. Count retained styles and listeners; no sustained growth.
6. Exercise read-only install directories, missing assets, app upgrades, externally modified settings, uninstall/reinstall and restoration.

## Deliberate limits of this preview

The enhanced VS Code CSS decorates empty editors, low-contrast text editor backgrounds and narrow sidebar surfaces. Diff and Notebook editor surfaces keep opaque backgrounds. Codex changes only known main/sidebar/header and content surfaces; unsupported page structure is left unmodified and reported as compatibility failure. The control panel saves selections and reports pending application; it does not silently patch the installation or restart Codex.

The `system` option uses VS Code's native OS-following settings and renderer `prefers-color-scheme` in Codex. Native Codex appearance remains user-managed; settings and routes not covered by the enhancement may retain the user's native theme.
