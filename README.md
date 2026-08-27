# SRL — Shorten URL

A tiny, brand-able URL shortener built with **plain HTML, CSS, and JavaScript only** — no backend, no build tools, no dependencies.

Made with ❤️ by tapish

---

## Live URL scheme

Once deployed on your domain (e.g. `tapish.online`), the app is designed to live at:

- **App / form:** `tapish.online/srl`
- **Short links look like:** `tapish.online/srl/xyzw` (6-character random code)
- **No-config fallback (always works, no server setup needed):** `tapish.online/srl.html?c=xyzw`

## ⚠️ Important — read this first

This is a **pure front-end** tool. There is no server and no shared database.

That means:
- Every short link is saved in the **`localStorage` of the browser that created it**.
- If **you** open `tapish.online/srl/xyzw` on the same browser/device where you created it → it redirects correctly. ✅
- If **someone else** (or you, on a different browser/device) opens that same link → it will say "not found," because that browser has no record of it. ❌

This is a fundamental limitation of an HTML/CSS/JS-only shortener — a real, globally shareable shortener needs a server + database to look up codes for any visitor. If you outgrow this limitation, see **"Upgrading to a real shared shortener"** below.

This tool is great for:
- A personal/local URL-shortening utility
- A portfolio/demo project
- Learning how URL shorteners work under the hood

It is **not** meant for sharing short links publicly with other people yet.

---

## Files

```
srl-url-shortener/
├── srl.html          # The entire app: shorten form + redirect handler, in one page
├── style.css          # Styling / branding
├── script.js          # All logic: validation, code generation, localStorage, redirect
├── vercel.json         # Rewrite rule so /srl/xyzw serves srl.html (for Vercel hosting)
├── _redirects           # Equivalent rewrite rule for Netlify hosting
└── README.md
```

## How it works

1. **Shortening a URL**
   - You paste a long URL into the form on `srl.html`.
   - JavaScript validates it (must be non-empty and start with `http://` or `https://`, checked via the browser's built-in `URL` parser).
   - A random 6-character alphanumeric code is generated and checked for uniqueness against what's already stored.
   - The mapping `{ code → { url, createdAt } }` is saved into `localStorage` under the key `srl_links`.
   - The short link is displayed as `https://tapish.online/srl/<code>`, with a **Copy** button.
   - Re-shortening the same URL reuses its existing code instead of creating a duplicate.
   - A "Recent Links" table lists your last 20 shortened links with delete buttons.

2. **Visiting a short link**
   - `srl.html` is loaded for *any* request under `/srl/...` (see hosting setup below).
   - On load, the script inspects the URL:
     - If the path looks like `/srl/<code>`, or there's a `?c=<code>` query parameter, it treats this as a **redirect visit**.
     - It looks up `<code>` in `localStorage`. If found, it briefly shows "Redirecting you to…" and then sends the browser to the original URL via `window.location.replace(...)`.
     - If not found (wrong browser, deleted, or made up), it shows a friendly "not found" message instead of crashing.
   - If the path is just `/srl` or `/srl.html` (no code), it shows the normal shorten form.

## Why you need one tiny config file for clean paths

Static file hosting normally only serves files that actually exist. `srl.html` is a real file, so `/srl.html` works out of the box on any host. But `/srl/xyzw` isn't a real file or folder — it's a "clean path" that needs to be told to load `srl.html` anyway, so the JavaScript inside can read the code from the URL and do the redirect.

That's what the extra config file does — it's **hosting configuration, not application code**:

- **Vercel** → `vercel.json` (included) — rewrites both `/srl` and `/srl/:code` to `/srl.html`.
- **Netlify** → `_redirects` (included) — does the same thing in Netlify's format.
- **GitHub Pages** (no rewrite support) → copy `srl.html` to `404.html` at your site root. GitHub Pages serves your custom 404 page for any unmatched path, and the script inside will still correctly read `/srl/xyzw` from the URL and redirect.
- **Any other static host** → look for a "rewrites," "redirects," or "custom 404" feature and point `/srl/*` at `srl.html`.

If you don't want to bother with hosting config at all, you can always fall back to sharing links in the query-string form, which needs zero setup:
```
tapish.online/srl.html?c=xyzw
```

## Deploying on `tapish.online/srl`

1. Upload `srl.html`, `style.css`, and `script.js` to your site (e.g. the root of your Vercel/Netlify project).
2. Add whichever config file matches your host (`vercel.json` or `_redirects` are already included — just make sure it sits at your project root).
3. Visit `tapish.online/srl` — you should see the SRL form.
4. Shorten a URL, then click the generated `tapish.online/srl/xyzw` link to confirm the redirect works.

## Customization

- **Code length:** change `CODE_LENGTH` in `script.js` (default is 6).
- **Colors/branding:** edit the colors in `style.css` (currently a purple gradient theme).
- **Footer credit:** edit the `<footer>` line in `srl.html`.

## Upgrading to a real shared shortener (optional, future work)

If you later want short links that work for *anyone*, not just your own browser, you'd need some place to store the code→URL mapping that every visitor's browser can read — for example:
- A small backend + database (like a Flask/SQLite version), or
- A serverless function backed by a hosted database (Vercel + Postgres/Turso/Supabase), or
- A free key-value API (e.g. a JSON storage service) called from this same front-end code.

That's a bigger project than "HTML/CSS/JS only," but the front-end you have here (validation, code generation, UI, redirect logic) would mostly carry over — you'd just swap the `localStorage` calls for `fetch()` calls to that storage.
