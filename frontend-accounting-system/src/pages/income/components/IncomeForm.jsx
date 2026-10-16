import FormModal from "../../../components/common/FormModal";
import { CircleAlert, LoaderCircle, Plus } from "lucide-react";
import DatePicker from "../../../components/common/DatePicker";
import Select from "../../../components/common/Select";
import NumberInput from "../../../components/common/NumberInput";
import { currencyName } from "../../../utils/formatAmount";
import { INCOME_CURRENCIES } from "../constants";

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500";
const labelClass = "text-sm font-semibold text-slate-700";

function IncomeForm({ form, createStatus, createError, onChange, onSubmit, onCancel, t }) {
  return (
    <FormModal title={t("income.formTitle")} onClose={onCancel} closeDisabled={createStatus === "loading"}>
      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="income-name" className={labelClass}>
            {t("income.nameLabel")}
          </label>
          <input
            id="income-name"
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder={t("income.namePlaceholder")}
            maxLength={100}
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="income-category" className={labelClass}>
            {t("income.categoryLabel")}
          </label>
          <Select
            id="income-category"
            name="category"
            required
            value={form.category}
            onChange={onChange}
            className={inputClass}
          >
            <option value="">{t("income.categoryPlaceholder")}</option>
            {["salary", "freelance", "rental", "investment", "other"].map((category) => (
              <option key={category} value={category}>
                {t(`income.categories.${category}`)}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="income-amount" className={labelClass}>
            {t("income.amountLabel")}
          </label>
          <NumberInput
            id="income-amount"
            name="amount"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={onChange}
            placeholder="0.00"
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="income-currency" className={labelClass}>
            {t("income.currencyLabel")}
          </label>
          <Select
            id="income-currency"
            name="currency"
            value={form.currency}
            onChange={onChange}
            className={inputClass}
          >
            {INCOME_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {currencyName(code)}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="income-date" className={labelClass}>
            {t("income.receivedDateLabel")}
          </label>
          <DatePicker
            id="income-date"
            required
            value={form.receivedDate}
            onChange={(value) => onChange({ target: { name: "receivedDate", value } })}
            className={`${inputClass} font-medium text-slate-800`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="income-recurrence" className={labelClass}>
            {t("income.recurrenceLabel")}
          </label>
          <Select
            id="income-recurrence"
            name="recurrence"
            value={form.recurrence || "once"}
            onChange={onChange}
            className={inputClass}
          >
            {["once", "weekly", "monthly", "yearly"].map((key) => (
              <option key={key} value={key}>
                {t(`income.recurrence.${key}`)}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="income-notes" className={labelClass}>
            {t("income.notesLabel")}
          </label>
          <textarea
            id="income-notes"
            name="notes"
            value={form.notes}
            onChange={onChange}
            placeholder={t("income.notesPlaceholder")}
            maxLength={500}
            rows="2"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:col-span-2">
          {createError && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-xs font-medium leading-5 text-rose-700 sm:text-sm">
              <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {createError}
            </p>
          )}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={createStatus === "loading"}
              className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={createStatus === "loading"}
              className="mali-primary-action flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-brand-900/15 transition hover:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:cursor-wait disabled:opacity-65"
            >
              {createStatus === "loading" ? (
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus size={17} aria-hidden="true" />
              )}
              {createStatus === "loading" ? t("income.submitting") : t("income.submit")}
            </button>
          </div>
        </div>
      </form>
    </FormModal>
  );
}

export default IncomeForm;
