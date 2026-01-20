'use server';
import { revalidatePath } from 'next/cache';

import { appendVisitToSheet, fetchVisitsFromSheet, uploadFileToDrive, getUsers, updateVisitAreaCode } from '@/lib/google';
import { Visit } from '@/types';

export async function authenticateUser(pin: string) {
    'use server';

    const users = await getUsers();
    const matchingUsers = users.filter(u => u.pin === pin);

    if (matchingUsers.length > 0) {
        // Aggregate area codes
        const areaCodes = Array.from(new Set(matchingUsers.map(u => u.areaCode))).join(", ");
        const name = matchingUsers[0].name;

        return { success: true, user: { name, areaCode: areaCodes } };
    }

    return { success: false, error: 'Invalid PIN' };
}

export async function submitVisitToCloud(visit: Visit) {
    try {
        const result = await appendVisitToSheet(visit);
        return { success: true, message: 'Saved to Google Sheet' };
    } catch (error) {
        // Check if error is due to missing credentials to handle gracefully
        const msg = error instanceof Error ? error.message : "Unknown error";
        if (msg.includes("Missing Google Credentials") || msg.includes("Missing Google Sheet ID")) {
            return { success: false, error: "Cloud not configured", code: "NO_CREDENTIALS" };
        }

        console.error("Cloud Save Error:", error);
        return { success: false, error: "Failed to save to cloud", code: "ERROR" };
    }
}

export async function getVisitsFromCloud() {
    try {
        const visits = await fetchVisitsFromSheet();
        return { success: true, data: visits };
    } catch (error) {
        return { success: false, data: [] };
    }
}

export async function uploadPhotoAction(base64Data: string, filename: string) {
    try {
        // Switch to Vercel Blob
        const { uploadImageToBlob } = await import('@/lib/vercel');
        const url = await uploadImageToBlob(base64Data, filename);

        return { success: true, url };
    } catch (error) {
        console.error("Upload Action Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Upload failed" };
    }
}

export async function updateAreaCodeAction(visitId: string, newAreaCode: string) {
    const result = await updateVisitAreaCode(visitId, newAreaCode);
    if (result.success) {
        revalidatePath('/customers');
        return { success: true };
    }
    return { success: false, error: result.error };
}

export async function getVisitByIdAction(visitId: string) {
    try {
        const { getVisitById } = await import('@/lib/google');
        const visit = await getVisitById(visitId);
        if (visit) {
            return { success: true, visit };
        }
        return { success: false, error: "Visit not found" };
    } catch (err) {
        console.error("Get Visit Error:", err);
        return { success: false, error: "Failed to fetch visit" };
    }
}

export async function updateVisitAction(visit: Visit) {
    try {
        const { updateVisitRow } = await import('@/lib/google');
        const result = await updateVisitRow(visit);
        if (result.success) {
            revalidatePath('/');
            revalidatePath('/customers');
            return { success: true };
        }
        return { success: false, error: result.error || "Update failed" };
    } catch (err) {
        console.error("Update Action Error:", err);
        return { success: false, error: "Update failed" };
    }
}

export async function deleteVisitAction(visitId: string) {
    try {
        const { deleteVisitRow } = await import('@/lib/google');
        const result = await deleteVisitRow(visitId);
        if (result.success) {
            revalidatePath('/');
            revalidatePath('/customers');
            revalidatePath('/history');
            return { success: true };
        }
        return { success: false, error: result.error || "Delete failed" };
    } catch (err) {
        console.error("Delete Action Error:", err);
        return { success: false, error: "Delete failed" };
    }
}

import { CustomerStats } from '@/types';

export async function getCustomerStatsAction(userAreaCode: string, filterUser?: string) {
    try {
        const visits = await fetchVisitsFromSheet();

        // 1. Filter by Access
        let accessibleVisits = visits;
        if (userAreaCode && userAreaCode !== "All") {
            const authorizedCodes = new Set(userAreaCode.split(',').map(c => c.trim()));
            accessibleVisits = visits.filter(v =>
                !v.areaCode || authorizedCodes.has(v.areaCode)
            );
        }

        // Extract available users from ACCESSIBLE visits (so admins see relevant users)
        const availableUsers = Array.from(new Set(accessibleVisits.map(v => v.user).filter(Boolean))) as string[];

        // 2. Group by Pharmacy
        const grouped: Record<string, Visit[]> = {};
        accessibleVisits.forEach(v => {
            const name = v.pharmacyName.trim();
            if (!grouped[name]) grouped[name] = [];
            grouped[name].push(v);
        });

        // 3. Calculate Stats
        const stats = Object.keys(grouped).map(name => {
            let pharmacyVisits = grouped[name].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            // Apply User Filter if present
            if (filterUser) {
                pharmacyVisits = pharmacyVisits.filter(v => v.user === filterUser);
            }

            if (pharmacyVisits.length === 0) return null;

            // Top Actions
            const actionCounts: Record<string, number> = {};
            pharmacyVisits.forEach(v => {
                v.actions.forEach(a => {
                    actionCounts[a] = (actionCounts[a] || 0) + 1;
                });
            });
            const topActions = Object.entries(actionCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([k]) => k);

            const lastVisit = pharmacyVisits[0];
            const ratedVisit = pharmacyVisits.find(v => v.leadRating);
            const visitWithArea = pharmacyVisits.find(v => v.areaCode);

            return {
                pharmacyName: name,
                totalVisits: pharmacyVisits.length,
                lastVisit: lastVisit.timestamp,
                lastContact: lastVisit.customerContact || "Unknown",
                lastUser: lastVisit.user,
                topActions,
                leadRating: ratedVisit?.leadRating,
                areaCode: visitWithArea?.areaCode,
            };
        }).filter(Boolean) as CustomerStats[];

        // 4. Sort by Last Visit (Default)
        stats.sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());

        return { success: true, data: stats, users: availableUsers.sort() };

    } catch (error) {
        console.error("Stats Aggregation Error:", error);
        return { success: false, error: "Failed to load stats" };
    }
}
