import { google } from 'googleapis';
import { Visit } from '@/types';
import { Readable } from 'stream';

// Constants
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
];

const USERS_SHEET_ID = '1OVwXyPMdjU0ivcltnEZrmB-Osnjoal9mBvQ9_aeYihI';

// Initialize Auth
export async function getSheetsClient() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Handle newline in env vars

    if (!email || !key) {
        return null;
    }

    const auth = new google.auth.JWT({
        email,
        key,
        scopes: SCOPES,
    });

    return google.sheets({ version: 'v4', auth });
};

export async function getUsers() {
    try {
        const sheets = await getSheetsClient();
        if (!sheets) return [];

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: USERS_SHEET_ID,
            range: 'Sheet1!A:C', // Expecting A:Area, B:User, C:Pin
        });

        const rows = response.data.values || [];
        // Skip header if exists
        const start = rows[0]?.[0] === 'Area Code' ? 1 : 0;

        return rows.slice(start).map(row => ({
            areaCode: row[0],
            name: row[1],
            pin: row[2] ? row[2].toString().trim() : "",
        })).filter(u => u.name && u.pin);
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
}

export async function appendVisitToSheet(visit: Visit) {
    const sheets = await getSheetsClient();
    if (!sheets) throw new Error("Missing Google Credentials");
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) throw new Error("Missing Google Sheet ID");

    // Flatten data for the sheet
    const row = [
        visit.id,
        visit.timestamp,
        visit.pharmacyName,
        visit.customerContact || "",
        visit.actions.join(", "),
        visit.hasOrder ? "Yes" : "No",
        visit.orderDetails || "",
        visit.photoUrl || "",
        visit.notes,
        visit.leadRating || "",
        visit.areaCode || "",
        visit.user || "",
        visit.bestDays ? visit.bestDays.join(", ") : ""
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:M',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [row],
        },
    });

    return true;
}

export async function uploadFileToDrive(base64Data: string, filename: string): Promise<string | null> {
    // Only verify creds exists here, we need raw auth for drive v3, not sheets client
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!email || !key) return null;

    const auth = new google.auth.JWT({
        email,
        key,
        scopes: SCOPES,
    });

    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Convert base64 to stream
    const base64Image = base64Data.split(';base64,').pop();
    if (!base64Image) return null;

    const buffer = Buffer.from(base64Image, 'base64');
    const stream = Readable.from(buffer);

    try {
        const fileMetadata = {
            name: filename,
            parents: folderId ? [folderId] : undefined,
        };
        const media = {
            mimeType: 'image/jpeg',
            body: stream,
        };

        const file = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        // Make it public or strictly accessible? Assuming private for now, user uses their own account.
        // Return webViewLink
        return file.data.webViewLink || null;
    } catch (error) {
        // Enhanced logging for troubleshooting
        console.error("Drive Upload Error Details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return null;
    }
}

// Helper to handle various date formats (including DD/MM/YYYY)
function safeParseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString();

    // 1. Try standard constructor
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();

    // 2. Try parsing DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
    // Split by non-digit characters
    const parts = dateStr.match(/(\d+)/g);
    if (parts && parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        let year = parseInt(parts[2], 10);

        // Handle 2-digit year (e.g. 25 -> 2025)
        if (year < 100) year += 2000;

        d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d.toISOString();
    }

    // 3. Fallback: Log warning and use current date to prevent crash
    console.warn(`Invalid date format encountered: "${dateStr}". Using current date.`);
    return new Date().toISOString();
}

export async function fetchVisitsFromSheet(): Promise<Visit[]> {
    const sheets = await getSheetsClient();
    if (!sheets) return []; // No credentials, return empty (app falls back to local storage)

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) return [];

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:M',
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        // Assume first row is header if ID is "ID"
        const startRow = rows[0][0] === "ID" ? 1 : 0;

        return rows.slice(startRow).map((row, index) => ({
            id: row[0] || `generated-${index + startRow}`, // Fallback ID for manually added rows
            pharmacyName: row[2],
            timestamp: safeParseDate(row[1]),
            customerContact: row[3] || undefined,
            actions: row[4] ? row[4].split(", ") : [],
            hasOrder: row[5] === "Yes",
            orderDetails: row[6],
            photoUrl: row[7],
            notes: row[8],
            leadRating: (row[9] as any) || undefined,
            areaCode: row[10] || undefined,
            user: row[11] || undefined,
            bestDays: row[12] ? row[12].split(", ") : [],
        })).filter(v => v.id !== "ID" && v.id !== "id");
    } catch (error) {
        console.error("Error fetching from sheets:", error);
        return [];
    }
}

