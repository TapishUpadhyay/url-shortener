/*
 * SRL — Shorten URL
 * Pure client-side URL shortener. No backend/server — all mappings are
 * stored in this browser's localStorage. Made with love by tapish.
 *
 * URL SCHEME
 * ----------
 * Base app:      tapish.online/srl            (shows the shorten form)
 * Short link:    tapish.online/srl/xyzw       (redirects using stored data)
 * No-config fallback (works even without a server rewrite rule):
 *                tapish.online/srl.html?c=xyzw
 *
 * IMPORTANT LIMITATION
 * ---------------------
 * Because there is no backend database, a short link only works in the
 * SAME BROWSER that created it. This is a client-only demo/tool, not a
 * globally shareable link service. See README.md for details and for how
 * to upgrade this to a real shared shortener later.
 */

const STORAGE_KEY = "srl_links";
const CODE_LENGTH = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/* ---------------- Storage helpers ---------------- */

function loadLinks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error("SRL: failed to read localStorage", e);
        return {};
    }
}

function saveLinks(links) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

/* ---------------- Utilities ---------------- */

function isValidUrl(value) {
    if (!value || !value.trim()) return false;
    try {
        const u = new URL(value.trim());
        return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
        return false;
    }
}

function generateCode(existingLinks) {
    let code;
    do {
        code = "";
        for (let i = 0; i < CODE_LENGTH; i++) {
            code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
        }
    } while (existingLinks[code]);
    return code;
}

function buildShortUrl(code) {
    // Clean path style: <origin>/srl/<code>
    // e.g. https://tapish.online/srl/aB3xY9
    const origin = window.location.origin;
    return `${origin}/srl/${code}`;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Figures out if the current page load is a "short link visit"
 * (e.g. /srl/xyzw) versus the base app page (/srl or /srl.html).
 * Also supports a query-string fallback (?c=xyzw) that works even
 * without any server rewrite rule configured.
 */
function extractCodeFromLocation() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("c") && params.get("c").trim()) {
        return params.get("c").trim();
    }

    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;

    const last = parts[parts.length - 1].toLowerCase();
    if (last === "srl" || last === "srl.html") return null; // base page itself

    const secondLast = parts.length > 1 ? parts[parts.length - 2].toLowerCase() : null;
    if (secondLast === "srl" || secondLast === "srl.html") {
        return parts[parts.length - 1]; // the actual code, original casing preserved
    }

    return null;
}

/* ---------------- Flash messages ---------------- */

function showFlash(message, type = "success") {
    const el = document.getElementById("flash");
    if (!el) return;
    el.textContent = message;
    el.className = `flash ${type}`;
    el.style.display = "block";
    clearTimeout(showFlash._timer);
    showFlash._timer = setTimeout(() => { el.style.display = "none"; }, 3000);
}

/* ---------------- Main app view (shorten form) ---------------- */

function renderLinksTable() {
    const links = loadLinks();
    const entries = Object.entries(links).sort((a, b) => b[1].createdAt - a[1].createdAt);

    const tbody = document.getElementById("linksBody");
    const table = document.getElementById("linksTable");
    const emptyMsg = document.getElementById("emptyMessage");
    tbody.innerHTML = "";

    if (entries.length === 0) {
        table.style.display = "none";
        emptyMsg.style.display = "block";
        return;
    }
    table.style.display = "table";
    emptyMsg.style.display = "none";

    entries.slice(0, 20).forEach(([code, data]) => {
        const shortUrl = buildShortUrl(code);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="short"><a href="${shortUrl}" target="_blank" rel="noopener">/srl/${escapeHtml(code)}</a></td>
            <td class="original"><a href="${escapeHtml(data.url)}" target="_blank" rel="noopener" title="${escapeHtml(data.url)}">${escapeHtml(data.url)}</a></td>
            <td><button class="delete-btn" data-code="${escapeHtml(code)}">Delete</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function handleShorten(longUrl) {
    longUrl = longUrl.trim();

    if (!longUrl) {
        showFlash("Please enter a URL.", "error");
        return;
    }
    if (!isValidUrl(longUrl)) {
        showFlash("That doesn't look like a valid URL. It should start with http:// or https://", "error");
        return;
    }

    const links = loadLinks();

    // Reuse existing code if this exact URL was already shortened
    let code = Object.keys(links).find(c => links[c].url === longUrl);
    if (!code) {
        code = generateCode(links);
        links[code] = { url: longUrl, createdAt: Date.now() };
        saveLinks(links);
    }

    const shortUrl = buildShortUrl(code);

    document.getElementById("resultOriginal").textContent = longUrl;
    const shortLinkEl = document.getElementById("resultShort");
    shortLinkEl.textContent = shortUrl;
    shortLinkEl.href = shortUrl;
    document.getElementById("resultBox").style.display = "block";

    showFlash("Short link created!", "success");
    renderLinksTable();
}

function initMainView() {
    document.getElementById("shortenForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("longUrlInput");
        handleShorten(input.value);
        input.value = "";
        input.focus();
    });

    document.getElementById("copyBtn").addEventListener("click", () => {
        const text = document.getElementById("resultShort").textContent;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById("copyBtn");
            const original = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(() => (btn.textContent = original), 1500);
        });
    });

    document.getElementById("linksBody").addEventListener("click", (e) => {
        const btn = e.target.closest(".delete-btn");
        if (!btn) return;
        const code = btn.getAttribute("data-code");
        const links = loadLinks();
        delete links[code];
        saveLinks(links);
        renderLinksTable();
    });

    renderLinksTable();
}

/* ---------------- Redirect view ---------------- */

function initRedirectView(code) {
    document.getElementById("mainView").style.display = "none";
    document.getElementById("redirectView").style.display = "block";

    const links = loadLinks();
    const entry = links[code];

    if (entry && entry.url) {
        document.getElementById("redirectSubMessage").textContent = entry.url;
        // Small delay so the user briefly sees where they're headed
        setTimeout(() => {
            window.location.replace(entry.url);
        }, 600);
    } else {
        document.getElementById("redirectSpinner").style.display = "none";
        document.getElementById("redirectMessage").textContent =
            "This short link wasn't found in this browser.";
        document.getElementById("redirectSubMessage").textContent =
            "It may have been created on a different browser or device, or it may have been deleted.";
        document.getElementById("backLink").style.display = "inline-block";
    }
}

/* ---------------- Entry point ---------------- */

(function main() {
    const code = extractCodeFromLocation();
    if (code) {
        initRedirectView(code);
    } else {
        initMainView();
    }
})();
