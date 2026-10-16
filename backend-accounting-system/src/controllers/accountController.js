const Account = require("../models/Account");
const AccountTransaction = require("../models/AccountTransaction");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const SavingsTransaction = require("../models/SavingsTransaction");
const DebtPayment = require("../models/DebtPayment");
const withTransaction = require("../utils/withTransaction");

/* ── helpers ─────────────────────────────────────── */
/* ── archived accounts are frozen: no deposits and no withdrawals ── */
function assertAccountUsable(account) {
  if (account && (account.isArchived || account.isActive === false)) {
    throw Object.assign(
      new Error(`Account "${account.name}" is archived (frozen): you can't deposit into it or withdraw from it.`),
      { status: 400, code: "ACCOUNT_FROZEN" },
    );
  }
}

async function assertAccountsUsable(userId, ...accountIds) {
  const lastArg = accountIds.at(-1);
  const session = lastArg && typeof lastArg.inTransaction === "function" ? accountIds.pop() : null;
  const ids = [...new Set(accountIds.filter(Boolean).map(String))];
  for (const id of ids) {
    let query = Account.findOne({ _id: id, user: userId });
    if (session) query = query.session(session);
    const account = await query;
    if (!account) throw Object.assign(new Error("Account not found."), { status: 404 });
    assertAccountUsable(account);
  }
}

async function recordTxn(userId, accountId, type, amount, description, date, relatedModel, relatedId, notes, session) {
  let query = Account.findOne({ _id: accountId, user: userId });
  if (session) query = query.session(session);
  const account = await query;
  if (!account) throw Object.assign(new Error("Account not found."), { status: 404 });
  assertAccountUsable(account);
  const balanceBefore = account.balance;
  if (type === "debit") account.balance -= amount;
  if (type === "credit") account.balance += amount;
  // "adjustment" sets balance directly — handled by adjustBalance
  await account.save(session ? { session } : undefined);
  await AccountTransaction.create([{
    user: userId, account: accountId, type, amount,
    description, balanceBefore, balanceAfter: account.balance,
    date, relatedModel: relatedModel || null, relatedId: relatedId || null, notes,
  }], session ? { session } : undefined);
}

// Reverse a previously recorded transaction linked to a related doc
async function reverseTxn(userId, relatedModel, relatedId, session) {
  let query = AccountTransaction.findOne({ user: userId, relatedModel, relatedId });
  if (session) query = query.session(session);
  const txn = await query;
  if (!txn) return;
  let accountQuery = Account.findOne({ _id: txn.account, user: userId });
  if (session) accountQuery = accountQuery.session(session);
  const account = await accountQuery;
  if (!account) throw Object.assign(new Error("Account not found."), { status: 404 });
  assertAccountUsable(account);
  if (txn.type === "debit") account.balance += txn.amount;
  if (txn.type === "credit") account.balance -= txn.amount;
  await account.save(session ? { session } : undefined);
  await txn.deleteOne(session ? { session } : undefined);
}

/* ── exports ─────────────────────────────────────── */
// GET /api/accounts
exports.list = async (req, res, next) => {
  try {
    const accounts = await Account.find({ user: req.userId }).sort({ createdAt: 1 });
    res.json({ success: true, data: accounts });
  } catch (err) { next(err); }
};

