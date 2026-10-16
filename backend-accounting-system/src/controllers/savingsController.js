const SavingsGoal        = require("../models/SavingsGoal");
const SavingsTransaction = require("../models/SavingsTransaction");
const Account            = require("../models/Account");
const AccountTransaction = require("../models/AccountTransaction");
const withTransaction = require("../utils/withTransaction");

/* ── helper: credit an account and record the transaction ── */
function assertCurrencyMatches(account, currency) {
  const accountCurrency = String(account.currency || "EGP").toUpperCase();
  const expectedCurrency = String(currency || "EGP").toUpperCase();
  if (accountCurrency !== expectedCurrency) {
    throw Object.assign(new Error("The account and savings goal must use the same currency."), { status: 400 });
  }
}

async function creditAccount(userId, accountId, amount, description, date, session, currency) {
  const acc = await Account.findOne({ _id: accountId, user: userId }).session(session);
  if (!acc) throw Object.assign(new Error("Account not found."), { status: 404 });
  if (acc.isArchived || acc.isActive === false) {
    throw Object.assign(new Error("Account is archived (frozen)."), { status: 400, code: "ACCOUNT_FROZEN" });
  }
  assertCurrencyMatches(acc, currency);
  const balBefore = acc.balance;
  acc.balance += amount;
  await acc.save({ session });
  await AccountTransaction.create([{
    user: userId, account: acc._id,
    type: "credit", amount,
    description,
    balanceBefore: balBefore, balanceAfter: acc.balance,
    date: date || new Date(),
  }], { session });
  return acc;
}

async function debitAccount(userId, accountId, amount, description, date, session, currency) {
  const acc = await Account.findOne({ _id: accountId, user: userId }).session(session);
  if (!acc) throw Object.assign(new Error("Account not found."), { status: 404 });
  if (acc.isArchived || acc.isActive === false) {
    throw Object.assign(new Error("Account is archived (frozen)."), { status: 400, code: "ACCOUNT_FROZEN" });
  }
  assertCurrencyMatches(acc, currency);
  if (acc.balance < amount) {
    throw Object.assign(new Error("Insufficient account balance."), { status: 400 });
  }
  const balBefore = acc.balance;
  acc.balance -= amount;
  await acc.save({ session });
  await AccountTransaction.create([{
    user: userId, account: acc._id,
    type: "debit", amount,
    description,
    balanceBefore: balBefore, balanceAfter: acc.balance,
    date: date || new Date(),
  }], { session });
  return acc;
}
/* ── GET /api/savings ─────────────────────────────────── */
exports.getAll = async (req, res, next) => {
  try {
    const goals = await SavingsGoal.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: goals });
  } catch (err) { next(err); }
};

/* ── GET /api/savings/:id ─────────────────────────────── */
exports.getOne = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ success: false, message: "Goal not found" });
    res.json({ success: true, data: goal });
  } catch (err) { next(err); }
};

/* ── POST /api/savings ────────────────────────────────── */
exports.create = async (req, res, next) => {
  try {
    const { name, emoji, targetAmount, currency, targetDate, description } = req.body;
    if (!name?.trim() || !targetAmount) {
      return res.status(400).json({ success: false, message: "Name and target amount are required." });
    }
    const exists = await SavingsGoal.findOne({ user: req.userId, name: name.trim() });
    if (exists) return res.status(409).json({ success: false, message: "A goal with this name already exists." });

    const goal = await SavingsGoal.create({
      user: req.userId,
      name: name.trim(),
      emoji: emoji?.trim() || "🎯",
      targetAmount: parseFloat(targetAmount),
      currency: currency || "EGP",
      targetDate: targetDate ? new Date(targetDate) : undefined,
      description: description?.trim(),
    });
    res.status(201).json({ success: true, data: goal });
  } catch (err) { next(err); }
};

