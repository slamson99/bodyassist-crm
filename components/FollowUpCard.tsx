'use client';

import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';

export type ActionType = 'Sugg. Order' | 'Cold Call' | 'Payment' | 'Other';
export type TimeframeLabel = '1 Day' | '3 Days' | '7 Days' | '30 Days';

export interface FollowUpData {
    required: boolean | null;
    actionType: ActionType | null;
    subject: string;
    timeframe: TimeframeLabel | null;
}

interface ControlledFollowUpCardProps {
    pharmacyName: string;
    value: FollowUpData;
    onChange: (value: FollowUpData) => void;
}

export default function FollowUpCard({ pharmacyName, value, onChange }: ControlledFollowUpCardProps) {
    // Handle Action Type Selection and Auto-Prefixing
    const handleActionTypeSelect = (type: ActionType) => {
        const fullSubject = `${type} - ${pharmacyName}`;
        const truncatedSubject = fullSubject.substring(0, 50);
        onChange({
            ...value,
            actionType: type,
            subject: truncatedSubject,
            timeframe: value.timeframe, // Preserve timeframe if already chosen
        });
    };

    // Handle Subject input changes under character/prefix constraints
    const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!value.actionType) return;
        const val = e.target.value;
        const prefix = `${value.actionType} - `;

        if (val.startsWith(prefix)) {
            // Enforce overall limit of 50 characters
            if (val.length <= 50) {
                onChange({
                    ...value,
                    subject: val,
                });
            }
        } else {
            // If the user attempts to delete the prefix, restore it
            onChange({
                ...value,
                subject: prefix,
            });
        }
    };

    // Toggle Required status
    const handleRequiredChange = (req: boolean) => {
        if (req) {
            onChange({
                required: true,
                actionType: value.actionType,
                subject: value.subject,
                timeframe: value.timeframe,
            });
        } else {
            onChange({
                required: false,
                actionType: null,
                subject: '',
                timeframe: null,
            });
        }
    };

    // Reset workflow to defaults
    const handleReset = () => {
        onChange({
            required: null,
            actionType: null,
            subject: '',
            timeframe: null,
        });
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
                {value.required === true && (
                    <button 
                        type="button"
                        onClick={handleReset}
                        className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 hover:underline transition-colors"
                    >
                        Reset
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {/* Step 1: Follow Up Required? */}
                <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Step 1: Follow Up Required?</span>
                    <div className="flex gap-2.5">
                        <button
                            type="button"
                            onClick={() => handleRequiredChange(true)}
                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 border ${
                                value.required === true
                                    ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-100 dark:shadow-none'
                                     : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <Sparkles size={13} /> Yes, Plan Follow-up
                        </button>
                        <button
                            type="button"
                            onClick={() => handleRequiredChange(false)}
                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 border ${
                                value.required === false
                                    ? 'bg-slate-800 border-slate-800 text-white dark:bg-slate-200 dark:border-slate-200 dark:text-slate-950'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            No, Completed
                        </button>
                    </div>
                </div>

                {/* Smooth Expand on Yes */}
                {value.required === true && (
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
                                            value.actionType === type
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
                        {value.actionType && (
                            <div className="space-y-2 animate-in fade-in duration-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Step 3: Subject Detail</span>
                                    <span className="text-[10px] text-slate-400 font-semibold">{value.subject.length}/50</span>
                                </div>
                                <div className="relative rounded-lg shadow-sm">
                                    <input
                                        type="text"
                                        value={value.subject}
                                        onChange={handleSubjectChange}
                                        maxLength={50}
                                        className="w-full text-xs py-3 px-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-800 dark:text-slate-200 font-medium"
                                        placeholder={`${value.actionType} - Specify details...`}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 4: Timeframe selection */}
                        <div className="space-y-2 animate-in fade-in duration-200">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Step 4: Remind Me In</span>
                            <div className="grid grid-cols-4 gap-1.5">
                                {(['1 Day', '3 Days', '7 Days', '30 Days'] as TimeframeLabel[]).map((label) => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => onChange({ ...value, timeframe: label })}
                                        className={`py-2.5 px-1 rounded-lg text-xs font-bold text-center border transition-all duration-200 ${
                                            value.timeframe === label
                                                ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
