import { palettes, type ThemeId, type Mode } from "./tokens.js";
// This function is serialized into a verified renderer. It has no network access or imports.
export function renderer(payload: {
  id: ThemeId;
  mode: Mode;
  palettes: typeof palettes;
  images: Record<string, string>;
  remove?: boolean;
}) {
  const w = window as any;
  w.__ARK_THEME__?.dispose();
  if (payload.remove) return { removed: true };
  const main =
    'main:is(.main-surface,[data-app-shell-main-surface],[class*="_MainContentSurface_"])';
  if (!document.querySelector(main))
    return {
      applied: false,
      reason: "Required main surface absent; no injection performed.",
    };
  const style = document.createElement("style");
  style.id = "oh-my-ark-theme";
  const media = matchMedia("(prefers-color-scheme: dark)");
  function update() {
    const mode =
      payload.mode === "system"
        ? media.matches
          ? "dark"
          : "light"
        : payload.mode;
    const p = payload.palettes[payload.id][mode];
    const work = payload.images[`${mode}-work`],
      cover = payload.images[`${mode}-cover`];
    style.textContent = `${main}{background-color:${p.bg}!important;background-image:url("${work}")!important;background-size:cover;color:${p.fg};--color-text-primary:${p.fg};--color-text-secondary:${p.muted};--color-background-primary:${p.bg};--color-background-secondary:${p.panel};--color-border-primary:${p.border};}
 ${main}:has([data-testid="home-icon"]){background-image:url("${cover}")!important;background-position:center;}
 ${main} :is([data-message-author-role],[data-local-conversation-final-assistant],pre,[role="dialog"],[role="menu"],[class*="_ComposerLayoutRoot_"]){background-color:${p.bg}!important;color:${p.fg};}
 aside.app-shell-left-panel,header:is(.app-header-tint,[data-app-shell-header-edge-scroll],[class*="_Header_"]){background-color:${p.panel}!important;color:${p.fg};border-color:${p.border};}
 ${main} a{color:${p.blue}} ${main} :focus-visible{outline-color:${p.accent}}
 @media(max-width:900px){${main}:has([data-testid="home-icon"]){background-image:url("${work}")!important}}
 @media(prefers-reduced-motion:reduce){#oh-my-ark-theme{transition:none}}`;
  }
  update();
  document.head.append(style);
  media.addEventListener("change", update);
  w.__ARK_THEME__ = {
    dispose: () => {
      media.removeEventListener("change", update);
      style.remove();
      delete w.__ARK_THEME__;
    },
  };
  return {
    applied: true,
    styleCount: document.querySelectorAll("#oh-my-ark-theme").length,
  };
}
// tsx's development transform adds __name helpers; keep the serialized function self-contained.
export const rendererExpression = (data: Parameters<typeof renderer>[0]) =>
  `(()=>{const __name=(fn)=>fn;return (${renderer.toString()})(${JSON.stringify(data)})})()`;
