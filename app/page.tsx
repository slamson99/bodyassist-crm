"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Clock, MapPin, ShoppingBag, AlertCircle, ChevronRight, User } from "lucide-react";
import { Visit, CustomerStats } from "@/types";
import { getVisits } from "@/lib/storage";
import { formatDistanceToNow, addMonths, isBefore } from "date-fns";
import { useUser } from "./contexts/UserContext";

export default function Home() {
  const { user } = useUser();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [pendingVisits, setPendingVisits] = useState<{
    urgent: CustomerStats[], // > 6 months
    warning: CustomerStats[], // > 3 months
    soon: CustomerStats[],    // > 1 month
  }>({ urgent: [], warning: [], soon: [] });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // ... existing useEffect ...
    const loadDashboard = async () => {
      // Local visits for recent activity
      setVisits(getVisits());

      // Fetch Global Stats for Pending List
      // Only fetch if user has area code
      if (user?.areaCode) {
        try {
          const { getCustomerStatsAction } = await import('@/app/actions');
          const result = await getCustomerStatsAction(user.areaCode);

          if (result.success && result.data) {
            const stats = result.data;
            const now = new Date();

            // Grouping Logic
            const urgent: CustomerStats[] = [];
            const warning: CustomerStats[] = [];
            const soon: CustomerStats[] = [];

            stats.forEach(s => {
              const lastVisit = new Date(s.lastVisit);
              // Only include if Area matches user's filter (Server action handles this mostly, but double check)
              // "All" handled by server.

              if (isBefore(lastVisit, addMonths(now, -6))) {
                urgent.push(s);
              } else if (isBefore(lastVisit, addMonths(now, -3))) {
                warning.push(s);
              } else if (isBefore(lastVisit, addMonths(now, -1))) {
                soon.push(s);
              }
            });

            // Sort by longest overdue inside each group
            const sortFn = (a: CustomerStats, b: CustomerStats) => new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime();

            setPendingVisits({
              urgent: urgent.sort(sortFn),
              warning: warning.sort(sortFn),
              soon: soon.sort(sortFn),
            });
          }
        } catch (err) {
          console.error("Dashboard Stats Error:", err);
        }
      }
    };
    loadDashboard();
  }, [user?.areaCode]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderPendingList = (list: CustomerStats[], colorDetails: { bg: string, text: string, icon: any, label: string }) => {
    if (list.length === 0) return null;

    // Group by Area Code nicely
    const byArea: Record<string, CustomerStats[]> = {};
    list.forEach(item => {
      const area = item.areaCode || "Unassigned";
      if (!byArea[area]) byArea[area] = [];
      byArea[area].push(item);
    });

    const sortedAreas = Object.keys(byArea).sort();
    const sectionId = colorDetails.label.replace(/\s+/g, '-').toLowerCase();

    return (
      <div className="space-y-4 mb-6">
        <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${colorDetails.text} mb-2`}>
          <colorDetails.icon size={16} />
          {colorDetails.label} ({list.length})
        </div>
        {sortedAreas.map(area => {
          const uniqueKey = `${sectionId}-${area}`;
          const isExpanded = expandedSections[uniqueKey];
          const areaList = byArea[area];
          const displayList = isExpanded ? areaList : areaList.slice(0, 3);
          const hasMore = areaList.length > 3;

          return (
            <div key={area} className="space-y-2">
              {sortedAreas.length > 1 && <div className="text-xs font-semibold text-slate-400 pl-1">Area {area}</div>}

              {displayList.map(cust => (
                <Link href={`/customers/${encodeURIComponent(cust.pharmacyName)}`} key={cust.pharmacyName}>
                  <Card className="mb-2 border-l-4 hover:shadow-md transition-all cursor-pointer group" style={{ borderLeftColor: colorDetails.text === 'text-red-600' ? '#dc2626' : colorDetails.text === 'text-orange-500' ? '#f97316' : '#eab308' }}>
                    <div className="p-3 flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm group-hover:text-primary transition-colors">{cust.pharmacyName}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>{formatDistanceToNow(new Date(cust.lastVisit), { addSuffix: true })}</span>
                          </div>
                          {cust.lastContact && cust.lastContact !== "Unknown" && (
                            <div className="flex items-center gap-1">
                              <User size={10} />
                              <span>{cust.lastContact}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-primary" />
                    </div>
                  </Card>
                </Link>
              ))}

              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSection(uniqueKey)}
                  className="w-full text-xs text-slate-500 hover:text-slate-700 h-8"
                >
                  {isExpanded ? "Show Less" : `Show ${areaList.length - 3} More in Area ${area}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header / CTA */}
      <section className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Welcome Back, {user?.name?.split(' ')[0] || "User"}!</h2>
          <p className="text-blue-100 mb-6">Ready to log your next pharmacy visit?</p>
          <Link href="/new-visit">
            <Button variant="secondary" className="w-full sm:w-auto font-semibold shadow-md border-0">
              <PlusCircle className="mr-2 h-4 w-4" />
              Start New Visit
            </Button>
          </Link>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-4"></div>
      </section>

      {/* Pending Visits Section (New) */}
      {(pendingVisits.urgent.length > 0 || pendingVisits.warning.length > 0 || pendingVisits.soon.length > 0) && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Pending Visits
            </h3>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 dark:bg-slate-900/50">
            {renderPendingList(pendingVisits.urgent, { bg: 'bg-red-500', text: 'text-red-600', icon: AlertCircle, label: "Over 6 Months" })}
            {renderPendingList(pendingVisits.warning, { bg: 'bg-orange-500', text: 'text-orange-500', icon: Clock, label: "Over 3 Months" })}
            {renderPendingList(pendingVisits.soon, { bg: 'bg-yellow-500', text: 'text-yellow-600', icon: Clock, label: "Over 1 Month" })}
          </div>
        </div>
      )}


      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
          <Link href="/history" className="text-sm text-primary hover:underline font-medium">View all</Link>
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
            {visits.slice(0, 3).map((visit) => ( // LIMITED TO 3
              <Link href={`/customers/${encodeURIComponent(visit.pharmacyName)}`} key={visit.id}>
                <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all hover:bg-slate-50 group cursor-pointer mb-3">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="bg-blue-50 p-3 rounded-full shrink-0 group-hover:bg-blue-100 transition-colors">
                      <MapPin className="text-primary w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-slate-800 truncate pr-2 group-hover:text-primary transition-colors">{visit.pharmacyName}</h4>
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
                    <ChevronRight className="self-center text-gray-300 group-hover:text-primary transition-colors" size={20} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
