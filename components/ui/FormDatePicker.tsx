import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { Input } from './Input';
import { cn } from '../../lib/utils';

interface FormDatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    registration?: Partial<UseFormRegisterReturn>;
}

export const FormDatePicker = React.forwardRef<HTMLInputElement, FormDatePickerProps>(
    ({ label, error, registration, className, ...props }, ref) => {
        return (
            <div className="space-y-1 w-full">
                <label className="block text-sm font-medium text-slate-700">
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
                <Input
                    type="date"
                    className={cn(
                        error ? 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500' : 'border-slate-300',
                        className
                    )}
                    ref={ref}
                    {...registration}
                    {...props}
                />
                {error && (
                    <p className="text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

FormDatePicker.displayName = 'FormDatePicker';
export default FormDatePicker;
