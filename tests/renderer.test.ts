import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { rendererExpression } from "../packages/core/src/codex-renderer.js";
import { palettes, ids } from "../packages/core/src/tokens.js";
test("30 renderer switches retain one style and one listener; removal cleans both", () => {
  const styles: any[] = [];
  const listeners = new Set<Function>();
  const win: any = {};
  let ready = true;
  const media = {
    matches: false,
    addEventListener: (_n: string, f: Function) => listeners.add(f),
    removeEventListener: (_n: string, f: Function) => listeners.delete(f),
  };
  const document = {
    querySelector: () => (ready ? {} : null),
    createElement: () => {
      const node: any = {
        textContent: "",
        id: "",
        remove: () => {
          const i = styles.indexOf(node);
          if (i >= 0) styles.splice(i, 1);
        },
      };
      return node;
    },
    head: { append: (s: any) => styles.push(s) },
    querySelectorAll: () => styles,
  };
  const context = { window: win, document, matchMedia: () => media };
  for (let i = 0; i < 30; i++) {
    const result = runInNewContext(
      rendererExpression({
        id: ids[i % 3],
        mode: "system",
        palettes,
        images: {
          "light-work": "data:image/webp;base64,A",
          "light-cover": "data:image/webp;base64,B",
          "dark-work": "data:image/webp;base64,C",
          "dark-cover": "data:image/webp;base64,D",
        },
      }),
      context,
    );
    assert.ok(result.applied);
    assert.equal(styles.length, 1);
    assert.equal(listeners.size, 1);
  }
  media.matches = true;
  for (const listener of listeners) listener();
  assert.ok(styles[0].textContent.includes(palettes.siesta.dark.bg));
  runInNewContext(
    rendererExpression({
      id: "endfield",
      mode: "light",
      palettes,
      images: {},
      remove: true,
    }),
    context,
  );
  assert.equal(styles.length, 0);
  assert.equal(listeners.size, 0);
  assert.equal(win.__ARK_THEME__, undefined);
  ready = false;
  const result = runInNewContext(
    rendererExpression({ id: "endfield", mode: "light", palettes, images: {} }),
    context,
  );
  assert.equal(result.applied, false);
  assert.equal(styles.length, 0);
});
