# SRL v3 — Cloud Setup Guide

This version fixes the "redeploy every time" problem. Links now save to a
free cloud database (Firebase Realtime Database) instead of a static
`links.json` file, so a link created on your phone works instantly on
your laptop, a friend's phone, anywhere — no redeploying, no editing
files by hand.

You still don't write or host any server code. Firebase's free plan is
generous enough that a personal URL shortener will likely never come
close to its limits.

Total setup time: **~5 minutes, one time only.**

---

## Step 1 — Create a free Firebase project

1. Go to https://console.firebase.google.com and sign in with any Google account.
2. Click **Add project**.
3. Give it any name (e.g. `srl-shortener`). Disable Google Analytics for this project (not needed) — untick the box if asked.
4. Click **Create project** and wait ~30 seconds.

## Step 2 — Create a Realtime Database

1. In the left sidebar of your new project, click **Build → Realtime Database**.
2. Click **Create Database**.
3. Choose any region (closest to you is fine).
4. When asked about security rules, choose **Start in test mode** for now — we'll lock it down properly in Step 4.

## Step 3 — Register a Web App and get your config

1. In the left sidebar, click the **gear icon → Project settings**.
2. Scroll to **Your apps** and click the **</> (Web)** icon to add a web app.
3. Give it any nickname (e.g. `srl-web`) and click **Register app**. You don't need Firebase Hosting.
4. You'll see a code block with a `firebaseConfig` object that looks like this:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "srl-shortener-xxxxx.firebaseapp.com",
     databaseURL: "https://srl-shortener-xxxxx-default-rtdb.firebaseio.com",
     projectId: "srl-shortener-xxxxx",
     storageBucket: "srl-shortener-xxxxx.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef123456"
   };
   ```

5. Copy that whole object and paste it into **`firebase-config.js`** in this
   project, replacing the placeholder values. Save the file.

   > This is safe to publish/commit publicly. These values just tell your
   > app *which* Firebase project to talk to — they are not secret keys.
   > Actual access control happens in Step 4.

## Step 4 — Set your database rules

By default "test mode" allows anyone to read/write for 30 days, then it
locks everything. Set permanent rules instead:

1. In **Realtime Database**, click the **Rules** tab.
2. Replace the contents with this and click **Publish**:

   ```json
   {
     "rules": {
       "links": {
         ".read": true,
         ".write": true,
         "$code": {
           ".validate": "newData.hasChildren(['url', 'createdAt']) && newData.child('url').isString() && newData.child('url').val().matches(/^https?:\\/\\/.+/)"
         }
       }
     }
   }
   ```

   This allows anyone to create a short link (which is how a public
   shortener is supposed to work — same as bit.ly), while requiring every
   entry to actually look like a valid `http(s)://` URL, which blocks
   junk/malformed writes.

   **Want it locked to just you?** Add Firebase Authentication and change
   `.write` to `"auth != null"`. Ask me if you'd like this — it's a
   slightly bigger change to the code.

## Step 5 — Upload and open

1. Upload `srl.html`, `style.css`, `script.js`, and `firebase-config.js` to your site (same folder — same as before, `links.json` is no longer needed and can be deleted).
2. Open `yoursite.com/srl.html`.
3. The small dot near the top should turn **green** with "Synced — links work on any device". If it's red, double check `firebase-config.js` and the database rules.
4. Shorten a URL, then open the short link on a *different* device — it should redirect immediately. No redeploy, ever again.

---

## What changed from v2

| | v2 | v3 |
|---|---|---|
| Shared storage | `links.json` (static file) | Firebase Realtime Database (live) |
| Making a link global | Manually edit `links.json` + redeploy | Automatic, instant |
| Per-device fallback | `localStorage` | `localStorage` (only used if offline / not configured) |
| Files needed | `srl.html`, `style.css`, `script.js`, `links.json` | `srl.html`, `style.css`, `script.js`, `firebase-config.js` |

## Free tier limits (Firebase Spark plan)

- 1 GB stored, 10 GB/month downloaded, 100 simultaneous connections.
- A URL shortener stores maybe ~100 bytes per link — this is enough for
  hundreds of thousands of links for a personal/small project, free,
  indefinitely.

## Troubleshooting

- **Status dot stays grey/red:** check the browser console (F12) for the
  exact error — usually a typo in `firebase-config.js` or rules not published yet.
- **"Permission denied" on save:** your database rules weren't published, or don't allow writes to `links`.
- **Links work on your device but not others:** that link was saved while cloud sync was down — check the status dot was green when you created it.
