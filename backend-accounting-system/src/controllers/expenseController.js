const Expense         = require("../models/Expense");
const Income          = require("../models/Income");
const User            = require("../models/User");
const ExpenseCategory = require("../models/ExpenseCategory");
const Account         = require("../models/Account");
const { recordTxn, reverseTxn, assertAccountsUsable } = require("./accountController");
const withTransaction = require("../utils/withTransaction");

// An expense paid from an account is in that account's currency, whatever the client sent.
async function accountCurrency(userId, accountId, session) {
  if (!accountId) return null;
  let query = Account.findOne({ _id: accountId, user: userId }).select("currency");
  if (session) query = query.session(session);
  const account = await query.lean();
  return account?.currency || null;
}
// GET /api/expenses
// Supported query filters (can be combined):
// - period: "day" | "today", "week", "month", "custom"
// - startDate, endDate: ISO date strings
// - expenseType / type: "daily" | "fixed" | "emergency" | "monthly"
// - category: category name
// - account / accountId: Account ObjectId
exports.list = async (req, res, next) => {
  try {
    const {
      period,
      startDate,
      endDate,
      expenseType,
      type,
      category,
      account,
      accountId,
    } = req.query;

    const filter = { user: req.userId };

    // 1. الفلترة بالفترة الزمنية (يوم / أسبوع / شهر / مخصص)
    const now = new Date();
    if (period === "day" || period === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (period === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (period === "custom" || startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        dateFilter.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        dateFilter.$lte = e;
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.date = dateFilter;
      }
    }

    // 2. الفلترة بالنوع (يومي / شهري / طارئ)
    const targetType = expenseType || type;
    if (targetType && targetType !== "all") {
      const normalizedType = targetType === "monthly" ? "fixed" : targetType;
      filter.expenseType = normalizedType;
    }

    // 3. الفلترة بالـ category
    if (category && category !== "all") {
      filter.category = category.trim();
    }

    // 4. الفلترة بالحساب
    const targetAccount = account || accountId;
    if (targetAccount && targetAccount !== "all") {
      filter.account = targetAccount;
    }

    const expenses = await Expense.find(filter)
      .populate("account", "name type currency")
      .sort({ date: -1 });

    res.json({ success: true, count: expenses.length, data: expenses });
  } catch (err) { next(err); }
};

// POST /api/expenses
exports.create = async (req, res, next) => {
  try {
    const { amount, description, date, paymentMethod, expenseType, category, currency, notes, status, accountId } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }
    const categoryExists = await ExpenseCategory.findOne({ user: req.userId, name: category.trim() });
    if (!categoryExists) {
      return res.status(400).json({ success: false, message: "Invalid category: not found in your categories list" });
    }

    const user = await User.findById(req.userId).lean();
    if (user?.subscriptionType === "trial") {
      const [incCount, expCount] = await Promise.all([
        Income.countDocuments({ user: req.userId }),
        Expense.countDocuments({ user: req.userId }),
      ]);
      if (incCount + expCount >= 20) {
        return res.status(403).json({ success: false, code: "TRIAL_LIMIT_20_ENTRIES", message: "Trial limit reached: maximum 20 entries allowed." });
      }
    }

    let expense;
    await withTransaction(async (session) => {
      await assertAccountsUsable(req.userId, accountId, session);
      const txnDate = date ? new Date(date) : new Date();
      expense = new Expense({
        user: req.userId,
        amount: parseFloat(amount), description,
        date: txnDate,
        paymentMethod, expenseType, category: category.trim(),
        currency: (await accountCurrency(req.userId, accountId, session)) || currency || "EGP",
        notes, status: status || "confirmed",
        account: accountId || null,
      });
      await expense.save({ session });

      if (accountId) {
        await recordTxn(req.userId, accountId, "debit", parseFloat(amount), description, expense.date, "Expense", expense._id, undefined, session);
      }
    });

    res.status(201).json({ success: true, data: expense });
  } catch (err) { next(err); }
};
exports.update = async (req, res, next) => {
  try {
    const { amount, description, date, paymentMethod, expenseType, category, currency, notes, status, accountId, account } = req.body;

    if (category !== undefined) {
      if (!category || !category.trim()) {
        return res.status(400).json({ success: false, message: "Category is required" });
      }
      const categoryExists = await ExpenseCategory.findOne({ user: req.userId, name: category.trim() });
      if (!categoryExists) {
        return res.status(400).json({ success: false, message: "Invalid category: not found in your categories list" });
      }
    }

    let expense;
    await withTransaction(async (session) => {
      const old = await Expense.findOne({ _id: req.params.id, user: req.userId }).session(session);
      if (!old) throw Object.assign(new Error("Expense not found"), { status: 404 });

      const targetAccountId = accountId !== undefined ? (accountId || null) : (account !== undefined ? (account || null) : old.account);
      await assertAccountsUsable(req.userId, old.account, targetAccountId, session);
      if (old.account) await reverseTxn(req.userId, "Expense", old._id, session);

      expense = await Expense.findOneAndUpdate(
        { _id: req.params.id, user: req.userId },
        {
          amount: parseFloat(amount),
          description,
          date: date ? new Date(date) : old.date,
          paymentMethod,
          expenseType,
          category: category ? category.trim() : old.category,
          currency: (await accountCurrency(req.userId, targetAccountId, session)) || currency || old.currency,
          notes,
          status: status || old.status,
          account: targetAccountId,
        },
        { new: true, runValidators: true, session },
      );

      if (targetAccountId) {
        await recordTxn(req.userId, targetAccountId, "debit", parseFloat(amount), description, expense.date, "Expense", expense._id, undefined, session);
      }
    });

    await expense.populate("account", "name type currency");
    res.json({ success: true, data: expense });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    next(err);
  }
};
exports.remove = async (req, res, next) => {
  try {
    await withTransaction(async (session) => {
      const expense = await Expense.findOne({ _id: req.params.id, user: req.userId }).session(session);
      if (!expense) throw Object.assign(new Error("Expense not found"), { status: 404 });

      await assertAccountsUsable(req.userId, expense.account, session);
      if (expense.account) await reverseTxn(req.userId, "Expense", expense._id, session);
      await expense.deleteOne({ session });
    });
    res.json({ success: true, message: "Expense deleted successfully" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    next(err);
  }
};
