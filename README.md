# 💰 Personal Finance Tracker | سيستم تتبع المالية الشخصية

A comprehensive, full-stack personal finance management system designed to help users track income, expenses, bank accounts, cash flows, and debts with real-time updates and interactive analytics.

---

## 🌟 Key Features & Modules

### 1. 🔐 Authentication & Security (الأمان والحسابات)
* **Secure Login / Register:** Email & Password authentication with JWT.
* **Security Rules:** Session persistency ("Remember Me"), automatic lockout after 5 failed login attempts, and password reset via secure email tokens (valid for 24 hours).

### 2. 💵 Income Tracker (تتبع المداخيل)
* **Income Sources:** Add, edit, and delete recurring or one-time income streams (Salary, Freelance, Investments, etc.).
* **Recurrence Support:** Set frequency (Once, Weekly, Monthly, Yearly) with badge indicators.
* **Currency Conversion:** Automatic consolidation into the default base currency.

### 3. 📉 Expense Tracker (تتبع المصاريف)
* **Expense Logging:** Track daily, recurring, or emergency expenses with account balance updates.
* **Categories & Types:** Categorize expenses (Food, Rent, Bills, Health, etc.) with custom category management.
* **Advanced Filtering:** Filter by custom time ranges, categories, and payment methods.

### 4. 🏦 Accounts & Wallets (الحسابات والمحافظ)
* **Multi-Account Support:** Manage bank accounts, digital wallets, and cash reserves.
* **Real-time Balance Adjustment:** Auto-deduction on expenses and auto-credit on income with audit history.
* **Account Archiving:** Archive inactive accounts while preserving transaction records.

### 5. 💵 Cash Tracker (تتبع الكاش)
* **Quick Add:** Log cash expenses in under 10 seconds.
* **ATM Withdrawals:** Log cash withdrawals from banks with dual-entry system adjustments.
* **Low Cash Alerts:** Immediate notifications when cash balance drops to zero.

### 6. 🤝 Debt Manager (إدارة الديون)
* **Debt Tracking:** Track outstanding debts, due dates, and progress bars.
* **Partial Payments:** Record partial repayments linked directly to account balances.
* **Smart Timeline Predictions:** Estimated repayment schedules calculated based on historical payment velocity.
* **Overdueالملف دا جاهز ومكتوب بأسلوب احترافي وشامل (Professional & Structured Document)، بحيث يغطي كل تفاصيل الوحدات (Modules) والمميزات، مع الحفاظ على الاختصار والوضوح.

يمكنك نسخ المحتوى التالي ومسح القديم في ملف `README.md` تماماً:

```markdown
# 💰 Personal Finance Tracker (نظام تتبع المالية الشخصية)

A comprehensive personal finance management web application built with **React**, **Express.js**, and **MongoDB**. The platform allows users to log income, track daily expenses, manage bank accounts and cash wallets, and keep track of debts with automated insights.

---

## 🌟 Core Features & Modules

### 🔐 1. Authentication Module
* **Secure Login/Register:** Email and password authentication with a "Remember Me" session option.
* **Security Rate Limiting:** Account temporarily blocked (5 minutes) after 5 consecutive failed login attempts.
* **Password Reset:** Self-service password reset via email using time-sensitive token links (valid for 24 hours).

### 💵 2. Income Tracker
* **Income Logging:** Record income sources with type, amount, currency, and date.
* **Recurrence Engine:** Support for single or recurring income (Weekly, Monthly, Yearly) with distinct badges and status control.
* **Multi-Currency Support:** Auto-converts values to the user's base currency for total aggregation.

### 💸 3. Expense Tracker
* **Categorized Expenses:** Track spending across categories (Food, Bills, Health, etc.) and payment types (Daily, Fixed, Emergency).
* **Custom Categories:** Ability to add, edit, or delete personal categories alongside default system ones.
* **Account Deduction:** Expenses automatically update and adjust connected bank or wallet balances.

### 💳 4. Accounts & Wallets Manager
* **Multi-Account Overview:** Manage Banks, E-Wallets, and Cash accounts in one place with total net worth calculation.
* **Transaction History & Ledger:** Comprehensive audit log for each account showing balance changes over time.
* **Archive Support:** Archive inactive accounts to maintain transaction history without cluttering payment menus.

### 🪙 5. Cash Tracker
* **Quick Cash Logging:** Rapid 3-step entry modal tailored for on-the-go cash spending (< 10 seconds).
* **Bank Cash Withdrawal:** Log cash withdrawals from bank accounts to automatically reduce bank balance and increase cash balance simultaneously.
* **Dashboard Mini-Widget:** Instant view of available physical cash with zero-balance alerts.

### 📜 6. Debt Manager
* **Debt Tracking:** Manage debts with creditors, due dates, total amounts, and partial payment history.
* **Automated Repayment Projection:** Smart algorithms calculate estimated completion dates based on payment velocity.
* **Overdue Alerts:** Visual badges and notifications 7 days prior to due dates, with red alerts for overdue items.

### 📊 7. Interactive Dashboard
* **Financial Summary:** Instant overview of monthly income, expenses, net balance, and overall wealth.
* **Visual Charts:** Interactive Donut/Pie charts showing expense breakdown by category and top 3 spending categories.
* **Month-over-Month Comparison:** Comparative analytics against previous months with directional trend arrows (% change).

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.x or higher)
* **MongoDB** deployment that supports transactions (MongoDB Atlas or a local replica set).

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SamaaAboDiab/Mali_Web_APP_Project.git
   cd Mali_Web_APP_Project
