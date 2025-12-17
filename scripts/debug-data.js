const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function debugSheetData() {
    console.log("Analyzing Google Sheet Data...");
    console.log("Sheet ID:", process.env.GOOGLE_SHEET_ID);

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
            range: 'Sheet1!A:L',
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log("No data found in sheet.");
            return;
        }

        console.log(`Total Rows Fetched: ${rows.length}`);

        let missingIdCount = 0;
        let missingNameCount = 0;
        let validCount = 0;
        const missingIdRows = [];

        // Assume row 0 is header
        const startRow = rows[0][0] === "ID" ? 1 : 0;
        console.log(`Header check: Row 0 Col 0 is '${rows[0][0]}'. Starting analysis from row ${startRow}.`);

        for (let i = startRow; i < rows.length; i++) {
            const row = rows[i];
            const id = row[0];
            const name = row[2];

            if (!id || id === "ID" || id === "id") {
                missingIdCount++;
                if (missingIdRows.length < 5) {
                    missingIdRows.push({ rowNumber: i + 1, content: row });
                }
            } else {
                validCount++;
                if (!name || name.trim() === "") {
                    missingNameCount++;
                }
            }
        }

        console.log("--- Analysis Results ---");
        console.log(`Valid Items (processed by app): ${validCount}`);
        console.log(`Skipped Rows (User-visible data loss?): ${missingIdCount}`);
        console.log(`Valid Items with Empty Pharmacy Name: ${missingNameCount}`);

        if (missingIdCount > 0) {
            console.log("\nWARNING: Rows are being skipped because they lack a valid ID in Column A.");
            console.log("First 5 skipped rows:", JSON.stringify(missingIdRows, null, 2));
        }

        if (missingNameCount > 0) {
            console.log("\nWARNING: Some valid rows have no Pharmacy Name, so they may be grouped under an empty string.");
        }

    } catch (error) {
        console.error("Error fetching sheet:", error);
    }
}

debugSheetData();
