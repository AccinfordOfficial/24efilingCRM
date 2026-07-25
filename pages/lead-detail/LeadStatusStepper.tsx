import React from 'react';
import { Lead } from '../../types';
import { CheckCircleIcon } from '../../components/icons';

const WORKFLOW_STAGES: Lead['status'][] = ['New Lead', 'Lead Confirmed', 'Documents & Payments', 'In-Progress', 'Success'];

interface LeadStatusStepperProps {
    currentStatus: Lead['status'];
    onStatusChange: (newStatus: Lead['status']) => void;
}

export const LeadStatusStepper: React.FC<LeadStatusStepperProps> = ({ currentStatus, onStatusChange }) => {
    const currentIndex = WORKFLOW_STAGES.indexOf(currentStatus);

    return (
        <div className="flex items-start justify-center pt-2">
            {WORKFLOW_STAGES.map((status, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isUpcoming = index > currentIndex;

                return (
                    <React.Fragment key={status}>
                        <div className="flex flex-col items-center group">
                            <button
                                disabled={!isUpcoming}
                                onClick={() => onStatusChange(status)}
                                className={`relative h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                                    isCurrent ? 'border-primary bg-background dark:bg-slate-900 scale-110 shadow-lg' :
                                        'border-slate-300 dark:border-white/20 bg-background dark:bg-slate-900 group-hover:border-primary'
                                    } ${isUpcoming ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                                {isCompleted ? <CheckCircleIcon className="h-5 w-5" /> :
                                    isCurrent ? <div className="h-3 w-3 rounded-full bg-primary"></div> :
                                        <span className="text-slate-400 dark:text-slate-500 font-semibold">{index + 1}</span>}
                            </button>
                            <p className={`mt-2 text-xs text-center w-24 ${isCompleted ? 'text-slate-600 dark:text-slate-400' :
                                isCurrent ? 'font-semibold text-primary' :
                                    'text-slate-500 dark:text-slate-400'
                                }`}>{status}</p>
                        </div>
                        {index < WORKFLOW_STAGES.length - 1 && (
                            <div className={`flex-1 h-0.5 mt-4 ${isCompleted || isCurrent ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-800'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};
export { WORKFLOW_STAGES };
