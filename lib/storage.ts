import { Visit } from "@/types";

const STORAGE_KEY = "bodyassist_visits";

export function getVisits(): Visit[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch {
        return [];
    }
}

export function saveVisit(visit: Visit): void {
    const visits = getVisits();
    const newVisits = [visit, ...visits];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newVisits));
}

export function getVisitById(id: string): Visit | undefined {
    const visits = getVisits();
    return visits.find((v) => v.id === id);
}
