import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { Input } from './Input';
import { cn } from '../../lib/utils';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    registration?: Partial<UseFormRegisterReturn>;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
    ({ label, error, registration, className, ...props }, ref) => {
        return (
            <div className="space-y-1 w-full">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
                <Input
                    className={cn(
                        'bg-background dark:bg-slate-950/60 border-input dark:border-white/10 text-foreground dark:text-white',
                        error ? 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500' : '',
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

FormField.displayName = 'FormField';
export default FormField;
