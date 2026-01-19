const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function probeSheet() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    // User specified this ID for the map data
    const MAP_SHEET_ID = "163lterD3YNMgVIflBRbiO3JtRSEBiSVMESkA22dbkCw";

    if (!email || !key) {
        console.error("Missing env vars (EMAIL or KEY)");
        return;
    }

    const auth = new google.auth.JWT({
        email,
        key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        console.log(`Probing Sheet ID: ${MAP_SHEET_ID}`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: MAP_SHEET_ID,
            range: 'Sheet1!A1:Z5', // Fetch header + 4 rows
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log("No data found.");
            return;
        }

        console.log("Headers (Row 1):");
        rows[0].forEach((col, idx) => {
            console.log(`Column ${String.fromCharCode(65 + idx)}: ${col}`);
        });

        if (rows.length > 1) {
            console.log("\nSample Data (Row 2):");
            rows[1].forEach((col, idx) => {
                console.log(`Column ${String.fromCharCode(65 + idx)}: ${col}`);
            });
        }

    } catch (error) {
        console.error("Error probing sheet:", error.message);
    }
}

probeSheet();
