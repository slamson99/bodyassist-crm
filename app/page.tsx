"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Clock, MapPin, ShoppingBag } from "lucide-react";
import { Visit } from "@/types";
import { getVisits } from "@/lib/storage";
import { formatDistanceToNow } from "date-fns";

export default function Home() {
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    setVisits(getVisits());
  }, []);

  return (
    <div className="space-y-6">
      <section className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Welcome Back!</h2>
          <p className="text-blue-100 mb-6">Ready to log your next pharmacy visit?</p>
          <Link href="/new-visit">
            <Button variant="secondary" className="w-full sm:w-auto font-semibold shadow-md">
              <PlusCircle className="mr-2 h-4 w-4" />
              Start New Visit
            </Button>
          </Link>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-4"></div>
      </section>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
          <Link href="/history" className="text-sm text-primary hover:underline">View all</Link>
        </div>

        {visits.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No visits recorded yet</p>
            <p className="text-slate-400 text-sm mt-1">Your history will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visits.slice(0, 5).map((visit) => (
              <Card key={visit.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="bg-blue-50 p-3 rounded-full shrink-0">
                    <MapPin className="text-primary w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-slate-800 truncate pr-2">{visit.pharmacyName}</h4>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDistanceToNow(new Date(visit.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 truncate">
                      {visit.actions.join(", ")}
                    </p>
                    {visit.user && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                        <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600">
                          {visit.user.charAt(0)}
                        </div>
                        <span>By {visit.user}</span>
                      </div>
                    )}
                    {visit.hasOrder && (
                      <div className="inline-flex items-center mt-2 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                        <ShoppingBag className="w-3 h-3 mr-1" />
                        Order Taken
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
