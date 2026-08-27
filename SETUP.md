# SRL v3 — Cloud Setup Guide (Google Sheets)

This version fixes the "redeploy every time" problem using a Google Sheet
as the shared database, instead of the static `links.json` file. A link
created on your phone will work instantly on your laptop, a friend's
phone, anywhere — no redeploying, no editing files by hand. You can even
open the sheet and see every link as a normal spreadsheet.

You still don't write or host any server. Google runs the small script
for you, for free.

Total setup time: **~5 minutes, one time only.**

---

## Step 1 — Create the Google Sheet

1. Go to https://sheets.google.com and create a **Blank spreadsheet**. Name it anything, e.g. "SRL Links".
2. Rename the first tab (bottom-left, double-click it) to exactly: `Links`
3. In row 1, add these three headers, one per cell: `code`, `url`, `createdAt`

## Step 2 — Add the Apps Script

1. In the Sheet, go to **Extensions → Apps Script**. A new tab opens with a code editor.
2. Delete anything in the default `Code.gs` file.
3. Open **`AppsScript.gs`** from this project, copy its entire contents, and paste it into the editor.
4. Click the **save icon** (or Ctrl/Cmd+S). Give the project any name when prompted.

## Step 3 — Deploy it as a Web App

1. Click **Deploy → New deployment** (top right).
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**.
5. Google will ask you to authorize the script — click **Authorize access**, choose your account, and click **Advanced → Go to [project name] (unsafe)** → **Allow**. (This warning is normal for scripts you write yourself — it's just Google being cautious about any script that can edit a sheet.)
6. Copy the **Web app URL** shown — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

## Step 4 — Paste the URL into the app

1. Open **`cloud-config.js`** in this project.
2. Replace the placeholder URL with the one you copied. Save.

## Step 5 — Upload and open

1. Upload `index.html`, `style.css`, `script.js`, and `cloud-config.js` to your site (same folder). `AppsScript.gs` and `links.json` are not needed on the server — only the four files above.
2. Open `yoursite.com/` (or `yoursite.com/index.html`).
3. The status dot near the top should turn **green** with "Synced — links work on any device". If it's red, see Troubleshooting below.
4. Shorten a URL, then open the short link on a *different* device — it should redirect. No redeploy, ever again.

---

## What changed from v2

| | v2 | v3 |
|---|---|---|
| Shared storage | `links.json` (static file) | Google Sheet, via Apps Script (live) |
| Making a link global | Manually edit `links.json` + redeploy | Automatic |
| Per-device fallback | `localStorage` | `localStorage` (only used if offline / not configured) |
| Files needed on your site | `index.html`, `style.css`, `script.js`, `links.json` | `index.html`, `style.css`, `script.js`, `cloud-config.js` |
| Seeing all links | Open `links.json` | Open the Google Sheet |

## How it works, briefly

- **Reading** links: the page fetches the Apps Script URL (a GET request), which reads every row of the `Links` tab and returns it as JSON.
- **Writing** a link: the page sends a POST request with the new code/URL; the script appends a row to the sheet.
- Other devices pick up new links automatically — the page re-checks the sheet every 15 seconds while open, and always checks fresh right before redirecting a short link.
- There's a small (usually under 1 second) delay on each request since Google spins up the script on demand — this is normal for Apps Script and not something to worry about for personal use.

## Limits (free, no billing account needed)

Apps Script's free quota allows roughly 20,000 requests per day — far more
than a personal or small-team shortener will ever use.

## Troubleshooting

- **Status dot stays red:** open the browser console (F12) and check the error. Common causes:
  - The URL in `cloud-config.js` still has `YOUR_DEPLOYMENT_ID` in it.
  - "Who has access" wasn't set to **Anyone** when deploying.
  - The sheet tab isn't named exactly `Links`, or is missing the header row.
- **You edited `AppsScript.gs` later:** you must click **Deploy → Manage deployments → edit (pencil) → New version → Deploy** for changes to take effect — saving alone isn't enough.
- **"Code already exists" errors:** extremely rare (6-character random codes), just try shortening again.
