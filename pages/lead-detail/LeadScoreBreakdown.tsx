import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { TargetIcon } from '../../components/icons';

interface LeadScoreBreakdownProps {
    score: number;
    scoreInfo: {
        category: string;
        color: string;
        textColor: string;
    };
    scoreBreakdown: Array<{
        label: string;
        points: string;
    }>;
}

export const LeadScoreBreakdown: React.FC<LeadScoreBreakdownProps> = ({ score, scoreInfo, scoreBreakdown }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TargetIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    Lead Score
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center mb-4">
                    <p className="text-5xl font-bold text-slate-900 dark:text-white">{score}</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${scoreInfo.color} ${scoreInfo.textColor}`}>
                        {scoreInfo.category} Lead
                    </span>
                </div>
                <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
                    {scoreBreakdown.map(item => (
                        <li key={item.label} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-white/10 last:border-b-0">
                            <span>{item.label}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{item.points}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};
