const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const USERS_SHEET_ID = '1OVwXyPMdjU0ivcltnEZrmB-Osnjoal9mBvQ9_aeYihI';

async function testFetchUsers() {
    try {
        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!email || !key) {
            console.error("Missing credentials");
            return;
        }

        const auth = new google.auth.JWT({
            email,
            key,
            scopes: SCOPES,
        });

        const sheets = google.sheets({ version: 'v4', auth });

        console.log("Fetching users from sheet:", USERS_SHEET_ID);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: USERS_SHEET_ID,
            range: 'Sheet1!A:C',
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log("No data found.");
            return;
        }

        console.log("Found users (First 5):");
        rows.slice(0, 5).forEach((row, index) => {
            console.log(`${index}: Area=${row[0]}, Name=${row[1]}, Pin=${row[2]}`);
        });

    } catch (error) {
        console.error("Error:", error.message);
    }
}

testFetchUsers();
