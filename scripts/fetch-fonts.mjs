import { mkdir, writeFile } from "node:fs/promises";
await mkdir("assets/fonts", { recursive: true });
for (const [family, file] of [
  ["barlowcondensed", "BarlowCondensed-Bold.ttf"],
  ["bodonimoda", "BodoniModa[opsz,wght].ttf"],
  ["fraunces", "Fraunces[SOFT,WONK,opsz,wght].ttf"],
  ["notosanssc", "NotoSansSC[wght].ttf"],
]) {
  for (const name of [file, "OFL.txt"]) {
    const url = `https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/${encodeURIComponent(name)}`;
    const r = await fetch(url);
    if (!r.ok) throw Error(`${url}: ${r.status}`);
    await writeFile(
      `assets/fonts/${family}-${name === "OFL.txt" ? "OFL.txt" : "display.ttf"}`,
      Buffer.from(await r.arrayBuffer()),
    );
  }
}
