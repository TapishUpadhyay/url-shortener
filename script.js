/*
 * SRL — Shorten URL (v3, Google Sheets–synced)
 * Pure client-side app (HTML/CSS/JS only) — no backend server *you* write.
 * Made with love by tapish.
 *
 * HOW CROSS-DEVICE LINKS WORK NOW
 * --------------------------------
 * Links are stored as rows in a Google Sheet. A small Google Apps Script
 * (pasted once into that sheet — see SETUP.md) exposes it as a URL this
 * page can read from and write to. Google hosts and runs that script for
 * free — there's no server for you to build or maintain, and no redeploy
 * needed to add a link. You can even open the sheet and see every link
 * as a normal spreadsheet.
 *
 * 1. Cloud (Google Sheet, via Apps Script) — the shared, live database.
 *    Any link saved here works instantly on every device, everywhere.
 * 2. localStorage — a local-only fallback. Used only if cloud sync isn't
 *    configured yet (see cloud-config.js) or the device is offline.
 *    Links saved here work only on that one browser until connectivity
 *    is restored.
 *
 * URL SCHEME
 * ----------
 * Base app:   yoursite.com/index.html  (or just yoursite.com/)
 * Short link: yoursite.com/index.html?c=xyzw   (works with zero server config)
 */

const LOCAL_STORAGE_KEY = "srl_links_local";
const CODE_LENGTH = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const POLL_INTERVAL_MS = 15000; // refresh cloud links periodically so other devices' new links show up

let cloudLinks = {};       // code -> { url, createdAt }  (from the Sheet)
let cloudReady = false;    // true once the first successful cloud read completes
let cloudAvailable = false; // true if cloud-config.js has a real URL in it

/* ---------------- Cloud (Google Sheets via Apps Script) ---------------- */

function isCloudConfigured() {
    return typeof CLOUD_API_URL !== "undefined" &&
        CLOUD_API_URL &&
        !CLOUD_API_URL.includes("YOUR_DEPLOYMENT_ID");
}

async function fetchCloudLinks() {
    const res = await fetch(CLOUD_API_URL, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.error) throw new Error(data.error);
    return data || {};
}

async function pushCloudLink(code, url) {
    // Sent as text/plain (not application/json) on purpose: this keeps it a
    // "simple request" so the browser skips a CORS preflight, which Apps
    // Script web apps don't handle. The script still parses it as JSON.
    const res = await fetch(CLOUD_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ code, url, createdAt: Date.now() }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.error) throw new Error(data.error);
    return data;
}

async function refreshCloudLinks(silent) {
    if (!cloudAvailable) return;
    try {
        cloudLinks = await fetchCloudLinks();
        cloudReady = true;
        setStatus(true, "Synced — links work on any device");
        if (document.getElementById("mainView").style.display !== "none") {
            renderLinksTable();
        }
    } catch (e) {
        console.error("SRL: cloud read failed", e);
        if (!silent) setStatus(false, "Can't reach the cloud — this device only");
    }
}

function initCloud() {
    cloudAvailable = isCloudConfigured();
    if (!cloudAvailable) {
        document.getElementById("setupBanner").style.display = "block";
        setStatus(false, "Cloud sync not configured — this device only");
        return Promise.resolve();
    }
    setStatus(false, "Connecting…");
    const first = refreshCloudLinks(false);
    setInterval(() => refreshCloudLinks(true), POLL_INTERVAL_MS);
    return first;
}

function setStatus(online, text) {
    const dot = document.getElementById("statusDot");
    const label = document.getElementById("statusText");
    if (!dot || !label) return;
    dot.className = "status-dot " + (online ? "online" : "offline");
    label.textContent = text;
}

/* ---------------- Local fallback storage ---------------- */

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
    const dir = window.location.pathname.replace(/[^/]*$/, "");
    return `${origin}${dir}?c=${code}`;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function extractCodeFromLocation() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("c") && params.get("c").trim()) {
        return params.get("c").trim();
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
    Object.entries(cloudLinks).forEach(([code, data]) => {
        rows.push({ code, url: data.url, createdAt: data.createdAt || 0, scope: "cloud" });
    });
    Object.entries(localLinks).forEach(([code, data]) => {
        if (!cloudLinks[code]) {
            rows.push({ code, url: data.url, createdAt: data.createdAt || 0, scope: "local" });
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
        const badge = scope === "cloud"
            ? `<span class="badge badge-live" title="Works on any device, instantly">🌐 Live</span>`
            : `<span class="badge badge-local" title="Only works on this browser — cloud sync unavailable when this was saved">💻 This device</span>`;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="short"><a href="${shortUrl}" target="_blank" rel="noopener" title="${escapeHtml(url)}">?c=${escapeHtml(code)}</a></td>
            <td>${badge}</td>
            <td>${scope === "local" ? `<button class="delete-btn" data-code="${escapeHtml(code)}">Delete</button>` : ""}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleShorten(longUrl) {
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
    const allExistingCodes = new Set([...Object.keys(cloudLinks), ...Object.keys(localLinks)]);

    // Reuse an existing code if this exact URL was already shortened.
    let code =
        Object.keys(cloudLinks).find(c => cloudLinks[c].url === longUrl) ||
        Object.keys(localLinks).find(c => localLinks[c].url === longUrl);

    if (!code) {
        code = generateCode(allExistingCodes);

        if (cloudAvailable) {
            try {
                await pushCloudLink(code, longUrl);
                cloudLinks[code] = { url: longUrl, createdAt: Date.now() }; // optimistic update
                showFlash("Short link created — live on any device now.", "success");
            } catch (e) {
                console.error("SRL: cloud save failed, falling back to local", e);
                localLinks[code] = { url: longUrl, createdAt: Date.now() };
                saveLocalLinks(localLinks);
                showFlash("Couldn't reach the cloud — saved to this device only.", "error");
            }
        } else {
            localLinks[code] = { url: longUrl, createdAt: Date.now() };
            saveLocalLinks(localLinks);
            showFlash("Cloud sync not set up — saved to this device only.", "error");
        }
    } else {
        showFlash("This URL was already shortened.", "success");
    }

    const shortUrl = buildShortUrl(code);
    const shortLinkEl = document.getElementById("resultShort");
    shortLinkEl.textContent = shortUrl;
    shortLinkEl.href = shortUrl;
    document.getElementById("resultBox").style.display = "block";

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
        const links = loadLocalLinks();
        delete links[code];
        saveLocalLinks(links);
        renderLinksTable();
    });

    renderLinksTable();
}

/* ---------------- Redirect view ---------------- */

async function initRedirectView(code) {
    document.getElementById("mainView").style.display = "none";
    document.getElementById("redirectView").style.display = "block";

    let targetUrl = null;

    if (cloudAvailable) {
        if (!cloudReady) {
            await refreshCloudLinks(true);
        }
        if (cloudLinks[code]) {
            targetUrl = cloudLinks[code].url;
        }
    }

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
            "It may have been created on a different device while cloud sync wasn't available yet.";
        document.getElementById("backLink").style.display = "inline-block";
    }
}

/* ---------------- Entry point ---------------- */

(async function main() {
    const code = extractCodeFromLocation();
    await initCloud();

    if (code) {
        initRedirectView(code);
    } else {
        initMainView();
    }
})();
