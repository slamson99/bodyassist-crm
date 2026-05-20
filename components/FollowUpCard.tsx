'use client';

import React, { useState, useEffect } from 'react';
import { sendFollowUpAction } from '@/lib/actions/followup';
import { Calendar, CheckCircle2, AlertCircle, Loader2, ArrowRight, Bell, Sparkles } from 'lucide-react';

interface FollowUpCardProps {
    pharmacyName: string;
    username: string;
}

type ActionType = 'Sugg. Order' | 'Cold Call' | 'Payment' | 'Other';
type TimeframeLabel = '1 Day' | '3 Days' | '7 Days' | '30 Days';

const TIMEFRAME_MAP: Record<TimeframeLabel, number> = {
    '1 Day': 1,
    '3 Days': 3,
    '7 Days': 7,
    '30 Days': 30,
};

export default function FollowUpCard({ pharmacyName, username }: FollowUpCardProps) {
    // Step 1: Follow Up Required
    const [required, setRequired] = useState<boolean | null>(null);
    
    // Step 2: Action Type
    const [actionType, setActionType] = useState<ActionType | null>(null);
    
    // Step 3: Subject Line
    const [subject, setSubject] = useState<string>('');
    
    // Step 4: Timeframe
    const [timeframe, setTimeframe] = useState<TimeframeLabel | null>(null);
    
    // Submission States
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    // Handle Action Type Selection and Auto-Prefixing
    const handleActionTypeSelect = (type: ActionType) => {
        setActionType(type);
        setSubject(`${type} - `);
    };

    // Handle Subject input changes under character/prefix constraints
    const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!actionType) return;
        const val = e.target.value;
        const prefix = `${actionType} - `;

        if (val.startsWith(prefix)) {
            // Enforce overall limit of 50 characters
            if (val.length <= 50) {
                setSubject(val);
            }
        } else {
            // If the user attempts to delete the prefix, restore it
            setSubject(prefix);
        }
    };

    // Reset workflow to defaults
    const resetFlow = () => {
        setRequired(null);
        setActionType(null);
        setSubject('');
        setTimeframe(null);
        setStatus('idle');
        setErrorMessage('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!actionType || !subject || !timeframe) return;

        setLoading(true);
        setStatus('idle');
        setErrorMessage('');

        const timeframeDays = TIMEFRAME_MAP[timeframe];

        try {
            const res = await sendFollowUpAction({
                pharmacyName,
                actionType,
                subject,
                timeframeDays,
                username,
            });

            if (res.success) {
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMessage(res.error || 'Failed to schedule calendar follow-up.');
            }
        } catch (err) {
            console.error('Submit Error:', err);
            setStatus('error');
            setErrorMessage('An unexpected connection error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 dark:border-slate-800/40 pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm md:text-base">Visit Follow-Up</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Auto-schedules a reminder in your primary calendar</p>
                    </div>
                </div>
                {required === true && (
                    <button 
                        onClick={resetFlow}
                        className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 hover:underline transition-colors"
                    >
                        Reset
                    </button>
                )}
            </div>

            {/* Success State */}
            {status === 'success' && (
                <div className="flex flex-col items-center justify-center py-6 text-center animate-in zoom-in-95 duration-300">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 rounded-full mb-3 shadow-inner">
                        <CheckCircle2 size={36} className="animate-bounce" />
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Reminder Email Sent!</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                        The calendar invitation (.ics) is on its way to your mailbox. Open the email to add it to your agenda.
                    </p>
                    <button
                        onClick={resetFlow}
                        className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
                    >
                        Setup Another Follow-Up
                    </button>
                </div>
            )}

            {/* Main Interactive Flow */}
            {status !== 'success' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Step 1: Follow Up Required? */}
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Step 1: Follow Up Required?</span>
                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setRequired(true);
                                    if (status === 'error') setStatus('idle');
                                }}
                                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 border ${
                                    required === true
                                        ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-100 dark:shadow-none'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                }`}
                            >
                                <Sparkles size={13} /> Yes, Plan Follow-up
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRequired(false);
                                    resetFlow();
                                }}
                                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 border ${
                                    required === false
                                        ? 'bg-slate-800 border-slate-800 text-white dark:bg-slate-200 dark:border-slate-200 dark:text-slate-950'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                }`}
                            >
                                No, Completed
                            </button>
                        </div>
                    </div>

                    {/* Smooth Expand on Yes */}
                    {required === true && (
                        <div className="space-y-4 pt-2 border-t border-slate-50 dark:border-slate-800/40 animate-in slide-in-from-top-3 duration-300">
                            
                            {/* Step 2: Action Type */}
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Step 2: Select Action Type</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['Sugg. Order', 'Cold Call', 'Payment', 'Other'] as ActionType[]).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => handleActionTypeSelect(type)}
                                            className={`py-2 px-3 rounded-lg text-xs font-semibold text-center border transition-all duration-200 ${
                                                actionType === type
                                                    ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-500 text-violet-700 dark:text-violet-400 font-bold ring-2 ring-violet-500/10'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Step 3: Subject input */}
                            {actionType && (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Step 3: Subject Detail</span>
                                        <span className="text-[10px] text-slate-400 font-semibold">{subject.length}/50</span>
                                    </div>
                                    <div className="relative rounded-lg shadow-sm">
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={handleSubjectChange}
                                            disabled={loading}
                                            className="w-full text-xs py-3 px-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-800 dark:text-slate-200 font-medium"
                                            placeholder={`${actionType} - Specify details...`}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Timeframe selection */}
                            {actionType && subject.trim().length > `${actionType} - `.length && (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Step 4: Remind Me In</span>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {(['1 Day', '3 Days', '7 Days', '30 Days'] as TimeframeLabel[]).map((label) => (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => setTimeframe(label)}
                                                className={`py-2.5 px-1 rounded-lg text-xs font-bold text-center border transition-all duration-200 ${
                                                    timeframe === label
                                                        ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Submit & Status Blocks */}
                            {timeframe && (
                                <div className="space-y-3 pt-3 border-t border-slate-50 dark:border-slate-800/40 animate-in fade-in duration-200">
                                    {status === 'error' && (
                                        <div className="flex gap-2 items-start p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs border border-rose-100 dark:border-rose-900/40 animate-in shake duration-300">
                                            <AlertCircle size={15} className="mt-0.5 shrink-0" />
                                            <div>
                                                <span className="font-bold">Dispatch Error:</span> {errorMessage}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading || !actionType || subject.length <= `${actionType} - `.length || !timeframe}
                                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-100 dark:shadow-none hover:shadow-lg transition-all duration-250 flex items-center justify-center gap-1.5"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" /> Scheduling Invite...
                                            </>
                                        ) : (
                                            <>
                                                <Bell size={14} /> Set Calendar Reminder <ArrowRight size={12} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </form>
            )}
        </div>
    );
}
