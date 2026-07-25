import React from 'react';
import { cn } from '../../lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
  className?: string; // Add className prop for flexibility
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, onCheckedChange, id, className }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e.target.checked);
    if (onCheckedChange) onCheckedChange(e.target.checked);
  };

  return (
    <label htmlFor={id} className={cn("inline-flex items-center cursor-pointer", className)}>
      <input id={id} type="checkbox" checked={checked} onChange={handleChange} className="sr-only peer" />
      <div className="relative w-11 h-6 bg-input rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-background"></div>
    </label>
  );
};