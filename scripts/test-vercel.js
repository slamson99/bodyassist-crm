const fs = require('fs');
const path = require('path');
const { put, list, del } = require('@vercel/blob');

// 1. Load Environment Variables from .env.local
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        // Simple parser
        line = line.trim();
        if (line.startsWith('#') || !line) return;
        const match = line.match(/^([^=]+?)\s*=\s*(.*)$/);
        if (match) {
            let key = match[1].trim();
            let value = match[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            process.env[key] = value;
        }
    });
} catch (e) {
    console.error("Failed to load .env.local:", e.message);
}

// 2. Test Upload
async function testVercel() {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
        console.error("Missing BLOB_READ_WRITE_TOKEN");
        return;
    }

    console.log("Token found (starts with):", token.substring(0, 10) + "...");

    try {
        console.log("Attempting upload...");
        const blob = await put('test-vercel.txt', 'Hello Vercel Blob!', {
            access: 'public',
            token: token
        });

        console.log("Upload Success!");
        console.log("URL:", blob.url);

        // Cleanup
        console.log("Cleaning up test file...");
        await del(blob.url, { token });
        console.log("Deleted.");

    } catch (error) {
        console.error("Vercel Test Failed:", error);
    }
}

testVercel();