export async function getVisitById(visitId: string): Promise<Visit | null> {
    const visits = await fetchVisitsFromSheet();
    return visits.find(v => v.id === visitId) || null;
}

export async function updateVisitRow(visit: Visit) {
    try {
        const sheets = await getSheetsClient();
        if (!sheets) throw new Error("Missing Google Credentials");
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        // 1. Find the row number for the ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:A',
        });

        const rows = response.data.values;
        if (!rows) throw new Error("No data found");

        const rowIndex = rows.findIndex(row => row[0] === visit.id);
        if (rowIndex === -1) throw new Error("Visit ID not found");

        const sheetRow = rowIndex + 1;
        const range = `Sheet1!A${sheetRow}:L${sheetRow}`; // Update entire row

        // Helper to flatten safely
        const rowData = [
            visit.id,
            visit.timestamp,
            visit.pharmacyName,
            visit.customerContact || "",
            visit.actions.join(", "),
            visit.hasOrder ? "Yes" : "No",
            visit.orderDetails || "",
            visit.photoUrl || "",
            visit.notes,
            visit.leadRating || "",
            visit.areaCode || "",
            visit.user || "",
            visit.bestDays ? visit.bestDays.join(", ") : ""
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Sheet1!A${sheetRow}:M${sheetRow}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [rowData],
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error updating visit row:", error);
        return { success: false, error: "Failed to update visit" };
    }
}

export async function deleteVisitRow(visitId: string) {
    try {
        const sheets = await getSheetsClient();
        if (!sheets) throw new Error("Missing Google Credentials");
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        // 1. Find Row
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:A',
        });

        const rows = response.data.values;
        if (!rows) throw new Error("No data found");

        const rowIndex = rows.findIndex(row => row[0] === visitId);
        if (rowIndex === -1) throw new Error("Visit ID not found");

        // 2. Delete the row
        // To delete a row properly (shifting up), we need batchUpdate
        // rowIndex is 0-indexed relative to response.
        // We need grid properties. Assuming Sheet1 is 0 id (usually).
        // But safer to just CLEAR the content if we don't want to mess with indices?
        // User asked to "Remove it from the data".
        // Deleting is better. We need the sheetId (integer), not spreadsheetId (string).

        // Fetch sheet metadata to get sheetId
        const meta = await sheets.spreadsheets.get({ spreadsheetId });

        // Use the first sheet found (most robust for single-sheet setup)
        const sheet = meta.data.sheets?.[0];

        if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
            throw new Error("No sheet found in spreadsheet");
        }
        const sheetId = sheet.properties!.sheetId!;

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex, // 0-based inclusive
                            endIndex: rowIndex + 1 // exclusive
                        }
                    }
                }]
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Error deleting visit row:", error);
        return { success: false, error: `Delete failed: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
}

export async function updateVisitAreaCode(visitId: string, newAreaCode: string) {
    try {
        const sheets = await getSheetsClient();
        if (!sheets) return { success: false, error: "No credentials" };

        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        // 1. Find the row number for the ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:A', // Only fetch IDs
        });

        const rows = response.data.values;
        if (!rows) return { success: false, error: 'No data found' };

        const rowIndex = rows.findIndex(row => row[0] === visitId);

        if (rowIndex === -1) {
            return { success: false, error: 'Visit ID not found' };
        }

        // Row index is 0-based, Sheets is 1-based.
        const sheetRow = rowIndex + 1;
        const range = `Sheet1!K${sheetRow}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[newAreaCode]]
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Error updating Area Code:", error);
        return { success: false, error: 'Failed to update sheet' };
    }
}
