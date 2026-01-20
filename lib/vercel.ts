import { put, list, del } from '@vercel/blob';

// 1GB Limit
const STORAGE_LIMIT = 1000 * 1000 * 1000;
// 90% Threshold (900MB)
const CLEANUP_THRESHOLD = STORAGE_LIMIT * 0.9;
// Target Safety Level (850MB) - clear down to this to avoid constant churning
const TARGET_SIZE = STORAGE_LIMIT * 0.85;

export async function uploadImageToBlob(base64Data: string, filename: string): Promise<string> {
    // Clean token: remove whitespace and surrounding quotes (common copy-paste error)
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim().replace(/^["']|["']$/g, '');

    if (!token) {
        console.error("Missing BLOB_READ_WRITE_TOKEN");
        throw new Error("Server configuration error: Missing Blob Token");
    }
    console.log("Using Blob Token starting with:", token.substring(0, 15) + "...");

    // 1. Convert base64
    const base64Image = base64Data.split(';base64,').pop();
    if (!base64Image) throw new Error("Invalid image data");

    const buffer = Buffer.from(base64Image, 'base64');

    try {
        // 2. Upload
        const blob = await put(filename, buffer, {
            access: 'public',
            token: token
        });

        // 3. Trigger Cleanup (Fire and forget, or await if strict)
        // We await it to ensure safety before confirming success, 
        // though strictly it adds latency.
        await checkAndCleanupStorage(token);

        return blob.url;
    } catch (error) {
        console.error("Vercel Blob Upload Error:", error);
        throw new Error(`Blob upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

async function checkAndCleanupStorage(token: string) {
    try {
        const { blobs } = await list({ token });

        // Calculate total size
        let totalSize = blobs.reduce((acc, b) => acc + b.size, 0);
        console.log(`Current Storage: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

        if (totalSize > CLEANUP_THRESHOLD) {
            console.log("Storage threshold exceeded. Starting cleanup...");

            // Sort by Date (Oldest first)
            const sorted = blobs.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());

            for (const blob of sorted) {
                if (totalSize <= TARGET_SIZE) {
                    console.log("Storage back within safe limits.");
                    break;
                }

                console.log(`Deleting old image: ${blob.pathname} (${(blob.size / 1024).toFixed(2)} KB)`);
                await del(blob.url, { token });
                totalSize -= blob.size;
            }
        }
    } catch (error) {
        console.error("Cleanup Error:", error);
    }
}
