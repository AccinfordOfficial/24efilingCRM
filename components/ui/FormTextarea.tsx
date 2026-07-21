import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { cn } from '../../lib/utils';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    error?: string;
    registration?: Partial<UseFormRegisterReturn>;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
    ({ label, error, registration, className, ...props }, ref) => {
        return (
            <div className="space-y-1 w-full">
                <label className="block text-sm font-medium text-slate-700">
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
                <textarea
                    className={cn(
                        "flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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

FormTextarea.displayName = 'FormTextarea';
export default FormTextarea;
