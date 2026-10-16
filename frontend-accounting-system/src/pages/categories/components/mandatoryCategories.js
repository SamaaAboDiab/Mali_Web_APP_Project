import i18n from "../../../i18n/i18n";

// التصنيفات الإلزامية التي لا يمكن حذفها أبداً
// (names are stored in Arabic by the backend; they're the identifiers, never translate the stored value)
const DEFAULT_CATEGORY_KEYS = {
  "أكل": "food",
  "مواصلات": "transport",
  "إيجار": "rent",
  "فواتير": "bills",
  "صحة": "health",
  "تعليم": "education",
  "تسلية": "entertainment",
  "غيره": "other",
};

const DEFAULT_CATEGORY_COLORS = {
  "أكل": "#ea580c",
  "مواصلات": "#2563eb",
  "إيجار": "#7c3aed",
  "فواتير": "#b45309",
  "صحة": "#059669",
  "تعليم": "#0891b2",
  "تسلية": "#db2777",
  "غيره": "#475569",
};

const CUSTOM_CATEGORY_COLORS = [
  "#0f766e",
  "#4f46e5",
  "#c026d3",
  "#65a30d",
  "#be123c",
  "#0369a1",
  "#a16207",
  "#4338ca",
  "#15803d",
  "#b91c1c",
  "#0e7490",
  "#86198f",
  "#4d7c0f",
  "#c2410c",
  "#1e40af",
  "#9d174d",
];

export const MANDATORY_CATEGORIES = Object.keys(DEFAULT_CATEGORY_KEYS);

// Display name for a category in the active UI language (default categories are translated,
// user-created ones are shown exactly as the user typed them).
export function categoryLabel(name) {
  const key = DEFAULT_CATEGORY_KEYS[name];
  return key ? i18n.t(`defaultCategories.${key}`) : name;
}

export function getCategoryDisplayColor(category) {
  const name = typeof category === "string" ? category : category?.name;
  if (DEFAULT_CATEGORY_COLORS[name]) return DEFAULT_CATEGORY_COLORS[name];

  const savedColor = typeof category === "object" ? category?.color : null;
  if (typeof savedColor === "string") {
    const match = savedColor.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (match && savedColor.toLowerCase() !== "#6b7280") {
      return match[1].length === 3
        ? `#${[...match[1]].map((character) => character + character).join("")}`
        : savedColor;
    }
  }

  if (!name) return "#64748b";

  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  }
  return CUSTOM_CATEGORY_COLORS[hash % CUSTOM_CATEGORY_COLORS.length];
}
