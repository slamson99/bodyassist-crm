const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function probeSheet() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!email || !key || !sheetId) {
        console.error("Missing env vars");
        return;
    }

    const auth = new google.auth.JWT({
        email,
        key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Sheet1!A1:Z5', // Fetch header + 4 rows
        });

        const rows = response.data.values;
        if (!rows) {
            console.log("No data found.");
            return;
        }

        console.log("Headers (Row 1):");
        rows[0].forEach((col, idx) => {
            console.log(`Column ${String.fromCharCode(65 + idx)}: ${col}`);
        });

        console.log("\nSample Data (Row 2):");
        rows[1].forEach((col, idx) => {
            console.log(`Column ${String.fromCharCode(65 + idx)}: ${col}`);
        });

    } catch (error) {
        console.error("Error:", error);
    }
}

probeSheet();
