# SRL — Shorten URL

A brand-able URL shortener built with **plain HTML, CSS, and JavaScript only** — no backend, no build tools, no server framework.

Made with ❤️ by tapish

---

## Files

```
srl-url-shortener/
├── index.html        # The whole app: shorten form + redirect handler, in one page
├── style.css        # Styling / branding
├── script.js        # All logic: validation, code generation, storage, redirect
├── links.json         # Shared, site-wide link database (see below)
└── README.md
```

There is **no `vercel.json`** in this version on purpose — it caused a conflict with an existing `vercel.json` on the target domain last time. If you deploy this to a project that has no existing `vercel.json`, everything still works using the `?c=xyzw` link format described below, with zero configuration needed.

---

## ⚠️ How cross-device links actually work — please read this

A plain HTML/CSS/JS site has no server and no database, so there is no fully automatic way for a link created on your phone to instantly work on someone else's laptop. That's not a bug in this app — it's just what "no backend" means. This project gets as close as possible to cross-device support using two layers:

### 1. `links.json` — the shared, site-wide database
This is a real file that ships with your website. **Every visitor's browser downloads this exact same file**, so any code listed inside it works identically on any device, anywhere, instantly. This is what makes a link *truly* shareable.

The catch: since there's no backend to write to this file automatically, **adding a new entry requires you to manually edit `links.json` and redeploy the site.** There's no way around this without adding a real server — it's the fundamental tradeoff of "HTML/CSS/JS only."

### 2. `localStorage` — your personal, this-device-only cache
When you shorten a URL in the app, it's saved instantly to your browser's `localStorage` so the link works on your device right away, with zero extra steps. But it is **not visible to any other browser or device** — not even yours, on a different phone/laptop.

### The workflow this creates
1. You paste a long URL and click **Shorten**.
2. It's saved to `localStorage` immediately — the short link (`?c=xyzw`) works on your current device right now. The table shows it tagged **💻 This device**.
3. Below the result, you'll see a ready-to-copy line like:
   ```
   "xyzw": "https://your-long-url.com"
   ```
4. Paste that line inside `links.json` (before the closing `}`), save, and redeploy your site.
5. Once redeployed, that link is tagged **🌐 Live** and will work for anyone, on any device — because it's now part of the file every visitor downloads.

If you skip step 4, the link only ever works on the browser that created it.

---

## URL format

- **App:** `tapish.online/srl.html`
- **Short link:** `tapish.online/srl.html?c=xyzw`

The `?c=` query-string format is used because it works on **any** static host with **zero configuration** — no rewrite rules, no `vercel.json`, nothing that could conflict with an existing site config. If you'd like the prettier path style `tapish.online/srl/xyzw` instead, you can add a rewrite rule later (ask and I can provide one scoped so it won't clash with your existing config), but it's optional — everything works today without it.

## Editing `links.json`

The file looks like this:

```json
{
  "_comment": "This file is SRL's shared, site-wide link database...",

  "demo01": "https://www.anthropic.com"
}
```

- `_comment` is just a human note and is ignored by the app — leave it or remove it, doesn't matter.
- Every other key is a short code, and its value is the destination URL.
- Keys must be unique. Keep the file valid JSON (commas between entries, no trailing comma after the last one).

Example with two live links:
```json
{
  "_comment": "SRL shared link database",
  "demo01": "https://www.anthropic.com",
  "abC123": "https://example.com/some/long/path?x=1"
}
```

## How the app decides where to redirect

When someone opens a short link, `script.js`:
1. Fetches `links.json` and checks if the code exists there first (this is what makes a link work on any device).
2. If not found there, it checks this browser's own `localStorage` (device-only fallback).
3. If found in either place, it redirects to the stored URL after a brief "Redirecting…" message.
4. If found in neither, it shows a friendly "not found" message instead of breaking.

## Deploying

1. Upload `srl.html`, `style.css`, `script.js`, and `links.json` to your site (same folder).
2. Visit `tapish.online/srl.html` — you should see the SRL form.
3. Shorten a URL and confirm the `?c=xyzw` link redirects correctly on your device.
4. To make a link global: copy its JSON snippet into `links.json`, redeploy, and confirm the badge changes to **🌐 Live**.

## Customization

- **Code length:** change `CODE_LENGTH` in `script.js` (default is 6).
- **Colors/branding:** edit the colors in `style.css` (purple gradient theme by default).
- **Footer credit:** edit the `<footer>` line in `srl.html`.

## If you want *fully* automatic cross-device links later

That requires a small backend (even a lightweight one) that can write to a shared database whenever anyone submits a URL — for example, a serverless function backed by a hosted database, or a small server like the earlier Flask/SQLite version. That's outside the "HTML/CSS/JS only" scope of this build, but the front-end here (the form, validation, code generation, and redirect logic) would carry over largely unchanged — you'd just replace the manual "edit `links.json` and redeploy" step with an automatic API call.
