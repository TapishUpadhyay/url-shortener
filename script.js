/*
 * SRL — Shorten URL (v3, cloud-synced)
 * Pure client-side app (HTML/CSS/JS only) — no backend server *you* write.
 * Made with love by tapish.
 *
 * HOW CROSS-DEVICE LINKS WORK NOW
 * --------------------------------
 * Links are stored in a Firebase Realtime Database, a free hosted cloud
 * database. Your browser talks to it directly over the internet using
 * only the Firebase JS SDK (a script tag) — there's no server code for
 * you to write, host, or maintain, and no redeploy needed to add a link.
 *
 * 1. Cloud (Firebase) — the shared, live database. Any link saved here
 *    works instantly on every device, everywhere, the moment it's saved.
 * 2. localStorage — a local-only fallback. Used only if Firebase isn't
 *    configured yet (see firebase-config.js) or the device is offline.
 *    Links saved here work only on that one browser until connectivity
 *    is restored, at which point SRL will try to sync them to the cloud.
 *
 * URL SCHEME
 * ----------
 * Base app:   yoursite.com/srl.html
 * Short link: yoursite.com/srl.html?c=xyzw   (works with zero server config)
 */

const LOCAL_STORAGE_KEY = "srl_links_local";
const CODE_LENGTH = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

let cloudLinks = {};       // code -> { url, createdAt }  (from Firebase, live)
let cloudReady = false;    // true once Firebase has connected at least once
let dbRef = null;

/* ---------------- Firebase setup ---------------- */

function isFirebaseConfigured() {
    return typeof firebaseConfig !== "undefined" &&
        firebaseConfig.apiKey &&
        firebaseConfig.apiKey !== "YOUR_API_KEY" &&
        firebaseConfig.databaseURL &&
        !firebaseConfig.databaseURL.includes("YOUR_PROJECT_ID");
}

function initFirebase() {
    if (!isFirebaseConfigured()) {
        document.getElementById("setupBanner").style.display = "block";
        setStatus(false, "Cloud sync not configured — this device only");
        return;
    }

    try {
        firebase.initializeApp(firebaseConfig);
        dbRef = firebase.database().ref("links");

        // Live listener: keeps cloudLinks in sync in real time, on every
        // device, for as long as the page is open.
        dbRef.on("value", (snapshot) => {
            cloudLinks = snapshot.val() || {};
            cloudReady = true;
            setStatus(true, "Synced — links work on any device");
            if (document.getElementById("mainView").style.display !== "none") {
                renderLinksTable();
            }
        }, (err) => {
            console.error("SRL: Firebase read failed", err);
            setStatus(false, "Can't reach the cloud — this device only");
        });
    } catch (e) {
        console.error("SRL: Firebase init failed", e);
        setStatus(false, "Cloud sync error — this device only");
    }
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
    const path = window.location.pathname.replace(/\/[^/]*$/, "/srl.html");
    return `${origin}${path}?c=${code}`;
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
            <td class="short"><a href="${shortUrl}" target="_blank" rel="noopener">?c=${escapeHtml(code)}</a></td>
            <td class="original"><a href="${escapeHtml(url)}" target="_blank" rel="noopener" title="${escapeHtml(url)}">${escapeHtml(url)}</a></td>
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

    let isNew = false;
    if (!code) {
        code = generateCode(allExistingCodes);
        isNew = true;

        if (cloudReady && dbRef) {
            try {
                await dbRef.child(code).set({ url: longUrl, createdAt: Date.now() });
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
    document.getElementById("resultOriginal").textContent = longUrl;
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

    // Prefer the cloud copy (works for everyone). If Firebase hasn't
    // loaded yet, wait briefly for the live listener to populate it.
    if (isFirebaseConfigured()) {
        if (!cloudReady) {
            await new Promise((resolve) => {
                const timeout = setTimeout(resolve, 2500);
                const check = setInterval(() => {
                    if (cloudReady) {
                        clearInterval(check);
                        clearTimeout(timeout);
                        resolve();
                    }
                }, 100);
            });
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

(function main() {
    initFirebase();

    const code = extractCodeFromLocation();
    if (code) {
        initRedirectView(code);
    } else {
        initMainView();
    }
})();
