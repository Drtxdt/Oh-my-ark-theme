import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import sharp from "sharp";
import * as fontkit from "fontkit";
import {
  ids,
  palettes,
  titles,
  label,
  nativeTheme,
  themeClass,
  type ThemeId,
  backgroundMetadata,
} from "../packages/core/src/tokens.js";
const out = "packages/vscode";
await Promise.all(
  [
    "assets/generated",
    `${out}/themes`,
    `${out}/assets`,
    `${out}/assets/licenses`,
    "dist/preview",
  ].map((p) => mkdir(p, { recursive: true })),
);
const families = {
  endfield: "barlowcondensed",
  masses: "bodonimoda",
  siesta: "fraunces",
};
for (const family of [...Object.values(families), "notosanssc"])
  await copyFile(
    `assets/fonts/${family}-OFL.txt`,
    `${out}/assets/licenses/${family}-OFL.txt`,
  );
function titlePath(
  id: ThemeId,
  text: string,
  x: number,
  y: number,
  size: number,
  chinese = false,
) {
  const font = fontkit.openSync(
    `assets/fonts/${chinese ? "notosanssc" : families[id]}-display.ttf`,
  );
  const run = font.layout(text);
  let pen = 0;
  const scale = size / font.unitsPerEm;
  return `<g transform="translate(${x} ${y}) scale(${scale} ${-scale})">${run.glyphs
    .map((g: any, i: number) => {
      const p = run.positions[i];
      const s = `<path transform="translate(${pen + p.xOffset} ${p.yOffset})" d="${g.path.toSVG()}"/>`;
      pen += p.xAdvance;
      return s;
    })
    .join("")}</g>`;
}
function artwork(
  id: ThemeId,
  mode: "light" | "dark",
  kind: "cover" | "work" | "narrow",
) {
  const p = palettes[id][mode],
    quiet = kind === "work",
    narrow = kind === "narrow";
  const pattern =
    id === "endfield"
      ? `<path d="M0 32L32 0M0 64L64 0M32 64L64 32" stroke="${p.accent}" stroke-width="8"/>`
      : id === "masses"
        ? `<circle cx="32" cy="32" r="28" fill="none" stroke="${p.accent}"/>`
        : `<circle cx="8" cy="8" r="2" fill="${p.accent}"/>`;
  const forms =
    id === "endfield"
      ? `<path d="M1080 70h420v260h-150v190h-210V330h-60Z M1130 120h320v160h-150v190h-110V280h-60Z" fill="none" stroke="${p.accent}" stroke-width="3"/><path d="M960 710l440-440h200v150l-290 290Z" fill="${p.accent}" opacity=".16"/><path d="M960 740h570M1030 100v670M1500 60v710" stroke="${p.border}"/><g stroke="${p.accent}" stroke-width="2"><path d="M990 100h80m-40-40v80M1460 740h80m-40-40v80"/></g><rect x="1260" y="580" width="260" height="66" fill="url(#pattern)"/>`
      : id === "masses"
        ? `<g fill="none" stroke="${p.accent}"><circle cx="1260" cy="410" r="285" stroke-width="2"/><circle cx="1260" cy="410" r="218"/><path d="M970 410h580M1260 120v580M1040 195l440 430M1040 625l440-430" opacity=".5"/><path d="M1160 590q-50-90-40-160l22-116q8-28 24 0l-7 96 34-194q8-28 24 0l-16 190 44-225q10-20 24 3l-28 228 55-168q18-25 25 0l-36 194 55-75q20-18 30 4l-74 158-60 64Z" stroke-width="4"/><path d="M960 760h580M960 750v20m100-20v20m100-20v20m100-20v20m100-20v20m100-20v20"/></g><path d="M1045 100l45-50h35l-45 50Zm50 0 45-50h35l-45 50Z" fill="${p.accent}"/>`
        : `<circle cx="1270" cy="275" r="155" fill="${p.red}" opacity=".36"/><path d="M840 740 1140 350 1200 400 1260 350 1570 740Z" fill="${p.accent}" opacity=".65"/><path d="M840 740q160-170 330-40t430-70v230H840Z" fill="${p.green}"/><path d="M800 780q230-160 410-35t390-10" fill="none" stroke="${p.bg}" stroke-width="7"/><circle cx="1470" cy="560" r="130" fill="url(#pattern)"/><g fill="${p.yellow}" transform="translate(990 220)">${Array.from({ length: 6 }, (_, i) => `<ellipse rx="23" ry="54" transform="rotate(${i * 60}) translate(0 -37)"/>`).join("")}<circle r="23" fill="${p.bg}"/></g>`;
  const title =
    id === "endfield" ? "ENDFIELD" : id === "masses" ? "THE MASSES" : "SIESTA";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><pattern id="pattern" width="${id === "siesta" ? 16 : 64}" height="${id === "siesta" ? 16 : 64}" patternUnits="userSpaceOnUse">${pattern}</pattern></defs><rect width="1600" height="900" fill="${p.bg}"/><g opacity="${quiet ? ".045" : narrow ? ".15" : ".8"}">${forms}</g>${quiet || narrow ? "" : `<g fill="${p.fg}">${titlePath(id, title, 80, 300, id === "masses" ? 100 : 145)}${titlePath(id, titles[id], 84, 460, 32, true)}</g><path d="M80 338h670" stroke="${p.border}"/><g fill="${p.muted}" font-family="monospace" font-size="15"><text x="80" y="120">OH / MY / ARK     —     0${ids.indexOf(id) + 1}</text><text x="84" y="390">${id === "endfield" ? "FIELD OPERATIONS / INDUSTRIAL ARCHIVE" : id === "masses" ? "HUMAN GEOMETRY / STUDIES IN STILLNESS" : "COASTAL MEMORIES / VOLCANIC SUMMER"}</text><text x="80" y="790">ORIGINAL GRAPHIC STUDY     /     ${mode.toUpperCase()}</text></g>`}<path d="M50 50h1500v800H50Z" fill="none" stroke="${p.border}" opacity="${quiet ? ".03" : ".25"}"/></svg>`;
}
let css = "/* Oh My Ark Theme: generated offline backgrounds; no scripts. */\n";
const cards = [];
for (const id of ids)
  for (const mode of ["light", "dark"] as const) {
    const name = `${id}-${mode}`;
    await writeFile(
      `${out}/themes/${name}.json`,
      JSON.stringify(nativeTheme(id, mode), null, 2),
    );
    for (const kind of ["cover", "work", "narrow"] as const) {
      const svg = artwork(id, mode, kind);
      await writeFile(`assets/generated/${name}-${kind}.svg`, svg);
      const webp = await sharp(Buffer.from(svg))
        .webp({ quality: 90 })
        .toBuffer();
      await writeFile(`${out}/assets/${name}-${kind}.webp`, webp);
      await writeFile(`dist/preview/${name}-${kind}.webp`, webp);
      const uri = `data:image/webp;base64,${webp.toString("base64")}`;
      const sel = `.monaco-workbench.${themeClass(id, mode)}`;
      const p = palettes[id][mode];
      css +=
        kind === "cover"
          ? `${sel} .part.editor > .content.empty,${sel} .editor-group-container.empty {background-image:url("${uri}");background-size:cover;background-position:center;}\n@media(max-width:900px){${sel} .editor-group-container.empty{background-size:auto 100%;background-position:right;}}\n`
          : kind === "work"
            ? `${sel} .part.editor .editor-container {background:${p.bg} url("${uri}") right center / cover;}\n${sel} .part.editor .monaco-editor,${sel} .part.editor .monaco-editor-background {background-color:transparent;}\n${sel} .part.editor :is(.monaco-diff-editor,.notebookOverlay) .monaco-editor,${sel} .part.editor :is(.monaco-diff-editor,.notebookOverlay) .monaco-editor-background {background-color:${p.bg};}\n`
            : `${sel} .part.sidebar {background-image:url("${uri}");background-size:auto 100%;background-position:right;}\n`;
    }
    cards.push({
      id,
      mode,
      label: label(id, mode),
      title: titles[id],
      colors: palettes[id][mode],
      background: `${name}-cover.webp`,
      composition: backgroundMetadata[id],
      source: {
        kind: "original-svg",
        generator: "scripts/build.ts",
        license: "MIT",
      },
    });
  }
await writeFile("assets/generated/vscode-enhanced.css", css);
await writeFile(`${out}/assets/catalog.json`, JSON.stringify(cards, null, 2));
await writeFile(
  "assets/generated/codex-appearance-cards.json",
  JSON.stringify(
    {
      format: "arktheme-parameter-cards-v1",
      notice:
        "Project parameter cards; NOT an official Codex import format. Apply using Appearance settings.",
      themes: cards,
    },
    null,
    2,
  ),
);
const pkg = JSON.parse(await readFile(`${out}/package.json`, "utf8"));
pkg.contributes.themes = cards.map((t) => ({
  id: t.label,
  label: t.label,
  uiTheme: t.mode === "light" ? "vs" : "vs-dark",
  path: `./themes/${t.id}-${t.mode}.json`,
}));
await writeFile(`${out}/package.json`, JSON.stringify(pkg, null, 2));
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Oh My Ark — Theme Atlas</title><style>body{margin:0;background:#171a19;color:#e8ebdd;font:16px system-ui}header{padding:55px 5%;border-bottom:1px solid #596500}h1{font-size:clamp(36px,6vw,80px);margin:10px 0}header p{color:#a5b0a4;max-width:700px;line-height:1.8}.grid{padding:40px 5%;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:30px}article{border:1px solid #56604e;background:#222725}img{width:100%;display:block}section{padding:20px}h2{margin:0 0 10px}small{color:#a5b0a4}.swatches{display:flex;margin-top:20px}.swatches i{height:20px;flex:1}footer{padding:30px 5%}</style><header><small>OH / MY / ARK — DESIGN ATLAS 001</small><h1>三个世界，六种工作氛围。</h1><p>原创背景构图与可独立使用的配色。封面保留个性，工作区域保留安静。此页为设计预览，不代表已完成应用实机验收。</p></header><main class="grid">${cards
  .map(
    (t) =>
      `<article><img src="${t.background}" alt="${t.title} ${t.mode} cover"><section><h2>${t.title} / ${t.mode.toUpperCase()}</h2><small>${t.label} · 原创 SVG → WebP</small><div class="swatches">${Object.values(
        t.colors,
      )
        .map((c) => `<i style="background:${c}"></i>`)
        .join(
          "",
        )}</div><details><summary>工作背景</summary><img src="${t.id}-${t.mode}-work.webp" alt="quiet work background"></details></section></article>`,
  )
  .join(
    "",
  )}</main><footer>ARKTHEME / LOCAL EDITION · Windows + macOS · Codex + VS Code</footer></html>`;
await writeFile("dist/preview/index.html", html);
const thumbs = await Promise.all(
  cards.map(async (t, i) => ({
    input: await sharp(`dist/preview/${t.background}`)
      .resize(800, 450)
      .png()
      .toBuffer(),
    left: (i % 2) * 800,
    top: Math.floor(i / 2) * 450,
  })),
);
await sharp({
  create: { width: 1600, height: 1350, channels: 3, background: "#171a19" },
})
  .composite(thumbs)
  .png()
  .toFile("dist/preview/contact-sheet.png");
console.log(
  "Generated six themes, 18 SVGs, 18 WebPs, offline CSS and appearance cards.",
);
