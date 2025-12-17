const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function debugDates() {
    console.log("Analyzing Dates in Google Sheet...");

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!email || !key) {
        console.error("Missing credentials");
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
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A:B', // Only need ID and Timestamp
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return;

        let invalidCount = 0;
        const invalidRows = [];

        // Skip header
        const startRow = rows[0][0] === "ID" ? 1 : 0;

        for (let i = startRow; i < rows.length; i++) {
            const row = rows[i];
            const timestampRaw = row[1];

            // Try to parse
            const date = new Date(timestampRaw);

            if (!timestampRaw || isNaN(date.getTime())) {
                invalidCount++;
                if (invalidRows.length < 10) {
                    invalidRows.push({ rowNumber: i + 1, timestamp: timestampRaw });
                }
            }
        }

        console.log(`Total Rows: ${rows.length}`);
        console.log(`Invalid Dates Found: ${invalidCount}`);

        if (invalidCount > 0) {
            console.log("First 10 Invalid Rows:", JSON.stringify(invalidRows, null, 2));
        } else {
            console.log("All dates look valid to V8.");
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

debugDates();
