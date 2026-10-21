export const ids = ["endfield", "masses", "siesta"] as const;
export type ThemeId = (typeof ids)[number];
export type Mode = "light" | "dark" | "system";
export interface Palette {
  bg: string;
  panel: string;
  fg: string;
  muted: string;
  accent: string;
  border: string;
  red: string;
  green: string;
  blue: string;
  purple: string;
  yellow: string;
}
export const titles = {
  endfield: "终末地",
  masses: "众生行记",
  siesta: "火山旅梦",
};
export const backgroundMetadata = {
  endfield: {
    anchor: [0.8, 0.5],
    safeArea: [0.08, 0.45, 0.58, 0.76],
    style: "industrial-outline",
    font: "Barlow Condensed",
  },
  masses: {
    anchor: [0.79, 0.46],
    safeArea: [0.08, 0.45, 0.55, 0.76],
    style: "geometric-hand-study",
    font: "Bodoni Moda",
  },
  siesta: {
    anchor: [0.82, 0.58],
    safeArea: [0.08, 0.45, 0.52, 0.76],
    style: "coastal-print",
    font: "Fraunces",
  },
} as const;
export const palettes: Record<ThemeId, Record<"light" | "dark", Palette>> = {
  endfield: {
    light: {
      bg: "#F2F1E8",
      panel: "#E6E5DB",
      fg: "#242923",
      muted: "#5D6258",
      accent: "#596500",
      border: "#797E70",
      red: "#AE302D",
      green: "#386223",
      blue: "#286384",
      purple: "#78538B",
      yellow: "#796000",
    },
    dark: {
      bg: "#171A19",
      panel: "#222725",
      fg: "#E8EBDD",
      muted: "#A5B0A4",
      accent: "#D4E65B",
      border: "#768274",
      red: "#FF9391",
      green: "#AAD790",
      blue: "#91C4E5",
      purple: "#CCADE1",
      yellow: "#E9CE7E",
    },
  },
  masses: {
    light: {
      bg: "#F1F5F6",
      panel: "#E3EAF0",
      fg: "#172838",
      muted: "#4C6475",
      accent: "#2453B4",
      border: "#708494",
      red: "#AF344B",
      green: "#276E59",
      blue: "#2453B4",
      purple: "#7251A0",
      yellow: "#796000",
    },
    dark: {
      bg: "#111B26",
      panel: "#1B2A38",
      fg: "#E3F1F7",
      muted: "#9FB8C9",
      accent: "#9BD8FA",
      border: "#708EA4",
      red: "#FF9BAE",
      green: "#91D9BE",
      blue: "#9BD8FA",
      purple: "#C6B6FF",
      yellow: "#E5D28A",
    },
  },
  siesta: {
    light: {
      bg: "#FFF1DC",
      panel: "#F3DFC6",
      fg: "#492C31",
      muted: "#795452",
      accent: "#A23E32",
      border: "#A06E61",
      red: "#A23E32",
      green: "#306657",
      blue: "#32667C",
      purple: "#865075",
      yellow: "#806000",
    },
    dark: {
      bg: "#261E2A",
      panel: "#352A3A",
      fg: "#F9E5D2",
      muted: "#C8ABBC",
      accent: "#FFA89B",
      border: "#A38398",
      red: "#FFA89B",
      green: "#A5D9C5",
      blue: "#A7CFDF",
      purple: "#DCB3DE",
      yellow: "#F3CE92",
    },
  },
};
export const label = (id: ThemeId, mode: "light" | "dark") =>
  `Ark ${id[0].toUpperCase() + id.slice(1)} ${mode === "light" ? "Light" : "Dark"}`;