/* ── PUT /api/savings/:id ─────────────────────────────── */
exports.update = async (req, res, next) => {
  try {
    const { name, emoji, targetAmount, currency, targetDate, description } = req.body;
    let result;
    await withTransaction(async (session) => {
      const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId }).session(session);
      if (!goal) throw Object.assign(new Error("Goal not found"), { status: 404 });
      if (goal.status !== "active") {
        throw Object.assign(new Error("Cannot edit a completed or archived goal."), { status: 400 });
      }

      if (name && name.trim() !== goal.name) {
        const duplicate = await SavingsGoal.findOne({
          user: req.userId, name: name.trim(), _id: { $ne: goal._id },
        }).session(session);
        if (duplicate) throw Object.assign(new Error("A goal with this name already exists."), { status: 409 });
        goal.name = name.trim();
      }

      if (emoji !== undefined) goal.emoji = emoji?.trim() || "🎯";
      if (targetAmount !== undefined) {
        const amount = Number(targetAmount);
        if (!Number.isFinite(amount) || amount < goal.currentAmount || amount <= 0) {
          throw Object.assign(new Error("Target amount must be positive and cannot be less than the amount already saved."), { status: 400 });
        }
        goal.targetAmount = amount;
      }

      if (currency && String(currency).toUpperCase() !== String(goal.currency || "EGP").toUpperCase()) {
        const hasTransactions = await SavingsTransaction.exists({ goal: goal._id, user: req.userId }).session(session);
        if (goal.currentAmount !== 0 || hasTransactions) {
          throw Object.assign(new Error("Currency cannot be changed after this goal has a balance or transaction history."), { status: 400 });
        }
        goal.currency = currency;
      }

      if (targetDate) goal.targetDate = new Date(targetDate);
      if (description !== undefined) goal.description = description?.trim();

      await goal.save({ session });
      result = goal;
    });

    res.json({ success: true, data: result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    next(err);
  }
};
exports.remove = async (req, res, next) => {
  try {
    const { accountId } = req.body ?? {};
    await withTransaction(async (session) => {
      const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId }).session(session);
      if (!goal) throw Object.assign(new Error("Goal not found."), { status: 404 });

      if (goal.currentAmount > 0) {
        if (!accountId) {
          throw Object.assign(new Error("Select an account to receive the remaining balance before deleting."), { status: 400 });
        }
        await creditAccount(
          req.userId, accountId, goal.currentAmount, "Return savings — " + goal.name,
          new Date(), session, goal.currency,
        );
      }

      await SavingsTransaction.deleteMany({ goal: goal._id }, { session });
      await goal.deleteOne({ session });
    });

    res.json({ success: true, message: "Goal deleted successfully." });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
};
exports.deposit = async (req, res, next) => {
  try {
    const { amount, accountId, date, note } = req.body;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be positive." });
    }

    let result;
    await withTransaction(async (session) => {
      const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId }).session(session);
      if (!goal) throw Object.assign(new Error("Goal not found."), { status: 404 });
      if (goal.status !== "active") throw Object.assign(new Error("Goal is not active."), { status: 400 });

      const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
      if (amt > remainingAmount) {
        throw Object.assign(new Error("Deposit amount exceeds the remaining target amount."), { status: 400 });
      }

      const txnDate = date ? new Date(date) : new Date();
      if (accountId) {
        await debitAccount(
          req.userId, accountId, amt, "Savings deposit — " + goal.name,
          txnDate, session, goal.currency,
        );
      }

      const [txn] = await SavingsTransaction.create([{
        user: req.userId, goal: goal._id,
        account: accountId || null,
        type: "deposit", amount: amt,
        date: txnDate,
        note: note?.trim(),
      }], { session });

      goal.currentAmount += amt;
      await goal.save({ session });
      result = { goal, transaction: txn };
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    next(err);
  }
};
exports.withdraw = async (req, res, next) => {
  try {
    const { amount, accountId, date, note } = req.body;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be positive." });
    }

    let result;
    await withTransaction(async (session) => {
      const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId }).session(session);
      if (!goal) throw Object.assign(new Error("Goal not found."), { status: 404 });
      if (goal.currentAmount <= 0) throw Object.assign(new Error("No balance in this goal."), { status: 400 });
      if (amt > goal.currentAmount) {
        throw Object.assign(new Error("Cannot withdraw more than the current balance."), { status: 400 });
      }

      const txnDate = date ? new Date(date) : new Date();
      if (accountId) {
        await creditAccount(
          req.userId, accountId, amt, "Savings withdrawal — " + goal.name,
          txnDate, session, goal.currency,
        );
      }

      const [txn] = await SavingsTransaction.create([{
        user: req.userId, goal: goal._id,
        account: accountId || null,
        type: "withdrawal", amount: amt,
        date: txnDate,
        note: note?.trim(),
      }], { session });

      goal.currentAmount -= amt;
      await goal.save({ session });
      result = { goal, transaction: txn };
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    next(err);
  }
};
exports.complete = async (req, res, next) => {
  try {
    const { accountId } = req.body ?? {};
    let result;
    await withTransaction(async (session) => {
      const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId }).session(session);
      if (!goal) throw Object.assign(new Error("Goal not found."), { status: 404 });
      if (goal.status === "completed") {
        throw Object.assign(new Error("Goal is already completed."), { status: 400 });
      }

      if (goal.currentAmount > 0 && accountId) {
        await creditAccount(
          req.userId, accountId, goal.currentAmount, "Completed savings goal — " + goal.name,
          new Date(), session, goal.currency,
        );
      }

      goal.status = "completed";
      goal.completedAt = new Date();
      await goal.save({ session });
      result = goal;
    });

    res.json({ success: true, data: result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    next(err);
  }
};
exports.archive = async (req, res, next) => {
  try {
    const { accountId } = req.body ?? {};
    let result;
    await withTransaction(async (session) => {
      const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId }).session(session);
      if (!goal) throw Object.assign(new Error("Goal not found."), { status: 404 });
      if (goal.status !== "active") {
        throw Object.assign(new Error("Only active goals can be archived."), { status: 400 });
      }

      if (goal.currentAmount > 0) {
        if (!accountId) {
          throw Object.assign(new Error("Select an account to receive the balance before archiving."), { status: 400 });
        }
        await creditAccount(
          req.userId, accountId, goal.currentAmount, "Archived savings — " + goal.name,
          new Date(), session, goal.currency,
        );
        goal.currentAmount = 0;
      }

      goal.status = "archived";
      goal.archivedAt = new Date();
      await goal.save({ session });
      result = goal;
    });

    res.json({ success: true, data: result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    next(err);
  }
};
exports.getTransactions = async (req, res, next) => {
  try {
    const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ success: false, message: "Goal not found" });

    const txns = await SavingsTransaction.find({ goal: goal._id, user: req.userId })
      .populate("account", "name type color currency")
      .sort({ date: -1 });

    res.json({ success: true, data: txns });
  } catch (err) { next(err); }
};
