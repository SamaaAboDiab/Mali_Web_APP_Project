import { useTranslation } from "react-i18next";
import { CircleAlert, LoaderCircle, Plus, ReceiptText } from "lucide-react";
import CategorySelect from "../../categories/components/CategorySelect";
import NumberInput from "../../../components/common/NumberInput";
import { inputClass, labelClass } from "../constants";
import DatePicker from "../../../components/common/DatePicker";
import Select from "../../../components/common/Select";
import FormModal from "../../../components/common/FormModal";
import { currencyName, formatMoney } from "../../../utils/formatAmount";
import { SUPPORTED_CURRENCIES } from "../../../utils/currencyConverter";

function currencyOptionLabel(code) {
  return currencyName(code).replace(/\s*\([^)]*\)$/, "");
}


function ExpenseForm({ form, setForm, handleChange, handleSubmit, onClose, createStatus, createError, availableAccounts }) {
  const { t } = useTranslation();

  return (
    <FormModal
      title={
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-expense-soft text-expense" aria-hidden="true">
            <ReceiptText size={19} />
          </span>
          <span className="min-w-0">
            <span className="block">{t("expenses.addFormTitle")}</span>
            <span className="mt-0.5 block text-xs font-normal leading-5 text-slate-500">
              {t("expenses.formSubtitle")}
            </span>
          </span>
        </span>
      }
      onClose={onClose}
      closeDisabled={createStatus === "loading"}
      panelClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit} aria-busy={createStatus === "loading"} className="mt-5 grid grid-cols-1 gap-y-3.5">
        <div className="flex flex-col gap-1">
          <label htmlFor="description" className={labelClass}>{t("expenses.fields.description")}</label>
          <input
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder={t("expenses.descriptionPlaceholder")}
            required
            className={`${inputClass} min-h-12 focus:ring-4 focus:ring-brand-500/10`}
          />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_9rem] gap-2.5">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="amount" className={labelClass}>{t("expenses.fields.amount")}</label>
            <NumberInput
              id="amount"
              name="amount"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              required
              className={`${inputClass} min-h-12 focus:ring-4 focus:ring-brand-500/10`}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-center justify-between gap-1">
              <label htmlFor="currency" className="text-xs font-semibold text-slate-700">{t("expenses.fields.currency")}</label>
              {form.accountId && (
                <span className="truncate text-[11px] font-medium text-slate-500">{t("expenses.currencyFromAccount")}</span>
              )}
            </div>
            <Select
              id="currency"
              name="currency"
              value={form.currency || "EGP"}
              onChange={handleChange}
              disabled={Boolean(form.accountId)}
              className={`${inputClass} min-h-12 bg-slate-50 px-2.5 !text-xs font-bold text-slate-700 focus:ring-4 focus:ring-brand-500/10`}
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>{currencyOptionLabel(code)}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="date" className={labelClass}>{t("expenses.fields.date")}</label>
            <DatePicker
              id="date"
              required
              value={form.date}
              onChange={(value) => handleChange({ target: { name: "date", value } })}
              className={`${inputClass} min-h-12 font-medium text-slate-800 focus:ring-4 focus:ring-brand-500/10`}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="paymentMethod" className={labelClass}>{t("expenses.fields.paymentMethod")}</label>
            <Select
              id="paymentMethod"
              name="paymentMethod"
              value={form.paymentMethod}
              onChange={handleChange}
              className={`${inputClass} min-h-12 focus:ring-4 focus:ring-brand-500/10`}
            >
              <option value="cash">{t("expenses.paymentMethod.cash")}</option>
              <option value="card">{t("expenses.paymentMethod.card")}</option>
              <option value="wallet">{t("expenses.paymentMethod.wallet")}</option>
            </Select>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="expenseType" className={labelClass}>{t("expenses.fields.expenseType")}</label>
            <Select
              id="expenseType"
              name="expenseType"
              required
              value={form.expenseType}
              onChange={handleChange}
              className={`${inputClass} min-h-12 focus:ring-4 focus:ring-brand-500/10`}
            >
              <option value="">{t("expenses.selectType")}</option>
              <option value="daily">{t("expenses.expenseType.daily")}</option>
              <option value="fixed">{t("expenses.expenseType.fixed")}</option>
              <option value="emergency">{t("expenses.expenseType.emergency")}</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="category" className={labelClass}>{t("expenses.fields.category")}</label>
            <CategorySelect
              required
              value={form.category}
              expenseType={form.expenseType}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, category: value }))
              }
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="accountId" className={labelClass}>{t("expenses.fields.account")}</label>
            <Select
              id="accountId"
              name="accountId"
              value={form.accountId}
              onChange={handleChange}
              maxVisibleOptions={2}
              className={`${inputClass} min-h-12 focus:ring-4 focus:ring-brand-500/10`}
            >
              <option value="">{t("expenses.noAccountOption")}</option>
              {availableAccounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name} ({formatMoney(account.balance, account.currency)})
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className={labelClass}>{t("expenses.fields.notes")}</label>
          <textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder={t("expenses.notesPlaceholder")}
            rows="2"
            className={`${inputClass} min-h-16 resize-none placeholder:text-xs focus:ring-4 focus:ring-brand-500/10`}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
          {createError && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-xs font-medium leading-5 text-rose-700 sm:text-sm">
              <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {createError}
            </p>
          )}
          <div className="flex flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
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
              {createStatus === "loading" ? t("expenses.submitting") : t("expenses.submit")}
            </button>
          </div>
        </div>
      </form>
    </FormModal>
  );
}

export default ExpenseForm;
