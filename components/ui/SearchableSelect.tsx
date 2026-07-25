import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, CheckCircleIcon } from '../icons';
import { Input } from './Input';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select...', 
  disabled = false, 
  error = false,
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    const found = (options || []).find(opt => opt && String(opt.value) === String(value));
    if (found) return found.label;
    if (!value || value === '') return placeholder;
    return placeholder || (options && options[0] ? options[0].label : '');
  }, [value, options, placeholder]);

  const filteredOptions = useMemo(() => {
    if (!query) return options || [];
    return (options || []).filter(opt =>
      opt && opt.label && String(opt.label).toLowerCase().includes(query.toLowerCase())
    );
  }, [query, options]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className={`relative w-full ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={selectRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-10 w-full items-center justify-between rounded-lg border bg-background dark:bg-slate-950/60 border-input dark:border-white/10 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 text-left ${
          error ? 'border-red-500 focus:ring-red-500' : ''
        }`}
      >
        <span className={`truncate ${(!value || value === '') ? 'text-muted-foreground' : 'text-foreground dark:text-slate-200'}`}>{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-[9999] mt-1 w-full rounded-md bg-slate-900 text-popover-foreground border border-slate-200 dark:border-white/10 shadow-2xl max-h-60 flex flex-col">

          <div className="p-2 border-b border-border dark:border-white/5 bg-transparent">
            <Input
              type="text"
              placeholder="Search..."
              className="h-8 dark:bg-slate-950/50 dark:border-white/10 dark:text-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="overflow-y-auto py-1 flex-1 bg-transparent">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-accent dark:hover:bg-white/5 cursor-pointer ${
                    option.value === value ? 'bg-accent/50 dark:bg-white/10 font-semibold text-primary' : 'text-foreground dark:text-slate-300'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <CheckCircleIcon className="h-4 w-4 text-primary" />}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-muted-foreground text-center">No results found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