export function validateSelection(
  id: string,
  mode: string,
): asserts id is ThemeId {
  if (
    !ids.includes(id as ThemeId) ||
    !["light", "dark", "system"].includes(mode)
  )
    throw Error("Invalid theme or mode");
}
export function themeClass(id: ThemeId, mode: "light" | "dark") {
  return `arktheme-oh-my-ark-theme-themes-${id}-${mode}-json`;
}
export function nativeTheme(id: ThemeId, mode: "light" | "dark") {
  const p = palettes[id][mode];
  const c: Record<string, string> = {};
  for (const key of [
    "editor",
    "sideBar",
    "activityBar",
    "statusBar",
    "titleBar.active",
    "panel",
    "editorGroupHeader.tabs",
    "editorWidget",
    "input",
    "dropdown",
    "quickInput",
    "menu",
    "notificationCenter",
    "notifications",
    "terminal",
    "notebook",
  ])
    c[`${key}.background`] = p.bg;
  for (const key of [
    "editor",
    "sideBar",
    "activityBar",
    "statusBar",
    "titleBar.active",
    "input",
    "dropdown",
    "menu",
    "notifications",
    "terminal",
  ])
    c[`${key}.foreground`] = p.fg;
  Object.assign(c, {
    foreground: p.fg,
    descriptionForeground: p.muted,
    focusBorder: p.accent,
    contrastBorder: p.border + "55",
    "textLink.foreground": p.blue,
    "textLink.activeForeground": p.accent,
    "editorCursor.foreground": p.accent,
    "editor.selectionBackground": p.accent + "44",
    "editor.inactiveSelectionBackground": p.accent + "22",
    "editor.lineHighlightBackground": p.panel,
    "editorLineNumber.foreground": p.muted,
    "editorLineNumber.activeForeground": p.accent,
    "editorIndentGuide.background1": p.border + "44",
    "editorIndentGuide.activeBackground1": p.border,
    "editorBracketMatch.border": p.accent,
    "editorBracketMatch.background": p.accent + "22",
    "editor.findMatchBackground": p.accent + "44",
    "editor.findMatchHighlightBackground": p.accent + "22",
    "editorError.foreground": p.red,
    "editorWarning.foreground": p.yellow,
    "editorInfo.foreground": p.blue,
    "editorGutter.addedBackground": p.green,
    "editorGutter.deletedBackground": p.red,
    "editorGutter.modifiedBackground": p.blue,
    "diffEditor.insertedTextBackground": p.green + "22",
    "diffEditor.removedTextBackground": p.red + "22",
    "diffEditor.insertedLineBackground": p.green + "12",
    "diffEditor.removedLineBackground": p.red + "12",
    "gitDecoration.modifiedResourceForeground": p.blue,
    "gitDecoration.deletedResourceForeground": p.red,
    "gitDecoration.addedResourceForeground": p.green,
    "button.background": p.accent,
    "button.foreground": p.bg,
    "badge.background": p.accent,
    "badge.foreground": p.bg,
    "list.activeSelectionBackground": p.accent + "33",
    "list.activeSelectionForeground": p.fg,
    "list.hoverBackground": p.panel,
    "tab.activeBackground": p.bg,
    "tab.inactiveBackground": p.panel,
    "tab.activeForeground": p.fg,
    "tab.inactiveForeground": p.muted,
    "tab.activeBorderTop": p.accent,
    "panel.border": p.border,
    "input.border": p.border,
    "widget.border": p.border,
    "scrollbarSlider.background": p.border + "55",
    "selection.background": p.accent + "44",
  });
  const ansi = [
    p.bg,
    p.red,
    p.green,
    p.yellow,
    p.blue,
    p.purple,
    p.green,
    p.fg,
  ];
  [
    "Black",
    "Red",
    "Green",
    "Yellow",
    "Blue",
    "Magenta",
    "Cyan",
    "White",
  ].forEach((n, i) => {
    c["terminal.ansi" + n] = ansi[i];
    c["terminal.ansiBright" + n] = i === 0 ? p.muted : ansi[i];
  });
  return {
    $schema: "vscode://schemas/color-theme",
    name: label(id, mode),
    type: mode,
    colors: c,
    semanticHighlighting: true,
    tokenColors: [
      {
        scope: ["comment", "punctuation.definition.comment"],
        settings: { foreground: p.muted, fontStyle: "italic" },
      },
      {
        scope: ["keyword", "storage", "entity.name.tag"],
        settings: { foreground: p.purple },
      },
      {
        scope: ["string", "markup.inline.raw", "markup.fenced_code"],
        settings: { foreground: p.green },
      },
      {
        scope: ["constant.numeric", "constant.language", "constant.character"],
        settings: { foreground: p.yellow },
      },
      {
        scope: ["entity.name.function", "support.function"],
        settings: { foreground: p.blue },
      },
      {
        scope: [
          "entity.name.type",
          "support.type",
          "entity.other.attribute-name",
        ],
        settings: { foreground: p.accent },
      },
      {
        scope: ["variable", "meta.definition.variable"],
        settings: { foreground: p.fg },
      },
      { scope: ["invalid", "markup.deleted"], settings: { foreground: p.red } },
      {
        scope: ["markup.heading", "markup.bold"],
        settings: { foreground: p.accent, fontStyle: "bold" },
      },
    ],
    semanticTokenColors: {
      variable: p.fg,
      parameter: p.fg,
      property: p.blue,
      function: p.blue,
      method: p.blue,
      type: p.accent,
      class: p.accent,
      enum: p.accent,
      keyword: p.purple,
      string: p.green,
      number: p.yellow,
      comment: p.muted,
      "variable.readonly": p.yellow,
    },
  };
}
