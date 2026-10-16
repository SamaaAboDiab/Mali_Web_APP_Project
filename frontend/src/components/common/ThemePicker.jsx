import { Check } from "lucide-react";
import { THEME_OPTIONS, setTheme, useTheme } from "../../utils/theme";
import ThemePreview from "./ThemePreview";

// Inline theme choices keep the appearance controls visible without an overlapping dropdown.
function ThemePicker({ t }) {
  const current = useTheme();

  return (
    <div className="space-y-2" role="group" aria-label={t("layout.theme")}>
      <p className="text-xs font-semibold text-slate-500">{t("layout.theme")}</p>
      <div className="grid grid-cols-2 gap-2">
        {THEME_OPTIONS.map(({ id, preview }) => {
          const selected = current === id;

          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => setTheme(id)}
              className={`min-w-0 rounded-xl border p-2 text-start transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15 ${
                selected
                  ? "border-brand-400 bg-brand-50/70 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <ThemePreview preview={preview} className="h-8 w-full" />
              <span className="mt-2 flex min-w-0 items-center gap-1.5">
                <span className={`min-w-0 flex-1 truncate text-xs font-bold ${selected ? "text-brand-700" : "text-slate-700"}`}>
                  {t(`theme.${id}.name`)}
                </span>
                {selected && <Check size={15} className="shrink-0 text-brand-600" aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ThemePicker;
