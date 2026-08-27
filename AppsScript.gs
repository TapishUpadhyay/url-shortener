/*
 * SRL — Apps Script backend (paste into your Google Sheet's Apps Script editor)
 * ------------------------------------------------------------------------------
 * This turns a plain Google Sheet into a tiny free API that SRL's front end
 * reads from and writes to. Google hosts and runs this for you — you don't
 * need a server.
 *
 * Expects a sheet tab named exactly "Links" with a header row:
 *   code | url | createdAt
 *
 * See SETUP.md for how to install and deploy this.
 */

const SHEET_NAME = "Links";

function getSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet tab "${SHEET_NAME}" not found. Create it with header row: code, url, createdAt`);
  }
  return sheet;
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* GET — returns all links as { code: { url, createdAt }, ... } */
function doGet(e) {
  try {
    const sheet = getSheet_();
    const data = sheet.getDataRange().getValues();
    const links = {};
    for (let i = 1; i < data.length; i++) { // skip header row
      const [code, url, createdAt] = data[i];
      if (code) links[code] = { url: url, createdAt: createdAt || 0 };
    }
    return jsonOut_(links);
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}

/* POST — body: { code, url, createdAt } — appends a new row if the code is free */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const code = String(body.code || "").trim();
    const url = String(body.url || "").trim();
    const createdAt = body.createdAt || Date.now();

    if (!code || !url) {
      return jsonOut_({ error: "Missing code or url" });
    }
    if (!/^https?:\/\/.+/i.test(url)) {
      return jsonOut_({ error: "url must start with http:// or https://" });
    }

    const sheet = getSheet_();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === code) {
        return jsonOut_({ error: "Code already exists" });
      }
    }

    sheet.appendRow([code, url, createdAt]);
    return jsonOut_({ success: true, code: code });
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}
