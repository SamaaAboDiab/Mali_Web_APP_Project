import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../../../api/categoryApi";
import { extractError } from "../../../utils/errorHandler";

const DEFAULT_COLOR = "#6b7280";

const TYPE_OPTIONS = [
  { value: "daily" },
  { value: "fixed" },
  { value: "emergency" },
];

import { MANDATORY_CATEGORIES, categoryLabel, getCategoryDisplayColor } from "./mandatoryCategories";

export default function CategorySelect({
  id = "category",
  name = "category",
  value,
  onChange,
  expenseType = "daily",
  className,
  required,
}) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [isOpen,     setIsOpen]     = useState(false);
  const [adding,     setAdding]     = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newName,    setNewName]    = useState("");
  const [newType,    setNewType]    = useState(expenseType || "daily");
  const [newColor,   setNewColor]   = useState(DEFAULT_COLOR);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [listError, setListError] = useState("");

  const containerRef = useRef(null);

  function scrollExpenseDialog(event) {
    if (event.target instanceof Element && event.target.closest("select")) return;

    const dialog = containerRef.current?.closest('[role="dialog"]');
    if (!dialog) return;

    const maxScroll = dialog.scrollHeight - dialog.clientHeight;
    if (maxScroll <= 0 || event.deltaY === 0) return;

    const nextScroll = Math.max(0, Math.min(maxScroll, dialog.scrollTop + event.deltaY));
    if (nextScroll === dialog.scrollTop) return;

    dialog.scrollTop = nextScroll;
    event.preventDefault();
  }

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setAdding(false);
        setEditingCategory(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // جلب التصنيفات ديناميكياً من API الباك إند
  useEffect(() => {
    let isMounted = true;

    async function loadApiCategories() {
      try {
        const data = await listCategories();
        if (!isMounted) return;
        setCategories(Array.isArray(data) ? data : []);
      } catch {
        if (isMounted) setCategories([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    setLoading(true);
    loadApiCategories();
    window.addEventListener("expense-categories:changed", loadApiCategories);

    return () => {
      isMounted = false;
      window.removeEventListener("expense-categories:changed", loadApiCategories);
    };
  }, []);

  // اختيار تصنيف بالاسم
  function handleSelect(catName) {
    onChange?.(catName);
    setIsOpen(false);
  }

  // إضافة تصنيف مخصص جديد عبر POST /api/expense-categories
  async function handleSaveCategory(e) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setError(t("categoriesPage.nameRequired"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name:  trimmed,
        type:  newType,
        color: newColor,
      };
      const saved = editingCategory
        ? await updateCategory(editingCategory._id, payload)
        : await createCategory(payload);

      // إضافة التصنيف الجديد العائد من الباك إند للقائمة فوراً
      setCategories((prev) => {
        if (editingCategory) {
          return prev.map((category) => category._id === saved._id ? saved : category);
        }
        const exists = prev.some((category) => category._id === saved._id || category.name === saved.name);
        return exists ? prev : [...prev, saved];
      });

      // تحديد الاسم مباشرة في الفورم
      if (!editingCategory || value === editingCategory.name || String(value) === String(editingCategory._id)) {
        onChange?.(saved.name || trimmed);
      }

      setAdding(false);
      setEditingCategory(null);
      setIsOpen(false);
      setNewName("");
      setNewType(expenseType || "daily");
      setNewColor(DEFAULT_COLOR);
      window.dispatchEvent(new Event("expense-categories:changed"));
    } catch (err) {
      setError(
        extractError(err, t(editingCategory ? "categoriesPage.saveError" : "categoriesPage.createError"))
      );
    } finally {
      setSaving(false);
    }
  }

  // حذف تصنيف مخصص عبر DELETE /api/expense-categories/:id
  async function handleDelete(e, cat) {
    e.stopPropagation();
    if (!cat._id || cat.isDefault || MANDATORY_CATEGORIES.includes(cat.name)) return;

    setDeletingId(cat._id);
    setListError("");
    try {
      await deleteCategory(cat._id);

      setCategories((prev) => prev.filter((c) => c._id !== cat._id));
      window.dispatchEvent(new Event("expense-categories:changed"));

      if (value === cat.name || String(value) === String(cat._id)) {
        onChange?.("");
      }
    } catch (err) {
      setListError(extractError(err, t("categoriesPage.deleteError")));
    } finally {
      setDeletingId(null);
    }
  }

  // مطابقة التصنيف المختار سواء تم حفظه كاسم أو كـ ID
  const selectedCategory = categories.find(
    (c) => c.name === value || (c._id && String(c._id) === String(value))
  );

  const displayLabel = selectedCategory
    ? categoryLabel(selectedCategory.name)
    : value
      ? categoryLabel(value)
      : t("categoriesPage.select.placeholder");

  const defaultButtonClass =
    "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-start outline-none transition focus:border-brand-500";

  return (
    <div ref={containerRef} className="relative w-full">
      <input type="hidden" name={name} value={value || ""} />
      {required && (
        // Invisible stand-in so the browser's form validation blocks submitting without a category.
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value || ""}
          onChange={() => {}}
          data-select-proxy=""
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      )}

      {/* زر عرض القائمة المنسدلة */}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen(!isOpen);
          setAdding(false);
          setEditingCategory(null);
        }}
        className={`min-h-11 ${className || defaultButtonClass}`}
      >
        <div className="flex items-center gap-2">
          {selectedCategory || value ? (
            <span className="flex items-center gap-1.5 font-medium text-slate-800">
              <span
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: getCategoryDisplayColor(selectedCategory || value) }}
              />
              {displayLabel}
            </span>
          ) : (
            <span className="text-slate-400">
              {loading ? t("categoriesPage.select.loading") : t("categoriesPage.select.placeholder")}
            </span>
          )}
        </div>

        {/* أيقونة السهم لأسفل SVG */}
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* القائمة المنسدلة بدون كلمة "اختر التصنيف" وبأيقونات SVG */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-0.5 shadow-lg">
          {adding || editingCategory ? (
            <div className="relative rounded-lg border border-slate-100 bg-slate-50/80 p-1.5" onWheel={scrollExpenseDialog}>
              <div className={editingCategory ? "flex items-center justify-between gap-2" : "absolute left-1.5 top-1.5"}>
                {editingCategory && <span className="text-xs font-bold text-slate-800">{t("categoriesPage.select.editTitle")}</span>}
                <button
                  type="button"
                  onClick={() => { setAdding(false); setEditingCategory(null); setError(""); }}
                  aria-label={t("common.close")}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-700"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>

              <div className={editingCategory ? "mt-2 space-y-1.5" : "space-y-1"}>
                <div>
                  <label htmlFor={`${id}-custom-name`} className="mb-0.5 block text-[10px] font-semibold text-slate-600">
                    {t("categoriesPage.nameLabel")}
                  </label>
                  <input
                    id={`${id}-custom-name`}
                    type="text"
                    autoFocus
                    maxLength={50}
                    placeholder={t("categoriesPage.select.newPlaceholder")}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveCategory(e);
                      }
                    }}
                    className="min-h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label htmlFor={`${id}-custom-type`} className="mb-0.5 block text-[10px] font-semibold text-slate-600">
                    {t("categoriesPage.typeLabel")}
                  </label>
                  <div
                    id={`${id}-custom-type`}
                    role="group"
                    aria-label={t("categoriesPage.typeLabel")}
                    className="grid grid-cols-3 gap-1"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={newType === opt.value}
                        onClick={() => setNewType(opt.value)}
                        className={`min-h-8 min-w-0 rounded-md px-1 text-[10px] font-semibold transition ${
                          newType === opt.value
                            ? "bg-brand-600 text-white shadow-sm"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {t(`categoriesPage.type.${opt.value}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && <p role="alert" className="mt-1 rounded-md bg-rose-50 px-2 py-1.5 text-[10px] font-medium text-rose-700">{error}</p>}

              <div className="mt-1 flex items-center gap-2 border-t border-slate-200/80 pt-1">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor={`${id}-custom-color`}
                    title={t("categoriesPage.colorLabel")}
                    className="relative block h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-white shadow-sm ring-1 ring-slate-300"
                    style={{ backgroundColor: newColor }}
                  >
                    <input
                      id={`${id}-custom-color`}
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      aria-label={t("categoriesPage.colorLabel")}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                  <span className="text-[10px] font-medium text-slate-500">{t("categoriesPage.colorLabel")}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCategory}
                  disabled={saving}
                  className="min-h-8 min-w-20 rounded-md bg-brand-600 px-3 text-[11px] font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {saving
                    ? t(editingCategory ? "categoriesPage.saving" : "categoriesPage.select.adding")
                    : t(editingCategory ? "categoriesPage.save" : "categoriesPage.select.add")}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* قائمة الاختيارات المسترجعة من الـ API */}
              {listError && <p className="px-3 py-1.5 text-xs text-rose-600">{listError}</p>}
              <div
                className="max-h-28 overflow-y-auto overscroll-y-auto space-y-0.5"
                onWheel={(event) => {
                  const list = event.currentTarget;
                  const atTop = list.scrollTop <= 0;
                  const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
                  if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
                    scrollExpenseDialog(event);
                  }
                }}
              >
                {categories.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-400">
                    {loading ? t("categoriesPage.select.loadingList") : t("categoriesPage.select.none")}
                  </p>
                ) : (
                  categories.map((cat) => {
                    const isCustom = !cat.isDefault && !MANDATORY_CATEGORIES.includes(cat.name) && Boolean(cat._id);
                    const isSelected = value === cat.name || String(value) === String(cat._id);

                    return (
                      <div
                        key={cat._id || cat.name}
                        onClick={() => handleSelect(cat.name)}
                        className={`group flex h-9 shrink-0 cursor-pointer items-center justify-between rounded-lg px-3 py-0 text-sm transition hover:bg-slate-100 ${
                          isSelected ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: getCategoryDisplayColor(cat) }}
                          />
                          <span>{categoryLabel(cat.name)}</span>
                        </div>

                        {/* أيقونة الحذف SVG للتصنيفات المخصصة */}
                        {isCustom && (
                          <span className="flex items-center gap-1">
                            <button
                              type="button"
                              title={t("categoriesPage.select.editTitle")}
                              aria-label={t("categoriesPage.select.editTitle")}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(cat);
                                setAdding(false);
                                setNewName(cat.name);
                                setNewType(cat.type || expenseType || "daily");
                                setNewColor(
                                  cat.color && cat.color.toLowerCase() !== DEFAULT_COLOR
                                    ? cat.color
                                    : getCategoryDisplayColor(cat)
                                );
                                setError("");
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-brand-100 hover:text-brand-700"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-8.9 8.9-3.9 1.1 1.1-3.9 8.872-8.928ZM4.5 17.25h11a.75.75 0 0 0 0-1.5h-11a.75.75 0 0 0 0 1.5Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              title={t("categoriesPage.select.deleteTitle")}
                              aria-label={t("categoriesPage.select.deleteTitle")}
                              onClick={(e) => handleDelete(e, cat)}
                              disabled={deletingId === cat._id}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50"
                            >
                              {deletingId === cat._id ? (
                                <span className="text-xs">...</span>
                              ) : (
                                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0-1.06-1.06L11.06 10l-3.72 3.72a.75.75 0 0 1-1.06-1.06L11.06 8.94 6.28 5.22Z" />
                                </svg>
                              )}
                            </button>
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* زر إضافة تصنيف جديد بأيقونة SVG */}
              <div className="mt-1 border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setNewType(expenseType || "daily");
                    setEditingCategory(null);
                    setNewName("");
                    setNewColor(DEFAULT_COLOR);
                    setError("");
                    setAdding(true);
                  }}
                  className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                  <span>{t("categoriesPage.select.addOption")}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
