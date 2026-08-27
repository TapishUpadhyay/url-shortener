/*
 * SRL — Shorten URL
 * Pure client-side URL shortener (HTML/CSS/JS only, no backend server).
 * Made with love by tapish.
 *
 * HOW CROSS-DEVICE LINKS WORK
 * ----------------------------
 * There are two "storage" layers:
 *
 * 1. links.json  — a JSON file shipped WITH the website. Every visitor's
 *    browser downloads this exact same file, so any code listed inside it
 *    resolves identically on ANY device, anywhere. This is what makes a
 *    short link truly shareable.
 *
 * 2. localStorage — saved only inside the browser that created the link.
 *    Works instantly with zero setup, but ONLY on that one browser/device.
 *
 * When you shorten a URL, it's saved instantly to localStorage (so it
 * works on your device right away) AND you're shown a ready-to-copy JSON
 * snippet. Paste that snippet into links.json and redeploy the site to
 * make that link work for everyone, everywhere — because there is no
 * backend/server here, that manual "add + redeploy" step is the only way
 * for a link to become truly global with plain HTML/CSS/JS.
 *
 * URL SCHEME
 * ----------
 * Base app:   tapish.online/srl.html
 * Short link: tapish.online/srl.html?c=xyzw   (works with zero server config)
 * (Optional clean path tapish.online/srl/xyzw is possible too, but requires
 *  a hosting rewrite rule — see README.md.)
 */

const LOCAL_STORAGE_KEY = "srl_links";
const LINKS_JSON_PATH = "links.json";
const CODE_LENGTH = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Populated on load by fetching links.json (the shared, site-wide database)
let siteLinks = {};

/* ---------------- Storage helpers ---------------- */

function loadLocalLinks() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error("SRL: failed to read localStorage", e);
        return {};
    }
}

function saveLocalLinks(links) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(links));
}

