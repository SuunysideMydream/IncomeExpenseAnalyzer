# Moneywise — Personal Income & Expense

A static personal-finance dashboard built from the accompanying Excel tracker. It includes a daily transaction ledger, credit-card wallet and calendar, editable installment plans, and color-coded categories.

## Run locally

Open `index.html` with a local static server. For example:

```powershell
python -m http.server 8765
```

Then visit `http://localhost:8765`.

## Publish with GitHub Pages

1. Push this repository to GitHub.
2. In the GitHub repository, open **Settings → Pages**.
3. Select **Deploy from a branch**, then choose `main` and `/ (root)`.
4. Save. GitHub will provide the public site URL after deployment.

## Data

`data.json` is the published, browser-readable snapshot of the workbook data. Changes made through the UI are saved only in the browser’s local storage for now; they do not change the source Excel workbook.
