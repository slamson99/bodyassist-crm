const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { Readable } = require('stream');

// 1. Load Environment Variables from .env.local
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        // Allow for export WORD=... or just WORD=... or WORD = ...
        // Remove 'export ' if present
        line = line.trim();
        if (line.startsWith('export ')) line = line.substring(7).trim();

        // Skip comments
        if (line.startsWith('#') || !line) return;

        const match = line.match(/^([^=]+?)\s*=\s*(.*)$/);
        if (match) {
            let key = match[1].trim();
            let value = match[2].trim();

            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            }

            // Handle newlines in private key
            if (key === 'GOOGLE_PRIVATE_KEY') {
                value = value.replace(/\\n/g, '\n');
            }
            process.env[key] = value;
            console.log(`Loaded key: ${key}`);
        }
    });
    console.log("Environment loaded.");
} catch (e) {
    console.error("Failed to load .env.local:", e.message);
    process.exit(1);
}

// 2. Auth
const getAuth = () => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !key) {
        console.error("Missing credentials in .env.local");
        return null;
    }

    return new google.auth.JWT({
        email,
        key,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
};

// 3. Test Upload
async function testUpload() {
    const auth = getAuth();
    if (!auth) return;

    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    console.log(`Attempting upload to Folder ID: ${folderId}`);
    console.log(`Using Service Account: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);

    const fileMetadata = {
        name: 'test-upload.txt',
        parents: folderId ? [folderId] : undefined,
    };
    const media = {
        mimeType: 'text/plain',
        body: Readable.from(['Hello Bodyassist CRM!']),
    };

    try {
        const file = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
        });
        console.log('Upload Success!');
        console.log('File ID:', file.data.id);
        console.log('Link:', file.data.webViewLink);
    } catch (error) {
        console.error('Upload Failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.response && error.response.data) {
            console.error('Full Error:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testUpload();
