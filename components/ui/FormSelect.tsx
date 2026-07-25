import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { Select } from './Select';
import { cn } from '../../lib/utils';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    error?: string;
    registration?: Partial<UseFormRegisterReturn>;
    options?: { value: string, label: string }[];
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
    ({ label, error, registration, className, children, options, ...props }, ref) => {
        return (
            <div className="space-y-1 w-full text-slate-900 dark:text-slate-200">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
                <Select
                    className={cn(
                        'bg-background dark:bg-slate-950/60 border-input dark:border-white/10 text-foreground dark:text-white text-xs focus:ring-ring focus:border-ring',
                        error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '',
                        className
                    )}

                    ref={ref}
                    {...registration}
                    {...props}
                >
                    {options ? options.map((opt: any, idx: number) => {
                        let valStr = '';
                        let lblStr = '';

                        if (typeof opt === 'string' || typeof opt === 'number') {
                            valStr = String(opt);
                            lblStr = String(opt);
                        } else if (opt && typeof opt === 'object') {
                            if (typeof opt.value === 'object' && opt.value !== null) {
                                valStr = String(opt.value.value || opt.value.label || idx);
                            } else {
                                valStr = String(opt.value !== undefined ? opt.value : (opt.label || idx));
                            }

                            if (typeof opt.label === 'object' && opt.label !== null) {
                                lblStr = String(opt.label.label || opt.label.value || valStr);
                            } else {
                                lblStr = String(opt.label !== undefined ? opt.label : valStr);
                            }
                        } else {
                            valStr = String(idx);
                            lblStr = String(opt);
                        }

                        return (
                            <option key={`opt-${idx}-${valStr}`} value={valStr} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                {lblStr}
                            </option>
                        );
                    }) : children}


                </Select>
                {error && (
                    <p className="text-[10px] text-red-500 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

FormSelect.displayName = 'FormSelect';
export default FormSelect;