// POST /api/accounts
exports.create = async (req, res, next) => {
  try {
    const { name, type, balance, currency, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: "Account name is required." });

    const initialBalance = balance === undefined || balance === null || balance === "" ? 0 : Number(balance);
    if (!Number.isFinite(initialBalance)) {
      return res.status(400).json({ success: false, message: "Initial balance must be a valid number." });
    }

    const exists = await Account.findOne({ user: req.userId, name: name.trim() });
    if (exists) return res.status(400).json({ success: false, message: "An account with this name already exists." });

    let account;
    await withTransaction(async (session) => {
      account = new Account({
        user: req.userId,
        name: name.trim(), type,
        balance: initialBalance,
        currency: currency || "EGP",
        color: color || "#0d9488",
      });
      await account.save({ session });

      if (initialBalance !== 0) {
        await AccountTransaction.create([{
          user: req.userId, account: account._id,
          type: initialBalance > 0 ? "credit" : "debit",
          amount: Math.abs(initialBalance),
          description: "Initial balance",
          balanceBefore: 0, balanceAfter: initialBalance,
          date: new Date(),
        }], { session });
      }
    });

    res.status(201).json({ success: true, data: account });
  } catch (err) { next(err); }
};
exports.update = async (req, res, next) => {
  try {
    const { name, type, currency, color } = req.body;

    if (name) {
      const dup = await Account.findOne({ user: req.userId, name: name.trim(), _id: { $ne: req.params.id } });
      if (dup) return res.status(400).json({ success: false, message: "An account with this name already exists." });
    }

    let account;
    await withTransaction(async (session) => {
      account = await Account.findOne({ _id: req.params.id, user: req.userId }).session(session);
      if (!account) throw Object.assign(new Error("Account not found"), { status: 404 });

      if (currency && String(currency).toUpperCase() !== String(account.currency || "EGP").toUpperCase()) {
        const hasTransactions = await AccountTransaction.exists({ account: account._id, user: req.userId }).session(session);
        if (account.balance !== 0 || hasTransactions) {
          throw Object.assign(new Error("Currency cannot be changed after this account has a balance or transaction history."), { status: 400 });
        }
        account.currency = currency;
      }
      if (name) account.name = name.trim();
      if (type) account.type = type;
      if (color) account.color = color;

      await account.save({ session });
    });

    res.json({ success: true, data: account });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    next(err);
  }
};
exports.remove = async (req, res, next) => {
  try {
    let account;
    await withTransaction(async (session) => {
      account = await Account.findOne({ _id: req.params.id, user: req.userId }).session(session);
      if (!account) throw Object.assign(new Error("Account not found"), { status: 404 });
      if (account.balance !== 0) {
        throw Object.assign(new Error("An account with a balance cannot be deleted. Archive it instead."), { status: 409 });
      }

      const hasTransactions = await AccountTransaction.exists({ account: account._id, user: req.userId }).session(session);
      const hasExpenses = await Expense.exists({ account: account._id, user: req.userId }).session(session);
      const hasIncome = await Income.exists({ account: account._id, user: req.userId }).session(session);
      const hasSavingsTransactions = await SavingsTransaction.exists({ account: account._id, user: req.userId }).session(session);
      const hasDebtPayments = await DebtPayment.exists({ accountId: account._id, userId: req.userId }).session(session);
      if (hasTransactions || hasExpenses || hasIncome || hasSavingsTransactions || hasDebtPayments) {
        throw Object.assign(new Error("An account with transaction history cannot be deleted. Archive it instead."), { status: 409 });
      }

      await account.deleteOne({ session });
    });
    res.json({ success: true, message: "Account deleted" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};
exports.adjustBalance = async (req, res, next) => {
  try {
    const { newBalance, notes } = req.body;
    if (newBalance === undefined || newBalance === null || newBalance === "") {
      return res.status(400).json({ success: false, message: "newBalance is required." });
    }
    const balanceAfter = Number(newBalance);
    if (!Number.isFinite(balanceAfter)) {
      return res.status(400).json({ success: false, message: "newBalance must be a valid number." });
    }

    let account;
    await withTransaction(async (session) => {
      account = await Account.findOne({ _id: req.params.id, user: req.userId }).session(session);
      if (!account) throw Object.assign(new Error("Account not found"), { status: 404 });
      assertAccountUsable(account);

      const balanceBefore = account.balance;
      const diff = Math.abs(balanceAfter - balanceBefore);
      account.balance = balanceAfter;
      await account.save({ session });

      await AccountTransaction.create([{
        user: req.userId, account: account._id,
        type: "adjustment", amount: diff,
        description: "Manual balance adjustment",
        balanceBefore, balanceAfter,
        date: new Date(), notes: notes || undefined,
      }], { session });
    });

    res.json({ success: true, data: account });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    next(err);
  }
};
exports.toggleArchive = async (req, res, next) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.userId });
    if (!account) return res.status(404).json({ success: false, message: "Account not found" });

    // تبديل حالة الأرشفة وتحديث النشاط تلقائياً
    account.isArchived = !account.isArchived;
    account.isActive = !account.isArchived;

    await account.save();
    res.json({ success: true, data: account });
  } catch (err) { next(err); }
};

