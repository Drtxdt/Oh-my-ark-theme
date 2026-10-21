import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("dist/preview");
createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const path = resolve(
      root,
      "." + decodeURIComponent(pathname === "/" ? "/index.html" : pathname),
    );
    if (!path.startsWith(root + sep)) throw Error("Invalid path");
    res.setHeader(
      "Content-Type",
      extname(path) === ".html" ? "text/html; charset=utf-8" : "image/webp",
    );
    res.end(await readFile(path));
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}).listen(4173, "127.0.0.1", () =>
  console.log("Preview: http://127.0.0.1:4173"),
);
