"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Visit } from "@/types";
import { getVisits } from "@/lib/storage";
import { ChevronLeft, MapPin, ShoppingBag, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function HistoryPage() {
    const [visits, setVisits] = useState<Visit[]>([]);

    useEffect(() => {
        setVisits(getVisits());
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ChevronLeft />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold text-slate-900">Visit History</h1>
            </div>

            <div className="space-y-4">
                {visits.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        No visits found. Go make some sales!
                    </div>
                ) : (
                    visits.map((visit) => (
                        <Card key={visit.id} className="overflow-hidden border-none shadow-sm">
                            <CardContent className="p-0">
                                <div className="p-4 bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-800 text-lg">{visit.pharmacyName}</h3>
                                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                                            {format(new Date(visit.timestamp), "MMM d, HH:mm")}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {visit.actions.map(action => (
                                            <span key={action} className="text-xs border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                                                {action}
                                            </span>
                                        ))}
                                    </div>

                                    {(visit.hasOrder || visit.photoUrl || visit.notes) && (
                                        <div className="border-t border-slate-50 pt-3 mt-3 flex gap-4 text-sm text-slate-500">
                                            {visit.hasOrder && (
                                                <div className="flex items-center text-green-600 font-medium">
                                                    <ShoppingBag size={14} className="mr-1" /> Order
                                                </div>
                                            )}
                                            {visit.photoUrl && (
                                                <div className="flex items-center text-blue-600 font-medium">
                                                    <MapPin size={14} className="mr-1" /> Photo
                                                </div>
                                            )}
                                            {visit.notes && (
                                                <div className="truncate flex-1 max-w-[150px]">
                                                    "{visit.notes}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
