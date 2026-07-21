import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { Select } from './Select';
import { cn } from '../../lib/utils';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    error?: string;
    registration?: Partial<UseFormRegisterReturn>;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
    ({ label, error, registration, className, children, ...props }, ref) => {
        return (
            <div className="space-y-1 w-full">
                <label className="block text-sm font-medium text-slate-700">
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
                <Select
                    className={cn(
                        error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-300',
                        className
                    )}
                    ref={ref}
                    {...registration}
                    {...props}
                >
                    {children}
                </Select>
                {error && (
                    <p className="text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

FormSelect.displayName = 'FormSelect';
export default FormSelect;