async function loadSiteLinks() {
    try {
        const res = await fetch(LINKS_JSON_PATH, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Strip the informational _comment key, keep only real code->url pairs
        const { _comment, ...rest } = data;
        siteLinks = rest;
    } catch (e) {
        console.warn("SRL: couldn't load links.json (this is fine if you're testing locally without a server):", e);
        siteLinks = {};
    }
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

function generateCode(existingCodes) {
    let code;
    do {
        code = "";
        for (let i = 0; i < CODE_LENGTH; i++) {
            code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
        }
    } while (existingCodes.has(code));
    return code;
}

function buildShortUrl(code) {
    const origin = window.location.origin;
    // Query-string form always works with zero server configuration.
    return `${origin}/srl.html?c=${code}`;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

/** Reads a short-link code from either ?c=xyzw or a clean /srl/xyzw path. */
function extractCodeFromLocation() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("c") && params.get("c").trim()) {
        return params.get("c").trim();
    }

    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;

    const last = parts[parts.length - 1].toLowerCase();
    if (last === "srl" || last === "srl.html") return null;

    const secondLast = parts.length > 1 ? parts[parts.length - 2].toLowerCase() : null;
    if (secondLast === "srl" || secondLast === "srl.html") {
        return parts[parts.length - 1];
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
    showFlash._timer = setTimeout(() => { el.style.display = "none"; }, 4000);
}

/* ---------------- Main app view (shorten form) ---------------- */

function renderLinksTable() {
    const localLinks = loadLocalLinks();

    const rows = [];
    Object.entries(siteLinks).forEach(([code, url]) => {
        rows.push({ code, url, scope: "site" });
    });
    Object.entries(localLinks).forEach(([code, data]) => {
        if (!siteLinks[code]) {
            rows.push({ code, url: data.url, scope: "local", createdAt: data.createdAt || 0 });
        }
    });

    rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const tbody = document.getElementById("linksBody");
    const table = document.getElementById("linksTable");
    const emptyMsg = document.getElementById("emptyMessage");
    tbody.innerHTML = "";

    if (rows.length === 0) {
        table.style.display = "none";
        emptyMsg.style.display = "block";
        return;
    }
    table.style.display = "table";
    emptyMsg.style.display = "none";

    rows.slice(0, 25).forEach(({ code, url, scope }) => {
        const shortUrl = buildShortUrl(code);
        const badge = scope === "site"
            ? `<span class="badge badge-live" title="Works on any device">🌐 Live</span>`
            : `<span class="badge badge-local" title="Only works on this browser until added to links.json">💻 This device</span>`;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="short"><a href="${shortUrl}" target="_blank" rel="noopener">?c=${escapeHtml(code)}</a></td>
            <td class="original"><a href="${escapeHtml(url)}" target="_blank" rel="noopener" title="${escapeHtml(url)}">${escapeHtml(url)}</a></td>
            <td>${badge}</td>
            <td>${scope === "local" ? `<button class="delete-btn" data-code="${escapeHtml(code)}">Delete</button>` : ""}</td>
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

    const localLinks = loadLocalLinks();
    const allExistingCodes = new Set([...Object.keys(siteLinks), ...Object.keys(localLinks)]);

    let code =
        Object.keys(siteLinks).find(c => siteLinks[c] === longUrl) ||
        Object.keys(localLinks).find(c => localLinks[c].url === longUrl);

    let isNew = false;
    if (!code) {
        code = generateCode(allExistingCodes);
        localLinks[code] = { url: longUrl, createdAt: Date.now() };
        saveLocalLinks(localLinks);
        isNew = true;
    }

    const shortUrl = buildShortUrl(code);

    document.getElementById("resultOriginal").textContent = longUrl;
    const shortLinkEl = document.getElementById("resultShort");
    shortLinkEl.textContent = shortUrl;
    shortLinkEl.href = shortUrl;
    document.getElementById("resultBox").style.display = "block";

    const isLive = !!siteLinks[code];
    const jsonSnippetBox = document.getElementById("jsonSnippetBox");
    if (isLive) {
        jsonSnippetBox.style.display = "none";
    } else {
        const snippet = `"${code}": "${longUrl}"`;
        document.getElementById("jsonSnippet").textContent = snippet;
        jsonSnippetBox.style.display = "block";
    }

    showFlash(isNew ? "Short link created (works on this device now)." : "This URL was already shortened.", "success");
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

    document.getElementById("copySnippetBtn").addEventListener("click", () => {
        const text = document.getElementById("jsonSnippet").textContent;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById("copySnippetBtn");
            const original = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(() => (btn.textContent = original), 1500);
        });
    });

    document.getElementById("linksBody").addEventListener("click", (e) => {
        const btn = e.target.closest(".delete-btn");
        if (!btn) return;
        const code = btn.getAttribute("data-code");
        const links = loadLocalLinks();
        delete links[code];
        saveLocalLinks(links);
        renderLinksTable();
    });

    renderLinksTable();
}

/* ---------------- Redirect view ---------------- */

function initRedirectView(code) {
    document.getElementById("mainView").style.display = "none";
    document.getElementById("redirectView").style.display = "block";

    let targetUrl = siteLinks[code];

    if (!targetUrl) {
        const localLinks = loadLocalLinks();
        if (localLinks[code]) {
            targetUrl = localLinks[code].url;
        }
    }

    if (targetUrl) {
        document.getElementById("redirectSubMessage").textContent = targetUrl;
        setTimeout(() => {
            window.location.replace(targetUrl);
        }, 600);
    } else {
        document.getElementById("redirectSpinner").style.display = "none";
        document.getElementById("redirectMessage").textContent = "This short link wasn't found.";
        document.getElementById("redirectSubMessage").textContent =
            "It may not have been added to links.json yet, or it was created on a different device and never made global.";
        document.getElementById("backLink").style.display = "inline-block";
    }
}

/* ---------------- Entry point ---------------- */

(async function main() {
    await loadSiteLinks();

    const code = extractCodeFromLocation();
    if (code) {
        initRedirectView(code);
    } else {
        initMainView();
    }
})();
