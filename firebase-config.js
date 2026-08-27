/*
 * SRL — Firebase configuration
 * ------------------------------------------------------------
 * Paste the config object Firebase gives you (from Project settings
 * → General → Your apps → SDK setup and configuration) below,
 * replacing the placeholder values.
 *
 * This is safe to make public/commit to a repo — Firebase web config
 * values are not secret keys, they just identify which project to
 * talk to. Access is controlled separately by your Database Rules
 * (see SETUP.md).
 *
 * Full setup instructions: SETUP.md
 */

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
