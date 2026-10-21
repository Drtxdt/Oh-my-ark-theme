# Third-party notices

- Codex Dream Skin: https://github.com/Fei-Away/Codex-Dream-Skin, commit `6fc42df48a6a5365011f55cc349e20c038e56d1d`, MIT. Copyright 2026 Codex Dream Skin Studio contributors. Unmodified scripts and text runtime assets in `vendor/dream-skin`; original license included. The Ark bridge calls platform discovery, signature/process checks, debug launch and graceful restore helpers. Its visual renderer is independently implemented; upstream image assets are not included.
- Barlow Condensed, Bodoni Moda, Fraunces, Noto Sans SC: Google Fonts repositories under SIL Open Font License 1.1. Font files and each family's exact license are in `assets/fonts`. SVG English and Chinese display titles use outlines generated from these fonts. Runtime does not download fonts or change user editor fonts.
- Build dependencies are recorded in `package-lock.json`; they are not bundled into the runtime CLI. The VS Code extension bundles only project code and imports the host's `vscode` API. TypeScript, esbuild, fontkit, sharp and VSCE retain their respective dependency license notices in the development installation.

All generated geometric illustrations are original project artwork. References informed visual direction, not copied asset distribution. Application names and game/event names belong to their respective owners.
