import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

function NoCashAccount({ handleCreateCashAccount, createStatus }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl bg-amber-50 p-6 text-center text-amber-800">
      <p className="font-semibold">{t("cash.noAccount")}</p>
      <button
        type="button"
        onClick={handleCreateCashAccount}
        disabled={createStatus === "loading"}
        className="mt-3 inline-flex w-fit items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
      >
        <Plus size={16} /> {t("cash.createAccount")}
      </button>
    </div>
  );
}

export default NoCashAccount;
