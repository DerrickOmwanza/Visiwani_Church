# Visiwani SDA Church Books

A paperless bookkeeping system for Visiwani SDA Church. It replaces the
treasurer's paper ledgers and Excel sheets with a simple website (run on
your own computer) where every transaction — from any department — is
recorded as it happens, and well-formatted Excel reports can be requested
for any period, any time.

## What it does

- **Record transactions as they happen.** Add an entry for any department
  (General Fund, Building, Choir, Youth, Pathfinder, Women's Ministry,
  etc.) the moment money comes in or goes out — no need to remember it
  later.
- **Manage departments/funds.** Add new departments any time, and set an
  opening balance so historical funds (e.g. the Building account) carry on
  from where the paper records left off.
- **Generate Excel reports on request**, styled like the church's existing
  books:
  - **Monthly Statement of Activity** — income/expenses broken down by
    week, for one department, with surplus/deficit and balance carried
    down — exactly like the current monthly sheets.
  - **Quarterly Departmental Summary** — every department's income,
    expense, net movement and closing balance for each quarter of a year.
  - **Annual Collection Summary** — one department's income and expense
    line items across all 12 months, with a total column.
  - **Custom Date Range Statement** — a bank-statement-style report for
    any "from" and "to" date, for one department or all of them combined.
  - **Department Ledger** — a running cash book (date, particulars, cash
    in, cash out, balance) for a single fund.
- **Quarterly reports generate themselves.** At the end of every quarter
  (31 Mar, 30 Jun, 30 Sep, 31 Dec) the system automatically creates that
  quarter's report and saves it under Reports → "Auto-Generated Quarterly
  Reports", ready to download. You can also generate any quarter manually,
  or request any custom period, at any time.
- **Login-protected.** Only someone with the treasurer's login can see or
  enter financial records.

## Requirements

- [Node.js](https://nodejs.org) (LTS version, 18 or newer). This is the
  only thing that needs installing — everything else is included.

No internet connection or database server is required: all records are
kept in a single file on your own computer (`data/db.json`).

## Getting started (Windows)

1. Install Node.js from https://nodejs.org if it isn't already installed
   (choose the "LTS" version, click through the installer with defaults).
2. Copy this whole folder to your computer, for example to:
   `C:\Users\ADMIN\Web&Standalone Applications\Visiwani_Church`
3. Double-click **`start.bat`** inside the folder.
   - The first time, it will take a minute to set itself up.
   - It will then open your browser to `http://localhost:3000` automatically.
4. Log in with the default account:
   - **Username:** `treasurer`
   - **Password:** `visiwani2026`
5. Go to **Settings** and change the password immediately.

Keep the black window that opens open while you're using the system —
closing it stops the system. To use it again later, just double-click
`start.bat` again.

## Getting started (Mac/Linux)

```bash
./start.sh
```

or manually:

```bash
npm install
npm start
```

Then open http://localhost:3000 in your browser.

## Everyday use

1. **Record Transaction** — pick the date, department, income/expense,
   category (a suggestion list appears, but you can type anything new),
   the amount, and an optional note. Click Save. That's it — no need to
   remember it for later.
2. **Departments** — add a new fund/department any time (e.g. a new
   ministry), or set/adjust an opening balance for an existing one.
3. **Reports** — choose the report type and period, click "Download
   Excel", and a fully formatted spreadsheet downloads immediately.
4. **Dashboard** — a quick at-a-glance view of this month's totals and
   every department's current balance.

## Backing up your records

All church financial data lives in one file: `data/db.json`. Back this
file up regularly (copy it to a USB drive, email it to yourself, or save
it to Google Drive/OneDrive) — it is the church's books. Generated Excel
reports are saved separately under `data/reports/generated/` and can be
regenerated at any time from the data in `db.json`.

## Project structure

```
server/            Backend (Express web server, API, report generation)
  routes/          API endpoints: auth, departments, transactions, reports
  reports/         Excel report builder (exceljs)
  db.js            Simple JSON file data store
  seed.js          Default departments & login created on first run
  cron.js          Automatic quarter-end report generation
public/            Frontend (plain HTML/CSS/JS, no build step required)
data/              Your church records live here (not committed to git)
start.bat          Windows one-click launcher
start.sh           Mac/Linux launcher
```

## Notes

- The default departments and their standard income/expense categories
  were seeded from the church's existing paper/Excel records (Tithes,
  Combined Offerings, Building, Choir, Youth, Pathfinder, Adventurer,
  Women's Ministry, Church Budget, Holy Communion, Evangelism, Children's
  Ministry, Sabbath School, etc.). You can rename, add, or deactivate
  departments at any time from the Departments page.
- Categories typed into a transaction that aren't in the suggestion list
  are still recorded and will appear under "Other" in reports — nothing is
  ever rejected, so the treasurer never has to stop and reclassify
  something before recording it.
