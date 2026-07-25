import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface CompletenessMeterProps {
    percentage: number;
    missingFields?: string[];
    title?: string;
    className?: string;
}

export const CompletenessMeter: React.FC<CompletenessMeterProps> = ({
    percentage,
    missingFields = [],
    title = 'Record Completeness',
    className
}) => {
    const [showPopover, setShowPopover] = useState(false);
    const validPercent = Math.min(100, Math.max(0, Math.round(percentage)));

    // Color thresholds
    let colorClass = 'text-emerald-500 stroke-emerald-500 bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    let labelColor = 'text-emerald-400';
    let Icon = CheckCircle2;

    if (validPercent < 50) {
        colorClass = 'text-rose-500 stroke-rose-500 bg-rose-500/10 text-rose-400 border-rose-500/20';
        labelColor = 'text-rose-400';
        Icon = ShieldAlert;
    } else if (validPercent < 90) {
        colorClass = 'text-amber-500 stroke-amber-500 bg-amber-500/10 text-amber-400 border-amber-500/20';
        labelColor = 'text-amber-400';
        Icon = AlertCircle;
    }

    // SVG Circle Calculations
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (validPercent / 100) * circumference;

    return (
        <div className={cn("relative inline-flex items-center gap-3 p-2.5 rounded-xl border glass-card bg-slate-900/60 border-white/10", className)}>
            <div className="relative h-12 w-12 flex items-center justify-center shrink-0 cursor-pointer" onClick={() => setShowPopover(!showPopover)}>
                <svg className="h-12 w-12 transform -rotate-90" viewBox="0 0 50 50">
                    <circle
                        cx="25"
                        cy="25"
                        r={radius}
                        className="stroke-slate-800"
                        strokeWidth="4"
                        fill="transparent"
                    />
                    <circle
                        cx="25"
                        cy="25"
                        r={radius}
                        className={cn("transition-all duration-700 ease-out", colorClass)}
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                    />
                </svg>
                <span className="absolute text-[11px] font-extrabold text-white">{validPercent}%</span>
            </div>

            <div className="flex flex-col cursor-pointer" onClick={() => setShowPopover(!showPopover)}>
                <div className="flex items-center gap-1.5">
                    <Icon className={cn("h-3.5 w-3.5", labelColor)} />
                    <span className="text-xs font-bold text-slate-200">{title}</span>
                </div>
                <span className={cn("text-[11px] font-semibold mt-0.5", labelColor)}>
                    {validPercent === 100 ? '100% Verified Profile' : `${missingFields.length} missing detail${missingFields.length === 1 ? '' : 's'}`}
                </span>
            </div>

            {/* Missing Fields Popover */}
            {showPopover && (
                <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 text-xs animate-in fade-in slide-in-from-top-1">
                    <div className="flex justify-between items-center pb-2 mb-2 border-b border-white/10">
                        <span className="font-bold text-slate-200">Missing Profile Information</span>
                        <button onClick={(e) => { e.stopPropagation(); setShowPopover(false); }} className="text-slate-400 hover:text-white">✕</button>
                    </div>
                    {missingFields.length > 0 ? (
                        <ul className="space-y-1.5 text-slate-300">
                            {missingFields.map((field, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-[11px]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                    {field}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-emerald-400 text-[11px] font-medium">All mandatory and recommended details have been provided!</p>
                    )}
                </div>
            )}
        </div>
    );
};
