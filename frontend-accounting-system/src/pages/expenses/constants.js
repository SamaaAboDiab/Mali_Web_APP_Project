import { todayISODate } from "../../utils/formatAmount";

const EMPTY_FORM = {
  description: "",
  amount: "",
  currency: "EGP",
  date: todayISODate(),
  paymentMethod: "cash",
  expenseType: "",
  category: "",
  accountId: "",
  notes: "",
};

const EMPTY_FILTERS = {
  period: "all",
  startDate: "",
  endDate: "",
  type: "all",
  category: "all",
  account: "all",
};

const TYPE_PILL_STYLES = {
  daily: "bg-red-100 text-red-700",
  fixed: "bg-yellow-100 text-yellow-700",
  emergency: "bg-slate-200 text-slate-700",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 bg-white";
const labelClass = "text-sm font-semibold text-slate-700";

export { EMPTY_FORM, EMPTY_FILTERS, TYPE_PILL_STYLES, inputClass, labelClass };
