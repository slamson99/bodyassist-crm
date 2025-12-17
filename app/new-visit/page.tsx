"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickActionGrid } from "@/components/QuickActionGrid";
import { PhotoUpload } from "@/components/PhotoUpload";
import { QUICK_ACTIONS, Visit, CustomerStats } from "@/types";
import { saveVisit, getVisits } from "@/lib/storage";
import { ChevronLeft, Save, ShoppingCart, User, MapPin } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/app/contexts/UserContext";
import { getCustomerStatsAction } from "@/app/actions";

export default function NewVisitPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const { user } = useUser();

    const [selectedAction, setSelectedAction] = useState<string[]>([]);
    const [orderTaken, setOrderTaken] = useState(false);
    const [orderDetails, setOrderDetails] = useState("");

    const [formData, setFormData] = useState<Partial<Visit>>({
        pharmacyName: "",
        customerContact: "",
        timestamp: "", // Initialize empty to avoid hydration mismatch
        actions: [],
        hasOrder: false,
        notes: "",
        photoUrl: undefined,
        leadRating: undefined,
        areaCode: "",
    });

    // Initialize date on client only
    useEffect(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setFormData(prev => ({
            ...prev,
            timestamp: now.toISOString().slice(0, 16)
        }));
    }, []);

    const [serverStats, setServerStats] = useState<CustomerStats[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Load pharmacy names for predictor from Server (Global History)
    useEffect(() => {
        const loadGlobalStats = async () => {
            // Fetch stats based on user's area code (or "All" if admin)
            // This ensures they see relevant suggestions
            const result = await getCustomerStatsAction(user?.areaCode || "");
            if (result.success && result.data) {
                setServerStats(result.data);
                const names = result.data.map(s => s.pharmacyName).sort();
                setSuggestions(names);
            }
        };
        loadGlobalStats();
    }, [user?.areaCode]);

    // Pre-fill area code from user profile
    useEffect(() => {
        if (user?.areaCode && user.areaCode !== "All") {
            setFormData(prev => ({ ...prev, areaCode: user.areaCode }));
        }
    }, [user]);

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
            // Smart Area Code: Auto-fill from server data
            areaCode: stat?.areaCode || prev.areaCode,
            // Pre-fill contact if available
            customerContact: stat?.lastContact || prev.customerContact
        }));
        setShowSuggestions(false);
    };

    // Calculate if we need to restrict the dropdown
    // If pharmacy is NOT in our list (New Customer) AND User has specific area codes (Not "All")
    const isNewCustomer = formData.pharmacyName && !serverStats.some(s => s.pharmacyName.toLowerCase() === (formData.pharmacyName || "").toLowerCase());
    const userAreaOptions = user?.areaCode && user.areaCode !== "All"
        ? user.areaCode.split(',').map(s => s.trim()).filter(Boolean)
        : [];
    const showRestrictedDropdown = isNewCustomer && userAreaOptions.length > 0;

    const handlePharmacyBlur = () => {
        if (!formData.pharmacyName) return;

        // Auto-fill logic: Find most recent visit to this pharmacy
        const visits = getVisits();
        // Sort by date desc
        const sortedVisits = visits
            .filter(v => v.pharmacyName.toLowerCase().trim() === formData.pharmacyName?.toLowerCase().trim())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (sortedVisits.length > 0 && sortedVisits[0].customerContact) {
            // Only pre-fill if current field is empty to avoid overwriting user input
            if (!formData.customerContact) {
                setFormData(prev => ({ ...prev, customerContact: sortedVisits[0].customerContact }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.pharmacyName) return;

        setLoading(true);

        const newVisit: Visit = {
            id: crypto.randomUUID(),
            pharmacyName: formData.pharmacyName!,
            customerContact: formData.customerContact,
            timestamp: formData.timestamp || new Date().toISOString(),
            actions: formData.actions || [],
            hasOrder: formData.hasOrder || false,
            orderDetails: formData.orderDetails || "",
            notes: formData.notes || "",
            photoUrl: formData.photoUrl,
            leadRating: formData.leadRating,
            areaCode: formData.areaCode,
            user: user?.name,
        };

        // 1. Save Locally (Sync, reliable, offline-first)
        saveVisit(newVisit);

        // 2. Save to Cloud (Async)
        try {
            const { submitVisitToCloud, uploadPhotoAction } = await import('@/app/actions');

            // Handle Photo Upload if exists
            let cloudVisit = { ...newVisit };
            if (newVisit.photoUrl && newVisit.photoUrl.startsWith('data:')) {
                // Upload to Drive
                const filename = `visit-${newVisit.id}-${Date.now()}.jpg`;
                const uploadResult = await uploadPhotoAction(newVisit.photoUrl, filename);
                if (uploadResult.success && uploadResult.url) {
                    cloudVisit.photoUrl = uploadResult.url;
                } else {
                    console.warn("Photo upload failed, clearing photoUrl for sheet to avoid size limit");
                    cloudVisit.photoUrl = "Image Upload Failed";
                }
            }

            const result = await submitVisitToCloud(cloudVisit);

            if (!result.success && result.code !== 'NO_CREDENTIALS') {
                alert(`Saved locally, but Cloud upload failed: ${result.error}`);
            }
        } catch (err) {
            console.error(err);
            // Don't block the user flow for cloud errors
        }

        setTimeout(() => {
            router.push("/");
        }, 500);
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-2">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ChevronLeft />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold text-slate-900">New Pharmacy Visit</h1>
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
                                onBlur={() => {
                                    // Small delay to allow click on suggestion to register
                                    setTimeout(() => {
                                        setShowSuggestions(false);
                                        handlePharmacyBlur();
                                    }, 200);
                                }}
                                autoComplete="off" // Disable browser native autocomplete to avoid conflict
                            />
                            {/* Predictor Dropdown */}
                            {showSuggestions && formData.pharmacyName && (
                                <div className="absolute z-10 w-full bg-white mt-1 rounded-md shadow-lg border border-slate-200 max-h-60 overflow-y-auto">
                                    {suggestions
                                        .filter(s => s.toLowerCase().includes(formData.pharmacyName!.toLowerCase()) && s !== formData.pharmacyName)
                                        .map((suggestion) => (
                                            <div
                                                key={suggestion}
                                                className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // Prevent blur
                                                    selectSuggestion(suggestion);
                                                }}
                                            >
                                                {suggestion}
                                            </div>
                                        ))}
                                </div>
                            )}
                            <p className="text-xs text-slate-400 mt-1">Tab away to auto-fill contact</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Contact Person</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Who did you speak with?"
                                    value={formData.customerContact}
                                    onChange={(e) => setFormData({ ...formData, customerContact: e.target.value })}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Area Code</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 z-10" />

                                {showRestrictedDropdown ? (
                                    <select
                                        className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white pl-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                                        value={formData.areaCode || ""}
                                        onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled>Select Area</option>
                                        {userAreaOptions.map(code => (
                                            <option key={code} value={code}>{code}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <Input
                                        placeholder="e.g. 1A, 2A"
                                        value={formData.areaCode || ""}
                                        onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })}
                                        className="pl-9"
                                    />
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Date & Time</label>
                            <Input
                                type="datetime-local"
                                required
                                value={formData.timestamp}
                                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Activities Performed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <QuickActionGrid
                            options={QUICK_ACTIONS}
                            selectedActions={formData.actions || []}
                            onChange={(actions) => setFormData({ ...formData, actions })}
                        />
                    </CardContent>
                </Card>

                {/* Lead Rating - Only for Cold Calls */}
                {formData.actions?.includes("Cold Call") && (
                    <Card className="border-none shadow-sm animate-in slide-in-from-top-4 fade-in duration-300">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Lead Potential</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-3">
                                {["Low", "Medium", "High"].map((rating) => (
                                    <button
                                        key={rating}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, leadRating: rating as any })}
                                        className={`
                                            py-3 px-4 rounded-xl font-medium text-sm transition-all
                                            ${formData.leadRating === rating
                                                ? 'bg-blue-600 text-white shadow-md scale-105'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }
                                        `}
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
                    <div
                        className="p-6 flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                        onClick={() => setFormData(prev => ({ ...prev, hasOrder: !prev.hasOrder }))}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${formData.hasOrder ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
                                <ShoppingCart size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Order Taken?</h3>
                                <p className="text-xs text-slate-500">Enable if you collected an order</p>
                            </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${formData.hasOrder ? 'bg-primary' : 'bg-slate-300'}`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${formData.hasOrder ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    {formData.hasOrder && (
                        <CardContent className="pt-0 pb-6 animate-in slide-in-from-top-2 fade-in duration-200">
                            <Textarea
                                placeholder="Enter order details, reference numbers, or products..."
                                className="mt-4"
                                value={formData.orderDetails}
                                onChange={(e) => setFormData({ ...formData, orderDetails: e.target.value })}
                            />
                        </CardContent>
                    )}
                </Card>

                {/* Photo Upload */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Photo Evidence</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PhotoUpload
                            currentPhoto={formData.photoUrl || null}
                            onPhotoSelect={(url) => setFormData({ ...formData, photoUrl: url || undefined })}
                        />
                    </CardContent>
                </Card>

                {/* Notes */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Additional Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="Any feedback, issues, or follow-up tasks..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </CardContent>
                </Card>

                <Button type="submit" size="lg" className="w-full text-lg shadow-lg shadow-blue-500/20" disabled={loading}>
                    {loading ? "Saving..." : (
                        <>
                            <Save className="mr-2 h-5 w-5" />
                            Complete Visit
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
