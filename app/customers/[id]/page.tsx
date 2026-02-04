"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin, Phone, User, ShoppingBag, X, Pencil, Check, Loader2, MoreVertical, Edit } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getVisits, saveVisit } from "@/lib/storage";
import { Visit } from "@/types";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link";

export default function CustomerDetailsPage() {
    // ... existing setup ...
    const router = useRouter();
    const params = useParams();
    // Safely handle string or array from useParams
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const pharmacyName = rawId ? decodeURIComponent(rawId) : "";
    const [visits, setVisits] = useState<Visit[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [stats, setStats] = useState({
        totalVisits: 0,
        lastVisitDate: null as Date | null,
        lastContact: "N/A",
        areaCode: undefined as string | undefined, // Added area code to stats
        bestDays: [] as string[],
        topActions: [] as { action: string; count: number }[],
    });

    // Area Code Edit State
    const [isEditingArea, setIsEditingArea] = useState(false);
    const [tempAreaCode, setTempAreaCode] = useState("");
    const [isSavingArea, setIsSavingArea] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const localVisits = getVisits();
            let allVisits = [...localVisits];

            try {
                // Dynamic import server action
                const { getVisitsFromCloud } = await import('@/app/actions');
                const { success, data } = await getVisitsFromCloud();

                if (success && data && data.length > 0) {
                    const cloudIds = new Set(data.map(v => v.id));
                    const localOnly = localVisits.filter(v => !cloudIds.has(v.id));
                    allVisits = [...data, ...localOnly];
                }
            } catch (err) {
                console.error("Details Cloud Fetch Error:", err);
            }

            // Filter for this customer
            const customerVisits = allVisits
                .filter((v) => v.pharmacyName.trim().toLowerCase() === pharmacyName.trim().toLowerCase())
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setVisits(customerVisits);

            if (customerVisits.length > 0) {
                // Calculate Stats
                const lastVisit = customerVisits[0];
                const actionCounts: Record<string, number> = {};

                customerVisits.forEach((v) => {
                    v.actions.forEach((a) => {
                        actionCounts[a] = (actionCounts[a] || 0) + 1;
                    });
                });

                const topActions = Object.entries(actionCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([action, count]) => ({ action, count }));

                setStats({
                    totalVisits: customerVisits.length,
                    lastVisitDate: new Date(lastVisit.timestamp),
                    lastContact: lastVisit.customerContact || "N/A",
                    areaCode: lastVisit.areaCode, // Get from specific visit (likely latest)
                    bestDays: lastVisit.bestDays || [],
                    topActions,
                });

                // Set initial temp area code
                setTempAreaCode(lastVisit.areaCode || "");
            }
        };

        if (pharmacyName) {
            loadData();
        }
    }, [pharmacyName]);

    const handleSaveAreaCode = async () => {
        if (!stats.areaCode && !tempAreaCode) return; // Nothing changed/empty

        setIsSavingArea(true);
        try {
            const { updateAreaCodeAction } = await import("@/app/actions");

            // We need to update the LATEST visit for this customer
            if (visits.length === 0) return;
            const latestVisit = visits[0];

            const result = await updateAreaCodeAction(latestVisit.id, tempAreaCode);

            if (result.success) {
                console.log("Area Code Updated Successfully");
                // Update local state immediately
                setStats(prev => ({ ...prev, areaCode: tempAreaCode }));
                setIsEditingArea(false);

                // Also update the visit in the list to reflect change if re-rendered
                const updatedVisits = [...visits];
                updatedVisits[0] = { ...updatedVisits[0], areaCode: tempAreaCode };
                setVisits(updatedVisits);

                // Also update local storage to keep sync
                saveVisit(updatedVisits[0]);
            } else {
                console.error("Update Failed:", result.error);
                alert("Failed to update area code: " + result.error);
            }
        } catch (error) {
            console.error("Save Handler Error:", error);
            alert("Error saving area code");
        } finally {
            setIsSavingArea(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6 pb-24 space-y-6">
            <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft size={24} />
                    </Button>
                    <h1 className="text-2xl font-bold text-slate-800 break-words flex-1">{pharmacyName}</h1>
                </div>

                {/* Area Code Header Edit */}
                <div className="flex items-center gap-4 pl-12">
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-slate-400" />
                        {isEditingArea ? (
                            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                <Input
                                    value={tempAreaCode}
                                    onChange={(e) => setTempAreaCode(e.target.value)}
                                    className="h-8 w-24 text-sm"
                                    placeholder="Area"
                                    autoFocus
                                />
                                <Button
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                    onClick={handleSaveAreaCode}
                                    disabled={isSavingArea}
                                >
                                    {isSavingArea ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                        setIsEditingArea(false);
                                        setTempAreaCode(stats.areaCode || "");
                                    }}
                                >
                                    <X size={14} />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingArea(true)}>
                                <span className={cn("text-sm font-medium", !stats.areaCode ? "text-slate-400 italic" : "text-slate-600")}>
                                    {stats.areaCode ? `Area: ${stats.areaCode}` : "Add Area Code"}
                                </span>
                                <Pencil size={12} className="text-slate-300 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                            </div>
                        )}
                    </div>

                    {/* Best Days Display */}
                    {stats.bestDays && stats.bestDays.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
                            <div className="flex gap-1">
                                {stats.bestDays.map(day => (
                                    <span key={day} className="text-xs font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                        {day}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {visits.length === 0 ? (
                <Card>
                    <CardContent className="pt-6 text-center text-slate-500">
                        No visits recorded for this customer yet.
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <span className="text-3xl font-bold text-primary">{stats.totalVisits}</span>
                                <span className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Total Visits</span>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <span className="text-sm font-bold text-slate-700">
                                    {stats.lastVisitDate ? formatDistanceToNow(stats.lastVisitDate, { addSuffix: true }) : "N/A"}
                                </span>
                                <span className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Last Seen</span>
                            </CardContent>
                        </Card>

                        {/* Best Days Card */}
                        {stats.bestDays && stats.bestDays.length > 0 && (
                            <Card className="col-span-2 bg-emerald-50/50 border-emerald-100">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-semibold text-emerald-600 uppercase tracking-wide flex items-center gap-2">
                                        <Clock size={14} /> Best Days to Visit
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex flex-wrap gap-2">
                                        {stats.bestDays.map(day => (
                                            <span key={day} className="text-sm font-bold text-emerald-700 bg-white px-3 py-1 rounded-md shadow-sm border border-emerald-100">
                                                {day}
                                            </span>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="col-span-2">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Last Contact</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center space-x-2 text-slate-800">
                                    <User size={18} className="text-primary" />
                                    <span className="font-semibold">{stats.lastContact}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Top Activities</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {stats.topActions.map((item) => (
                                    <div key={item.action} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                                        {item.action}
                                        <span className="ml-2 bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 text-[10px]">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Visit Timeline */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-slate-800">Visit History</h2>
                        {visits.map((visit) => (
                            <Card key={visit.id} className="overflow-hidden">
                                <CardHeader className="bg-slate-50 py-3 border-b">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-2 text-slate-600">
                                            <Calendar size={16} />
                                            <span className="text-sm font-medium">{format(new Date(visit.timestamp), "MMM d, yyyy")}</span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center space-x-1 text-slate-400 text-xs">
                                                <Clock size={14} />
                                                <span>{format(new Date(visit.timestamp), "h:mm a")}</span>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreVertical className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <Link href={`/new-visit?id=${visit.id}`}>
                                                        <DropdownMenuItem>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            <span>Edit Visit</span>
                                                        </DropdownMenuItem>
                                                    </Link>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    {visit.customerContact && (
                                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                                            <User size={16} />
                                            <span>Spoke with: <span className="font-medium text-slate-800">{visit.customerContact}</span></span>
                                        </div>
                                    )}
                                    {visit.user && (
                                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                                            <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center">
                                                <span className="text-[9px] font-bold text-slate-600">{visit.user.charAt(0)}</span>
                                            </div>
                                            <span>Completed by: <span className="font-medium text-slate-800">{visit.user}</span></span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        {visit.actions.map((action) => (
                                            <span key={action} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-100">
                                                {action}
                                            </span>
                                        ))}
                                    </div>

                                    {visit.hasOrder && (
                                        <div className="bg-green-50 p-2 rounded-md border border-green-100 mb-2 inline-flex items-center space-x-2">
                                            <ShoppingBag size={14} className="text-green-700" />
                                            <span className="text-xs font-bold text-green-700">Order Taken</span>
                                        </div>
                                    )}

                                    {visit.orderDetails && (
                                        <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                                            <p className="text-xs font-semibold text-slate-500 mb-1">Details:</p>
                                            <p className="text-sm text-slate-800 whitespace-pre-wrap">{visit.orderDetails}</p>
                                        </div>
                                    )}

                                    {visit.notes && (
                                        <div className="text-xs text-slate-500 italic border-l-2 border-slate-200 pl-2">
                                            "{visit.notes}"
                                        </div>
                                    )}

                                    {visit.photoUrl && visit.photoUrl !== "Image Upload Failed" && (
                                        <div className="mt-2">
                                            {visit.photoUrl.includes("drive.google.com") ? (
                                                <a
                                                    href={visit.photoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors border border-slate-200"
                                                >
                                                    <span className="sr-only">Open Drive File</span>
                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-4 h-4" alt="Drive" />
                                                    View on Drive
                                                </a>
                                            ) : (
                                                <button
                                                    onClick={() => setSelectedImage(visit.photoUrl || null)}
                                                    className="inline-block group relative focus:outline-none"
                                                >
                                                    <img
                                                        src={visit.photoUrl}
                                                        alt="Visit Proof"
                                                        className="h-12 w-12 object-cover rounded-lg border border-slate-200 shadow-sm transition-transform hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent rounded-lg transition-colors" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 transition-opacity backdrop-blur-sm"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full flex justify-center">
                        <img
                            src={selectedImage}
                            alt="Full Size"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />
                        <button
                            className="absolute -top-12 right-0 md:top-4 md:right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(null);
                            }}
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
