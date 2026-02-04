"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Clock, MapPin, ShoppingBag, AlertCircle, ChevronRight, User, Trash2 } from "lucide-react";
import { Visit, CustomerStats } from "@/types";
import { getVisits } from "@/lib/storage";
import { formatDistanceToNow, addMonths, isBefore } from "date-fns";
import { useUser } from "./contexts/UserContext";

export default function Home() {
  const { user } = useUser();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [groupedPending, setGroupedPending] = useState<Record<string, { urgent: CustomerStats[], warning: CustomerStats[], soon: CustomerStats[] }>>({});
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      // Local visits for recent activity
      setVisits(getVisits());

      // Fetch Global Stats for Pending List
      if (user?.areaCode) {
        try {
          const { getCustomerStatsAction } = await import('@/app/actions');
          const result = await getCustomerStatsAction(user.areaCode);

          if (result.success && result.data) {
            const stats = result.data;
            const now = new Date();

            const byArea: Record<string, { urgent: CustomerStats[], warning: CustomerStats[], soon: CustomerStats[] }> = {};
            let count = 0;

            stats.forEach(s => {
              const lastVisit = new Date(s.lastVisit);
              const area = s.areaCode || "Unassigned";

              if (!byArea[area]) byArea[area] = { urgent: [], warning: [], soon: [] };

              if (isBefore(lastVisit, addMonths(now, -6))) {
                byArea[area].urgent.push(s);
                count++;
              } else if (isBefore(lastVisit, addMonths(now, -3))) {
                byArea[area].warning.push(s);
                count++;
              } else if (isBefore(lastVisit, addMonths(now, -1))) {
                byArea[area].soon.push(s);
                count++;
              }
            });

            // Sort within buckets
            const sortFn = (a: CustomerStats, b: CustomerStats) => new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime();

            Object.keys(byArea).forEach(area => {
              byArea[area].urgent.sort(sortFn);
              byArea[area].warning.sort(sortFn);
              byArea[area].soon.sort(sortFn);
            });

            setGroupedPending(byArea);
            setHasPending(count > 0);
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

  const renderPendingVisits = () => {
    if (!hasPending) return null;

    const areas = Object.keys(groupedPending).sort();

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            Pending Visits
          </h3>
        </div>

        <div className="space-y-6">
          {areas.map(area => {
            const { urgent, warning, soon } = groupedPending[area];
            const totalForArea = urgent.length + warning.length + soon.length;
            if (totalForArea === 0) return null;

            const isExpanded = expandedSections[area];

            // Flatten for preview (Priority: Urgent -> Warning -> Soon)
            const allInOrder = [...urgent, ...warning, ...soon];
            const previewList = allInOrder.slice(0, 3);
            const showExpand = allInOrder.length > 3;

            return (
              <div key={area} className="bg-slate-50 rounded-xl p-4 border border-slate-100 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-sm flex items-center gap-2">
                    <MapPin size={16} /> Area {area}
                  </h4>
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{totalForArea}</span>
                </div>

                {/* Render Content */}
                {isExpanded ? (
                  <div className="space-y-4">
                    {/* Sub Categories when Expanded */}
                    {urgent.length > 0 && renderCategoryBlock(urgent, "Over 6 Months", "bg-red-500", "text-red-600", AlertCircle)}
                    {warning.length > 0 && renderCategoryBlock(warning, "Over 3 Months", "bg-orange-500", "text-orange-500", Clock)}
                    {soon.length > 0 && renderCategoryBlock(soon, "Over 1 Month", "bg-yellow-500", "text-yellow-600", Clock)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Mixed List for Preview */}
                    {previewList.map(cust => {
                      // Determine style based on which bucket it is in
                      let colorClass = "border-l-yellow-500";
                      if (urgent.includes(cust)) colorClass = "border-l-red-600";
                      else if (warning.includes(cust)) colorClass = "border-l-orange-500";

                      return (
                        <Link href={`/customers/${encodeURIComponent(cust.pharmacyName)}`} key={cust.pharmacyName}>
                          <Card className={`mb-2 border-l-4 hover:shadow-md transition-all cursor-pointer group ${colorClass}`}>
                            <div className="p-3 flex justify-between items-center">
                              <div>
                                <h4 className="font-semibold text-slate-800 text-sm group-hover:text-primary transition-colors">{cust.pharmacyName}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                  <div className="flex items-center gap-1">
                                    <Clock size={10} />
                                    <span>{formatDistanceToNow(new Date(cust.lastVisit), { addSuffix: true })}</span>
                                  </div>
                                </div>
                                {/* Best Days Display */}
                                {cust.bestDays && cust.bestDays.length > 0 && (
                                  <div className="mt-2 flex gap-1 flex-wrap">
                                    {cust.bestDays.map(day => (
                                      <span key={day} className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                        {day}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <ChevronRight size={16} className="text-slate-300 group-hover:text-primary" />
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {showExpand && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection(area)}
                    className="w-full mt-2 text-xs text-slate-500 hover:text-slate-700 h-8"
                  >
                    {isExpanded ? "Show Less" : `Show ${allInOrder.length - 3} More in Area ${area}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCategoryBlock = (list: CustomerStats[], label: string, bgClass: string, textClass: string, Icon: any) => {
    return (
      <div>
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${textClass} mb-2`}>
          <Icon size={12} /> {label}
        </div>
        {list.map(cust => (
          <Link href={`/customers/${encodeURIComponent(cust.pharmacyName)}`} key={cust.pharmacyName}>
            <Card className={`mb-2 border-l-4 hover:shadow-md transition-all cursor-pointer group`} style={{ borderLeftColor: textClass.includes('red') ? '#dc2626' : textClass.includes('orange') ? '#f97316' : '#eab308' }}>
              <div className="p-3 flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm group-hover:text-primary transition-colors">{cust.pharmacyName}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{formatDistanceToNow(new Date(cust.lastVisit), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-primary" />
              </div>
            </Card>
          </Link>
        ))}
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
                    <div className="flex flex-col items-center gap-2 self-center">
                      <ChevronRight className="text-gray-300 group-hover:text-primary transition-colors" size={20} />
                      {/* Stop propagation to prevent navigation when clicking delete */}
                      <div onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm("Remove this visit from history? This cannot be undone.")) {
                          // Optimistic update
                          const newVisits = visits.filter(v => v.id !== visit.id);
                          setVisits(newVisits);
                          // Perform deletion
                          import('@/lib/storage').then(mod => mod.deleteVisit(visit.id));
                          import('@/app/actions').then(mod => mod.deleteVisitAction(visit.id));
                        }
                      }}>
                        <div className="p-2 hover:bg-red-100 rounded-full text-slate-300 hover:text-red-500 transition-colors" title="Remove Entry">
                          <Trash2 size={16} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pending Visits (Grouped by Area -> Category) */}
      {renderPendingVisits()}

    </div>
  );
}
