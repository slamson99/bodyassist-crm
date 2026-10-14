"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { getVisits } from "@/lib/storage";
import { Visit } from "@/types";
import { Search, User, Calendar, TrendingUp, MapPin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { CustomerStats } from "@/types";

import { useUser } from "@/app/contexts/UserContext";

export const dynamic = 'force-dynamic';

export default function CustomersPage() {
    const { user } = useUser();
    const [searchTerm, setSearchTerm] = useState("");
    const [areaSearch, setAreaSearch] = useState("");
    const [userFilter, setUserFilter] = useState("");
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>("newest");
    const [filterRating, setFilterRating] = useState<'All' | 'Low' | 'Medium' | 'High' | 'Won' | 'Lost'>("All");
    const [isRestored, setIsRestored] = useState(false);

    // Data Stats
    const [stats, setStats] = useState<CustomerStats[]>([]);

    // Autocomplete
    const [availableUsers, setAvailableUsers] = useState<string[]>([]);
    const [showUserSuggestions, setShowUserSuggestions] = useState(false);

    // Restore state from sessionStorage on mount
    useEffect(() => {
        try {
            const savedState = sessionStorage.getItem('bodyassist_customers_filter_state');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                if (parsed.searchTerm !== undefined) setSearchTerm(parsed.searchTerm);
                if (parsed.areaSearch !== undefined) setAreaSearch(parsed.areaSearch);
                if (parsed.userFilter !== undefined) setUserFilter(parsed.userFilter);
                if (parsed.sortOrder !== undefined) setSortOrder(parsed.sortOrder);
                if (parsed.filterRating !== undefined) setFilterRating(parsed.filterRating);
            }
        } catch (e) {
            console.error("Error reading saved customer filters", e);
        }
        setIsRestored(true);
    }, []);

    // Save filters to sessionStorage when changed
    useEffect(() => {
        if (!isRestored) return;
        try {
            const current = {
                searchTerm,
                areaSearch,
                userFilter,
                sortOrder,
                filterRating,
                scrollY: window.scrollY,
            };
            sessionStorage.setItem('bodyassist_customers_filter_state', JSON.stringify(current));
        } catch (e) {
            // ignore
        }
    }, [searchTerm, areaSearch, userFilter, sortOrder, filterRating, isRestored]);

    // Restore scroll position after stats render
    useEffect(() => {
        if (stats.length > 0 && isRestored) {
            try {
                const saved = sessionStorage.getItem('bodyassist_customers_filter_state');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.scrollY) {
                        requestAnimationFrame(() => {
                            window.scrollTo({ top: parsed.scrollY, behavior: 'instant' });
                        });
                    }
                }
            } catch (e) {
                // ignore
            }
        }
    }, [stats, isRestored]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // 1. Fetch Server Stats
                const { getCustomerStatsAction } = await import('@/app/actions');

                // Pass user.areaCode and current userFilter
                const { success, data, users } = await getCustomerStatsAction(user?.areaCode || "", userFilter);

                let currentStats = success && data ? data : [];
                if (users) {
                    setAvailableUsers(users.sort());
                }

                setStats(currentStats);

            } catch (err) {
                console.error("Stats Load Error:", err);
            }
        };

        fetchStats();
    }, [user, userFilter]); // Re-fetch when user/filter changes

    const saveScrollPosition = () => {
        try {
            sessionStorage.setItem('bodyassist_customers_filter_state', JSON.stringify({
                searchTerm,
                areaSearch,
                userFilter,
                sortOrder,
                filterRating,
                scrollY: window.scrollY,
            }));
        } catch (e) {
            // ignore
        }
    };


    const filteredStats = stats.filter(s => {
        const matchesSearch = s.pharmacyName.toLowerCase().includes(searchTerm.toLowerCase());

        // Area Code: Exact match (case insensitive), trimmed.
        // If s.areaCode is "2A, 2B" (multi-area), we check if search term is ONE of them?
        // User request: "if i use 2A, only show 2A".
        // Use logic: if areaSearch is present, it must EQUAL the Area Code (or one of them).
        const cleanAreaSearch = areaSearch.trim().toLowerCase();
        const matchesArea = !cleanAreaSearch || (s.areaCode && s.areaCode.toLowerCase().trim() === cleanAreaSearch);

        const matchesRating = filterRating === "All" || s.leadRating === filterRating;

        return matchesSearch && matchesArea && matchesRating;
    }).sort((a, b) => {
        const dateA = new Date(a.lastVisit).getTime();
        const dateB = new Date(b.lastVisit).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-xl font-bold text-slate-900">Customer Analysis</h1>

            <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search customers..."
                            className="pl-9 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Admin User Filter */}
                    {user?.areaCode === "All" && (
                        <div className="relative w-1/3">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="User"
                                className="pl-9 bg-white"
                                value={userFilter}
                                onChange={(e) => {
                                    setUserFilter(e.target.value);
                                    setShowUserSuggestions(true);
                                }}
                                onBlur={() => setTimeout(() => setShowUserSuggestions(false), 200)}
                            />
                            {showUserSuggestions && userFilter && (
                                <div className="absolute z-10 w-full bg-white mt-1 rounded-md shadow-lg border border-slate-200 max-h-40 overflow-y-auto top-full">
                                    {availableUsers
                                        .filter(u => u.toLowerCase().includes(userFilter.toLowerCase()))
                                        .map(u => (
                                            <div
                                                key={u}
                                                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setUserFilter(u);
                                                    setShowUserSuggestions(false);
                                                }}
                                            >
                                                {u}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="relative w-1/3">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Area"
                            className="pl-9 bg-white"
                            value={areaSearch}
                            onChange={(e) => setAreaSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-2 justify-between items-center">
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide flex-1">
                        {(['All', 'High', 'Medium', 'Low', 'Won', 'Lost'] as const).map((rating) => (
                            <button
                                key={rating}
                                onClick={() => setFilterRating(rating)}
                                className={`
                                    px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors
                                    ${filterRating === rating
                                        ? rating === 'Won'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                            : rating === 'Lost'
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                                : 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }
                                `}
                            >
                                {rating === 'All' ? 'All Leads' : rating === 'Won' ? 'Won' : rating === 'Lost' ? 'Lost' : `${rating} Potential`}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                    >
                        <TrendingUp size={14} className={sortOrder === 'newest' ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredStats.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        {searchTerm || userFilter ? "No customers match your search" : "No customer data available yet"}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredStats.map((stat) => (
                            <Link
                                href={`/customers/${encodeURIComponent(stat.pharmacyName)}`}
                                key={stat.pharmacyName}
                                onClick={saveScrollPosition}
                            >
                                <Card className="border-none shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-lg text-slate-800">{stat.pharmacyName}</h3>
                                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
                                                {stat.totalVisits} {stat.totalVisits === 1 ? 'Visit' : 'Visits'}
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-sm text-slate-600">
                                            {stat.leadRating && (
                                                <div className="inline-block mb-1">
                                                    <span className={`
                                                        text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
                                                        ${stat.leadRating === 'Won' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                            stat.leadRating === 'Lost' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                                            stat.leadRating === 'High' ? 'bg-green-100 text-green-700' :
                                                            stat.leadRating === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-slate-100 text-slate-600'}
                                                    `}>
                                                        {stat.leadRating === 'Won' ? 'Won' : stat.leadRating === 'Lost' ? 'Lost' : `${stat.leadRating} Potential`}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span>Last seen: <span className="text-slate-900 font-medium">{formatDistanceToNow(new Date(stat.lastVisit), { addSuffix: true })}</span></span>
                                            </div>
                                            {stat.areaCode && (
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <MapPin size={14} className="text-slate-400" />
                                                    <span>Area: <span className="text-slate-900 font-medium">{stat.areaCode}</span></span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-slate-400" />
                                                <span>Contact: <span className="text-slate-900 font-medium">{stat.lastContact}</span></span>
                                            </div>
                                            {stat.lastUser && (
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <div className="w-3.5 h-3.5 rounded-full bg-slate-200 flex items-center justify-center">
                                                        <span className="text-[8px] font-bold text-slate-600">{stat.lastUser.charAt(0)}</span>
                                                    </div>
                                                    <span>By: <span className="text-slate-900 font-medium">{stat.lastUser}</span></span>
                                                </div>
                                            )}
                                            <div className="flex items-start gap-2">
                                                <TrendingUp size={14} className="text-slate-400 mt-1" />
                                                <div className="flex flex-wrap gap-1">
                                                    {stat.topActions.map(action => (
                                                        <span key={action} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                                                            {action}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {stat.bestDays && stat.bestDays.length > 0 && (
                                                <div className="flex items-center gap-2 pt-1">
                                                    <Clock size={14} className="text-slate-400" />
                                                    <div className="flex gap-1 flex-wrap">
                                                        {stat.bestDays.map(day => (
                                                            <span key={day} className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">
                                                                {day}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}</div>
        </div>
    );
}
