# JournalFlow

**From journal entry to balance sheet, automatically.**

JournalFlow is a lightweight accounting and budgeting web app built with plain HTML, CSS and JavaScript. Enter your journal entries once and the ledger, trial balance, trading and profit & loss account, and balance sheet build themselves in real time. It is designed for both chartered accountants and beginners who just want to track money or plan a budget.

No installation, no frameworks and no server needed. All data stays in your browser.

## Features

- **Dashboard** with summary cards, income vs expenses chart, expense donut chart and asset breakdown
- **Add Entry** with quick templates (e.g. "Pay rent", "Cash sale") and hints for each account type
- **Journal Book** with search and delete
- **Ledger Accounts** with running balances and a per-account filter
- **Trial Balance** with an automatic tally check
- **Trading & Profit & Loss Account** showing gross profit and net profit
- **Balance Sheet** with an automatic tally check
- **Budget Planner** to set monthly limits per expense and track actual spending
- **Export & Print**: CSV download, JSON backup and restore, and print or save any report as PDF
- **Quick Guide** with a glossary and plain-language help on every page
- Responsive layout (sidebar collapses on mobile), animations, and reduced-motion support

## Project structure

```
journalflow/
├── index.html   # Page structure (sidebar and all pages)
├── style.css    # Dark navy and gold theme, layout, animations, print styles
├── script.js    # Accounting engine, rendering, navigation, budgets, export
└── README.md
```

## Getting started

1. Download or clone this repository.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
3. Click **Add Entry**, then **Load sample data** to see a demo, or start entering your own transactions.

## Publish on GitHub Pages

1. Create a new repository on GitHub and upload `index.html`, `style.css`, `script.js` and `README.md` to the root.
2. Go to **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and the `/ (root)` folder, then save.
4. After a minute your site will be live at `https://<your-username>.github.io/<repository-name>/`.

## How it works

Every transaction is stored as a journal entry (date, debit account, credit account, amount, narration). The app posts each entry to the ledger of both accounts, then calculates every report from that single list, so all pages update together.

Each account has a type that decides where it appears:

| Type | Appears in |
| --- | --- |
| Asset | Balance Sheet (assets) |
| Liability, Capital | Balance Sheet (liabilities and capital) |
| Sales, Direct expenses | Trading Account |
| Indirect expenses, Other income | Profit & Loss Account |
| Drawings | Reduces capital in the Balance Sheet |

To add your own accounts, edit the `ACCOUNTS` list at the top of `script.js`.

## Data and privacy

Entries and budgets are saved in your browser's `localStorage`. Nothing is uploaded anywhere. Use **Export & Print > Download backup** to save your data as a file and restore it on another device.

## Limitations

- Opening and closing stock adjustments are not calculated; record them through Purchases if needed.
- Data is stored per browser and per device.
- Intended for learning, small businesses and personal budgeting, not as a replacement for statutory audited accounts.

## License

Free to use and modify for personal and educational projects.
