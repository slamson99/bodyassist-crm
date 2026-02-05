"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickActionGrid } from "@/components/QuickActionGrid";
import { PhotoUpload } from "@/components/PhotoUpload";
import { QUICK_ACTIONS, Visit, CustomerStats } from "@/types";
import { saveVisit, getVisits } from "@/lib/storage";
import { ChevronLeft, Save, ShoppingCart, User, MapPin, Trash2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/app/contexts/UserContext";
import { getCustomerStatsAction, getVisitByIdAction, updateVisitAction, deleteVisitAction } from "@/app/actions";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function NewVisitContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');

    const [loading, setLoading] = useState(false);
    const { user } = useUser();

    // Data for Edit Mode
    const [isEditMode, setIsEditMode] = useState(false);
    const [originalVisit, setOriginalVisit] = useState<Visit | null>(null);

    const [formData, setFormData] = useState<Partial<Visit>>({
        pharmacyName: "",
        customerContact: "",
        timestamp: "",
        actions: [],
        hasOrder: false,
        orderDetails: "",
        notes: "",
        photoUrl: undefined,
        leadRating: undefined,
        areaCode: "",
        bestDays: [],
    });

    // Initialize date (New Visit Only)
    useEffect(() => {
        if (!editId) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setFormData(prev => ({
                ...prev,
                timestamp: now.toISOString().slice(0, 16)
            }));
        }
    }, [editId]);

    // Load Visit Data if Editing
    useEffect(() => {
        const loadVisit = async () => {
            if (editId) {
                setIsEditMode(true);
                setLoading(true);
                const result = await getVisitByIdAction(editId);
                if (result.success && result.visit) {
                    const v = result.visit;
                    setOriginalVisit(v);

                    // Convert ISO timestamp back to local input format
                    let localTs = "";
                    if (v.timestamp) {
                        const d = new Date(v.timestamp);
                        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                        localTs = d.toISOString().slice(0, 16);
                    }

                    setFormData({
                        ...v,
                        timestamp: localTs,
                    });
                } else {
                    alert("Visit not found or could not be loaded.");
                    router.push("/");
                }
                setLoading(false);
            }
        };
        loadVisit();
    }, [editId, router]);

    const [serverStats, setServerStats] = useState<CustomerStats[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Load available pharmacies
    useEffect(() => {
        const loadGlobalStats = async () => {
            const result = await getCustomerStatsAction(user?.areaCode || "");
            if (result.success && result.data) {
                setServerStats(result.data);
                const names = result.data.map(s => s.pharmacyName).sort();
                setSuggestions(names);
            }
        };
        loadGlobalStats();
    }, [user?.areaCode]);

    // Pre-fill area code (New Visit Only)
    useEffect(() => {
        if (!isEditMode && user?.areaCode && user.areaCode !== "All") {
            setFormData(prev => ({ ...prev, areaCode: user.areaCode }));
        }
    }, [user, isEditMode]);

    const handlePharmacyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, pharmacyName: value }));
        setShowSuggestions(value.length > 0);
    };

    const selectSuggestion = (name: string) => {
        const stat = serverStats.find(s => s.pharmacyName === name);
        setFormData(prev => ({
            ...prev,
            pharmacyName: name,
            areaCode: stat?.areaCode || prev.areaCode,
            customerContact: stat?.lastContact || prev.customerContact,
            bestDays: stat?.bestDays || [],
        }));
        setShowSuggestions(false);
    };

    // Calculate restrictions
    const isNewCustomer = formData.pharmacyName && !serverStats.some(s => s.pharmacyName.toLowerCase() === (formData.pharmacyName || "").toLowerCase());
    const userAreaOptions = user?.areaCode && user.areaCode !== "All"
        ? user.areaCode.split(',').map(s => s.trim()).filter(Boolean)
        : [];
    const showRestrictedDropdown = isNewCustomer && userAreaOptions.length > 0 && !isEditMode; // Edit mode can have any area

    const handlePharmacyBlur = () => {
        if (!formData.pharmacyName || isEditMode) return; // Don't auto-fill on edit

        const visits = getVisits();
        const sortedVisits = visits
            .filter(v => v.pharmacyName.toLowerCase().trim() === formData.pharmacyName?.toLowerCase().trim())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (sortedVisits.length > 0 && sortedVisits[0].customerContact) {
            if (!formData.customerContact) {
                setFormData(prev => ({ ...prev, customerContact: sortedVisits[0].customerContact }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.pharmacyName) return;

        setLoading(true);

        // Convert local back to UTC ISO
        const utcTimestamp = formData.timestamp
            ? new Date(formData.timestamp).toISOString()
            : new Date().toISOString();

        const visitData: Visit = {
            id: isEditMode && originalVisit ? originalVisit.id : crypto.randomUUID(),
            pharmacyName: formData.pharmacyName!.trim(),
            customerContact: formData.customerContact,
            timestamp: utcTimestamp,
            actions: formData.actions || [],
            hasOrder: formData.hasOrder || false,
            orderDetails: formData.orderDetails || "",
            notes: formData.notes || "",
            photoUrl: formData.photoUrl,
            leadRating: formData.leadRating,
            areaCode: formData.areaCode,
            user: isEditMode && originalVisit ? originalVisit.user : user?.name,
            bestDays: formData.bestDays || [],
        };

        try {
            const { submitVisitToCloud, updateVisitAction, uploadPhotoAction } = await import('@/app/actions');

            // Handle Photo Upload
            if (visitData.photoUrl && visitData.photoUrl.startsWith('data:')) {
                const filename = `visit-${visitData.id}-${Date.now()}.jpg`;
                const uploadResult = await uploadPhotoAction(visitData.photoUrl, filename);
                if (uploadResult.success && uploadResult.url) {
                    visitData.photoUrl = uploadResult.url;
                } else {
                    setLoading(false);
                    alert(`Photo upload failed: ${uploadResult.error || "Unknown error"}`);
                    return; // Stop submission so user can fix
                }
            }

            if (isEditMode) {
                const result = await updateVisitAction(visitData);
                if (!result.success) throw new Error(result.error);
                // Also update local storage if we want?
                // For simplicity, we assume Cloud is Truth.
            } else {
                saveVisit(visitData); // Local
                const result = await submitVisitToCloud(visitData); // Cloud
                if (!result.success && result.code !== 'NO_CREDENTIALS') {
                    alert(`Saved locally, but Cloud upload failed: ${result.error}`);
                }
            }

            // Redirect back
            if (isEditMode) {
                router.back();
            } else {
                router.push("/");
            }
        } catch (err) {
            console.error(err);
            alert(`Error processing visit: ${err instanceof Error ? err.message : "Unknown error"}`);
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editId) return;
        setLoading(true);
        try {
            const result = await deleteVisitAction(editId);
            if (result.success) {
                // Delete from local storage immediately to prevent "ghost" reappearance
                const { deleteVisit } = await import('@/lib/storage');
                deleteVisit(editId);

                // Force router refresh to clear server component cache
                router.refresh();
                router.back();
            } else {
                alert(`Delete failed: ${result.error}`);
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            alert("Delete failed");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="-ml-2" onClick={() => router.back()}>
                    <ChevronLeft />
                </Button>
                <h1 className="text-xl font-bold text-slate-900">{isEditMode ? "Edit Visit" : "New Pharmacy Visit"}</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Pharmacy Details */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <label className="text-sm font-medium text-slate-700 block mb-1">Pharmacy Name</label>
                            <Input
                                required
                                placeholder="e.g. Chemist Warehouse Melbourne"
                                value={formData.pharmacyName}
                                onChange={handlePharmacyChange}
                                onBlur={() => setTimeout(() => { setShowSuggestions(false); handlePharmacyBlur(); }, 200)}
                                autoComplete="off"
                            />
                            {showSuggestions && (
                                <div className="absolute z-10 w-full bg-white mt-1 rounded-md shadow-lg border border-slate-200 max-h-60 overflow-y-auto">
                                    {suggestions
                                        .filter(s => s.toLowerCase().includes(formData.pharmacyName!.toLowerCase()) && s !== formData.pharmacyName)
                                        .map((suggestion) => (
                                            <div key={suggestion} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm" onMouseDown={(e) => { e.preventDefault(); selectSuggestion(suggestion); }}>
                                                {suggestion}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Contact Person</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Who did you speak with?"
                                    value={formData.customerContact || ""}
                                    onChange={(e) => setFormData({ ...formData, customerContact: e.target.value })}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Area Code & Best Days</label>
                            <div className="flex gap-4 items-center">
                                <div className="relative w-24 shrink-0">
                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 z-10" />
                                    {showRestrictedDropdown ? (
                                        <select
                                            className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm pl-9"
                                            value={formData.areaCode || ""}
                                            onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })}
                                            required
                                        >
                                            <option value="" disabled>Select Area</option>
                                            {userAreaOptions.map(code => <option key={code} value={code}>{code}</option>)}
                                        </select>
                                    ) : (
                                        <Input
                                            placeholder="Area"
                                            value={formData.areaCode || ""}
                                            onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })}
                                            className="pl-9"
                                        />
                                    )}
                                </div>
                                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                                    {["Mon", "Tue", "Wed", "Thu", "Fri"].map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => {
                                                const current = formData.bestDays || [];
                                                const updated = current.includes(day)
                                                    ? current.filter(d => d !== day)
                                                    : [...current, day];
                                                setFormData({ ...formData, bestDays: updated });
                                            }}
                                            className={`h-10 w-10 shrink-0 rounded-full text-xs font-bold transition-all ${(formData.bestDays || []).includes(day)
                                                ? "bg-blue-600 text-white shadow-md"
                                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Activities Performed</CardTitle></CardHeader>
                    <CardContent>
                        <QuickActionGrid
                            options={QUICK_ACTIONS}
                            selectedActions={formData.actions || []}
                            onChange={(actions) => setFormData({ ...formData, actions })}
                        />
                    </CardContent>
                </Card>

                {/* Lead Rating */}
                {formData.actions?.includes("Cold Call") && (
                    <Card className="border-none shadow-sm animate-in slide-in-from-top-4 fade-in duration-300">
                        <CardHeader className="pb-3"><CardTitle className="text-lg">Lead Potential</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-3">
                                {["Low", "Medium", "High"].map((rating) => (
                                    <button
                                        key={rating}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, leadRating: rating as any })}
                                        className={`py-3 px-4 rounded-xl font-medium text-sm transition-all ${formData.leadRating === rating ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}
                                    >
                                        {rating}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Order Section */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <div className="p-6 flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                        onClick={() => setFormData(prev => ({ ...prev, hasOrder: !prev.hasOrder }))}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${formData.hasOrder ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}><ShoppingCart size={20} /></div>
                            <div><h3 className="font-semibold text-slate-900">Order Taken?</h3></div>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.hasOrder ? 'bg-primary' : 'bg-slate-300'}`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${formData.hasOrder ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>
                    {formData.hasOrder && (
                        <CardContent className="pt-0 pb-6 animate-in slide-in-from-top-2 fade-in duration-200">
                            <Textarea placeholder="Enter order details..." className="mt-4" value={formData.orderDetails || ""} onChange={(e) => setFormData({ ...formData, orderDetails: e.target.value })} />
                        </CardContent>
                    )}
                </Card>

                {/* Photo Upload */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Photo Evidence</CardTitle></CardHeader>
                    <CardContent>
                        <PhotoUpload currentPhoto={formData.photoUrl || null} onPhotoSelect={(url) => setFormData({ ...formData, photoUrl: url || undefined })} />
                    </CardContent>
                </Card>

                {/* Notes */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3"><CardTitle className="text-lg">Additional Notes</CardTitle></CardHeader>
                    <CardContent>
                        <Textarea placeholder="Any feedback..." value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                    </CardContent>
                </Card>

                <div className="flex gap-4">
                    {/* Delete Button (Only in Edit Mode) */}
                    {isEditMode && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" size="lg" className="flex-1" disabled={loading}>
                                    <Trash2 className="mr-2 h-5 w-5" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[90%] rounded-xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete this visit record from the database.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Delete Visit</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}

                    <Button type="submit" size="lg" className={`flex-1 text-lg shadow-lg ${isEditMode ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : ''}`} disabled={loading}>
                        {loading ? "Saving..." : (
                            <>
                                <Save className="mr-2 h-5 w-5" />
                                {isEditMode ? "Save Edits" : "Complete Visit"}
                            </>
                        )}
                    </Button>
                </div>
            </form >
        </div >
    );
}

export default function NewVisitPage() {
    return (
        <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
            <NewVisitContent />
        </Suspense>
    );
}
