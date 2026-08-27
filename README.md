SRL — Shorten URL
 
A simple, fast URL shortener that runs entirely in the browser — no backend server to build or host. Short links work across every device via a free Google Sheet used as a shared, live database.
 
Features
- Shorten any long URL into a short 6-character code.
- Cross-device sync — a link created on your phone works instantly on your laptop or anyone else's device, no redeploy needed.
- Live status indicator showing whether cloud sync is connected.

Tech Stack
- HTML 
-CSS 
-JS 
-GOOGLE SHEET
 
How It Works
1. Shortening a link: the app generates a random 6-character code and sends it (code + destination URL) to a Google Apps Script Web App URL via a POST request.
2. Storing: the Apps Script appends a new row to the connected Google Sheet's `Links` tab.
3. Redirecting: visiting `yoursite.com/index.html?c=xyzw` looks up code `xyzw` (checking the cloud first, then localStorage) and redirects to the matching URL.

ALTERNATIVE URL:-https://tapish.online/srl
 
