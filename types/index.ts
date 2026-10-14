export type LeadRating = 'Low' | 'Medium' | 'High' | 'Won' | 'Lost';

export interface Visit {
    id: string;
    pharmacyName: string;
    customerContact?: string;
    timestamp: string;
    actions: string[];
    hasOrder: boolean;
    orderDetails?: string;
    photoUrls?: string[]; // Array of URLs or dataURLs
    notes: string;
    leadRating?: LeadRating;
    areaCode?: string;
    user?: string;
    bestDays?: string[];
    customerComments?: string;
    frequency?: '4w' | '6w' | '8w';
}

export const QUICK_ACTIONS = [
    "Stock Check",
    "Product Education",
    "Merchandising",
    "Email",
    "Complaint Handling",
    "Relationship Building",
    "Phone Call",
    "Cold Call",
];

export interface CustomerStats {
    pharmacyName: string;
    totalVisits: number;
    lastVisit: string;
    lastContact: string;
    lastUser?: string;
    topActions: string[];
    leadRating?: LeadRating;
    areaCode?: string;
    bestDays?: string[];
    customerComments?: string;
    frequency?: '4w' | '6w' | '8w';
}

