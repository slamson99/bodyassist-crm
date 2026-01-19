export interface Visit {
    id: string;
    pharmacyName: string;
    customerContact?: string;
    timestamp: string;
    actions: string[];
    hasOrder: boolean;
    orderDetails?: string;
    photoUrl?: string; // Stored as dataURL for localStorage
    notes: string;
    leadRating?: 'Low' | 'Medium' | 'High';
    areaCode?: string;
    user?: string;
}

export const QUICK_ACTIONS = [
    "Stock Check",
    "Product Education",
    "Merchandising",
    "Order Taken",
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
    leadRating?: 'Low' | 'Medium' | 'High';
    areaCode?: string;
}
