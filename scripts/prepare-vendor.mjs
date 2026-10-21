import {
  mkdir,
  copyFile,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
const sha = "6fc42df48a6a5365011f55cc349e20c038e56d1d",
  root = `vendor/Codex-Dream-Skin-${sha}`,
  dest = "vendor/dream-skin";
await mkdir(dest, { recursive: true });
await copyFile(join(root, "LICENSE"), join(dest, "LICENSE"));
for (const platform of ["windows", "macos"]) {
  await mkdir(`${dest}/${platform}/scripts`, { recursive: true });
  for (const name of await readdir(`${root}/${platform}/scripts`)) {
    if (/\.(ps1|sh|mjs)$/.test(name))
      await copyFile(
        `${root}/${platform}/scripts/${name}`,
        `${dest}/${platform}/scripts/${name}`,
      );
  }
  await mkdir(`${dest}/${platform}/assets`, { recursive: true });
  for (const name of await readdir(`${root}/${platform}/assets`)) {
    if (/\.(json|mjs|js|css)$/.test(name))
      await copyFile(
        `${root}/${platform}/assets/${name}`,
        `${dest}/${platform}/assets/${name}`,
      );
  }
}
await writeFile(
  `${dest}/PROVENANCE.json`,
  JSON.stringify(
    {
      repository: "https://github.com/Fei-Away/Codex-Dream-Skin",
      commit: sha,
      license: "MIT",
      changes:
        "Unmodified platform scripts and text runtime assets only. No upstream image assets bundled. Ark bridge calls verified process helpers; upstream renderer is not used.",
    },
    null,
    2,
  ),
);
