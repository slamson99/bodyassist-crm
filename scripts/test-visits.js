const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// Using the ID from env or the one we know is in use
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

async function testFetchVisits() {
    try {
        console.log("Checking credentials...");
        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!email || !key) {
            console.error("Missing credentials in .env.local");
            return;
        }

        const auth = new google.auth.JWT({
            email,
            key,
            scopes: SCOPES,
        });

        const sheets = google.sheets({ version: 'v4', auth });

        console.log("Fetching visits from sheet ID:", SPREADSHEET_ID);
        // Reading range A:L as per expected schema (L is User)
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:L',
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log("No data found in sheet.");
            return;
        }

        console.log(`Found ${rows.length} rows (including header).`);

        // Print Header
        console.log("Header:", rows[0]);

        // Print first 5 data rows
        // Search for specific pharmacies
        const targets = ["Demo Pharmacy", "A1 Discount Chemist", "A1 discount chemist"];
        console.log("\nSearching for targets (Column C):", targets);

        rows.forEach((row, index) => {
            if (row[2] && targets.some(t => row[2].toLowerCase().includes("demo") || row[2].toLowerCase().includes("a1 discount"))) {
                console.log(`Found match at Row ${index + 1}:`);
                console.log(`  - ID (A): ${row[0]}`);
                console.log(`  - Pharmacy (C): ${row[2]}`);
                console.log(`  - Area Code (K): ${row[10]}`);
            }
        });

    } catch (error) {
        console.error("Error fetching visits:", error.message);
        if (error.response) {
            console.error("API Error details:", error.response.data);
        }
    }
}

testFetchVisits();