// GET /api/accounts/activity  (recent transactions across all user accounts)
exports.recentActivity = async (req, res, next) => {
  try {
    const ids = (await Account.find({ user: req.userId }).select("_id")).map((a) => a._id);
    const txns = await AccountTransaction.find({ account: { $in: ids } })
      .populate("account", "name type color currency")
      .sort({ date: -1 })
      .limit(parseInt(req.query.limit) || 30);
    res.json({ success: true, data: txns });
  } catch (err) { next(err); }
};

// GET /api/accounts/:id/transactions
exports.getTransactions = async (req, res, next) => {
  try {
    const filter = { account: req.params.id, user: req.userId };
    const { start, end } = req.query;
    if (start || end) {
      filter.date = {};
      if (start) filter.date.$gte = new Date(start);
      if (end) filter.date.$lte = new Date(end);
    }
    const txns = await AccountTransaction.find(filter)
      .populate("account", "name currency")
      .sort({ date: -1 });
    res.json({ success: true, data: txns });
  } catch (err) { next(err); }
};

// POST /api/accounts/transfer  { fromId, toId, amount, description }
// Used for ATM withdrawal: bank → cash, or any internal transfer
exports.transfer = async (req, res, next) => {
  try {
    const { fromId, toId, amount, description } = req.body;
    const amt = Number(amount);
    if (!fromId || !toId) return res.status(400).json({ success: false, message: "fromId and toId are required." });
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ success: false, message: "Amount must be positive." });
    if (String(fromId) === String(toId)) {
      return res.status(400).json({ success: false, message: "Source and destination accounts must be different." });
    }

    let result;
    await withTransaction(async (session) => {
      const from = await Account.findOne({ _id: fromId, user: req.userId }).session(session);
      const to = await Account.findOne({ _id: toId, user: req.userId }).session(session);
      if (!from) throw Object.assign(new Error("Source account not found."), { status: 404 });
      if (!to) throw Object.assign(new Error("Destination account not found."), { status: 404 });
      assertAccountUsable(from);
      assertAccountUsable(to);

      const fromCurrency = String(from.currency || "EGP").toUpperCase();
      const toCurrency = String(to.currency || "EGP").toUpperCase();
      if (fromCurrency !== toCurrency) {
        throw Object.assign(new Error("Transfers between different currencies are not supported."), { status: 400 });
      }
      if (from.balance < amt) {
        throw Object.assign(new Error("Insufficient balance."), { status: 400 });
      }

      const label = description || "Internal Transfer";
      const now = new Date();
      const fromBefore = from.balance;
      from.balance -= amt;
      await from.save({ session });
      await AccountTransaction.create([{
        user: req.userId, account: from._id,
        type: "debit", amount: amt,
        description: label,
        balanceBefore: fromBefore, balanceAfter: from.balance, date: now,
      }], { session });

      const toBefore = to.balance;
      to.balance += amt;
      await to.save({ session });
      await AccountTransaction.create([{
        user: req.userId, account: to._id,
        type: "credit", amount: amt,
        description: label,
        balanceBefore: toBefore, balanceAfter: to.balance, date: now,
      }], { session });

      result = { from, to };
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
/* ── used by expense / income controllers ─────────── */
exports.recordTxn = recordTxn;
exports.assertAccountsUsable = assertAccountsUsable;
exports.reverseTxn = reverseTxn;
