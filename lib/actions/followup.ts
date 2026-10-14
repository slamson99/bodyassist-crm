'use server';

import nodemailer from 'nodemailer';

interface FollowUpData {
    pharmacyName: string;
    actionType: string;
    subject: string;
    timeframeDays: number;
    username: string;
}

/**
 * Maps a CRM username to their official bodyassist.com email address.
 */
function getEmailForUser(username: string): string {
    const cleanName = username.trim().toLowerCase();
    
    if (cleanName.includes("ben")) {
        return "ben@bodyassist.com";
    }
    if (cleanName.includes("susan")) {
        return "susan@bodyassist.com";
    }
    if (cleanName.includes("ray") || cleanName.includes("raymund")) {
        return "raymund@bodyassist.com";
    }
    if (cleanName.includes("admin") || cleanName.includes("tomer")) {
        return "tomer@bodyassist.com";
    }
    
    // Default fallback routing
    return "tomer@bodyassist.com";
}

/**
 * Generates an RFC-compliant .ics file string for a 30-minute calendar block on a future date.
 */
function generateICSString(
    pharmacyName: string,
    actionType: string,
    subject: string,
    timeframeDays: number,
    uid: string
): string {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + timeframeDays);

    const formatUTCStamp = (date: Date): string => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };

    // Calculate target date at 10:00 AM - 10:30 AM floating local calendar time
    const targetYear = targetDate.getFullYear();
    const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
    const targetDay = String(targetDate.getDate()).padStart(2, '0');

    const dtstamp = formatUTCStamp(now);
    const dtstart = `${targetYear}${targetMonth}${targetDay}T100000`;
    const dtend = `${targetYear}${targetMonth}${targetDay}T103000`;

    const escapeText = (str: string): string => {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    };

    const summary = escapeText(`${subject} - ${pharmacyName}`);
    const description = escapeText(`Follow-Up Reminder: ${actionType} for customer ${pharmacyName}. Created via BodyAssist CRM.`);

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//BodyAssist//CRM Calendar Invite//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        'SEQUENCE:0',
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
}

/**
 * Server Action to dispatch a follow-up calendar reminder email via smtp.titan.com:465
 */
export async function sendFollowUpAction(data: FollowUpData) {
    try {
        const password = process.env.TITAN_EMAIL_PASSWORD;
        if (!password) {
            console.error("SMTP Configuration Error: Missing TITAN_EMAIL_PASSWORD env variable.");
            return {
                success: false,
                error: "Server configuration issue: Missing email password."
            };
        }

        const repEmail = getEmailForUser(data.username);
        const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}@bodyassist.com`;
        
        const icsContent = generateICSString(
            data.pharmacyName,
            data.actionType,
            data.subject,
            data.timeframeDays,
            uid
        );

        // Nodemailer secure transport on port 465 (SSL)
        const transporter = nodemailer.createTransport({
            host: 'smtp.titan.email',
            port: 465,
            secure: true,
            auth: {
                user: 'support@bodyassist.com',
                pass: password.trim().replace(/^["']|["']$/g, ''), // Handle copy-paste quotes in environments
            },
        });

        const mailOptions = {
            from: `"BodyAssist Support" <support@bodyassist.com>`,
            to: repEmail,
            subject: `Action Required: ${data.subject} - ${data.pharmacyName}`,
            text: `Hi ${data.username},\n\nYou have set a follow-up calendar reminder for ${data.pharmacyName}.\n\nReminder Specifications:\n- Action Required: ${data.actionType}\n- Subject Detail: ${data.subject}\n- Target Date: ${data.timeframeDays} days from now (approx. ${new Date(Date.now() + data.timeframeDays * 24 * 60 * 60 * 1000).toDateString()} at 10:00 AM)\n\nDouble-click the attached follow-up.ics file to save this meeting to your native Google, Apple, or Outlook calendar.\n\nBest regards,\nBodyAssist CRM Team`,
            attachments: [
                {
                    filename: 'follow-up.ics',
                    content: icsContent,
                    contentType: 'text/calendar; charset=utf-8; method=REQUEST',
                },
            ],
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
        
    } catch (error) {
        console.error("Titan SMTP Delivery Exception:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown SMTP dispatch error."
        };
    }
}
