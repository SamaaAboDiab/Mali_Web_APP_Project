# Mali

**مالي — know where your money goes.**

Mali is a personal finance web app I built to answer a simple question: *where did my money go this month?* You log what comes in and what goes out, and Mali keeps your bank accounts, e-wallets, cash, debts and savings goals in one place, then shows you the picture with charts and reports.

It works in Arabic and English, and it comes with a full admin panel for running it as a subscription service.

---

## What you can do with it

**Track your money**
- Log income (one-off or recurring: weekly, monthly, yearly) and expenses by category. You get eight default categories and can add your own.
- Keep several accounts (bank, e-wallet, cash). Every income, expense and transfer updates the right balance, and each account has its own history.
- Cash gets its own quick-entry flow, including "I withdrew cash from the bank", which moves money from one balance to the other in one step.
- Archive accounts you don't use anymore without losing their history.

**Stay on top of debts and goals**
- Record debts with due dates and partial payments. Mali estimates when you'll finish paying based on how fast you've been paying.
- Set savings goals, add to them or withdraw from them, and see your progress.

**Understand your spending**
- A dashboard with this month's income, expenses and net balance, compared with last month.
- Reports on income vs. expenses, spending by category, cash flow, net worth, savings, debt progress and spending habits.
- Notifications for debts due within 3 days, negative balances, a subscription about to end, and new messages.

**Get help**
- Chat with support from inside the app (text and voice messages).

### The admin side

Admins sign in from the same login page and land on their own dashboard:

- User growth, plan distribution, revenue and the subscriptions that end this week.
- **Renewal reminders:** email one user or everyone whose subscription is about to end. Each user gets at most one reminder per 24 hours.
- Manage users: create accounts, extend or change plans, add free days, suspend or reactivate.
- Review renewal requests with the payment proof the user uploaded, then approve or reject them.
- Send announcements to groups of users (everyone, trial, paid, expiring…).
- Answer support chats, with saved quick replies.
- A revenue report, and an activity log of every admin action.

### Plans

New users start with a **14-day free trial**, limited to 20 income/expense entries. Paid plans are 3 months, 6 months or a year. When a subscription ends, users can still see their data but can't add or change anything until they renew.

---

## Built with

| | |
|---|---|
| Frontend | React 19, Vite, Redux Toolkit, React Router, Tailwind CSS, Recharts, i18next |
| Backend | Node.js, Express 5, Mongoose |
| Database | MongoDB Atlas |
| Email | Nodemailer over Gmail SMTP |
| Hosting | Vercel (frontend and backend as two projects) |

```
Mali_Web_APP_Project/
├── backend-accounting-system/   Express API
│   ├── src/                     routes, controllers, models, middleware
│   ├── scripts/createAdmin.js   creates an admin account
│   └── postman/                 ready-to-import Postman collections
├── frontend-accounting-system/  React app
└── structure/                   notes on pages, API and user flows (Arabic)
```

---

## Running it locally

You'll need **Node.js 18+** and a **MongoDB Atlas** cluster (the free tier is fine). Atlas matters: the app uses MongoDB transactions, which a plain local MongoDB doesn't support.

### 1. Get the code

```bash
git clone https://github.com/SamaaAboDiab/Mali_Web_APP_Project.git
cd Mali_Web_APP_Project
```

### 2. Set up the backend

```bash
cd backend-accounting-system
npm install
```

Create a file called `.env` in `backend-accounting-system/`:

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb+srv://<user>:<password>@<your-cluster>.mongodb.net/

JWT_SECRET=<a long random string>
JWT_ADMIN_SECRET=<a different long random string>
ADMIN_SEED_SECRET=<another random string, only used in development>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<your gmail address>
SMTP_PASS=<a Gmail App Password, not your normal password>
SMTP_FROM=<your gmail address>

CLIENT_URL=http://localhost:5174
```

To generate the random secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then start it:

```bash
npm run dev
```

You should see `MongoDB connected` and `Server running on port 5000`.

### 3. Set up the frontend

In a second terminal:

```bash
cd frontend-accounting-system
npm install
```

Create `frontend-accounting-system/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

Open [http://localhost:5174](http://localhost:5174) and register.

### 4. Create an admin

Admins can't sign up from the website. Create one from the backend folder:

```bash
node scripts/createAdmin.js admin@example.com Admin123 "Your Name"
```

Then sign in at `/login` with that email and password. You'll land on the admin dashboard.

> The password must be at least 8 characters and include an uppercase letter and a number. This applies to every account in the app.

---

## Deploying to Vercel

The frontend and backend are deployed as **two separate Vercel projects** from this same repository.

**Backend first**
1. On Vercel: *Add New → Project*, pick this repo, and set **Root Directory** to `backend-accounting-system`.
2. Add every variable from your backend `.env` except `PORT`. Set `NODE_ENV=production`.
3. Deploy, then open `https://<backend-url>/api/health`. It should return `{"status":"ok"}`.

**Then the frontend**
1. Create another project from the same repo with **Root Directory** `frontend-accounting-system`.
2. Add `VITE_API_URL=https://<backend-url>/api`.
3. Deploy.

**Connect them**
In the backend project, set `CLIENT_URL` to your frontend URL (no trailing slash) and redeploy. In production the API only accepts requests from that address, and the links in emails point there too.

In MongoDB Atlas, go to *Network Access* and allow `0.0.0.0/0`. Vercel connects from changing IP addresses.

After that, every `git push` to `main` redeploys both projects.

---

## Testing the API with Postman

`backend-accounting-system/postman/` has two collections: one for user endpoints and one for admin endpoints, plus a README that walks through them. Import both, set `baseUrl` to `http://localhost:5000`, log in, and the token is saved for the other requests automatically.

---

## When something goes wrong

These are the problems I ran into myself while building and setting up Mali:

| Error | Cause | Fix |
|---|---|---|
| `Could not connect to any servers in your MongoDB Atlas cluster` | Your IP isn't allowed in Atlas. | Atlas → *Network Access* → add your IP (or `0.0.0.0/0` while developing). Also check that `MONGODB_URI` points at the right cluster. |
| `bad auth : authentication failed` | Wrong database user or password in `MONGODB_URI`. | Atlas → *Database Access* → edit the user → set a new password and update `.env`. |
| `querySrv EREFUSED` | Your internet provider's DNS refuses the lookup MongoDB needs. | Already handled: the backend uses Google and Cloudflare DNS for this. Just restart the server. |
| `Username and Password not accepted` (emails) | Gmail rejects normal passwords from apps. | Turn on 2-Step Verification, create an [App Password](https://myaccount.google.com/apppasswords), and put it in `SMTP_PASS` without spaces. |
| Everything works locally but not on Vercel | `CLIENT_URL` on the backend doesn't match the frontend URL. | Set it exactly, without a trailing `/`, and redeploy. |

After you change `.env`, restart the backend: type `rs` in the nodemon terminal. Nodemon doesn't restart by itself for `.env` changes.

---

Made by **Samaa Abo Diab**.
