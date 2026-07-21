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
    const found = options.find(opt => opt.value === value);
    if (found) return found.label;
    return placeholder || options[0]?.label || '';
  }, [value, options, placeholder]);

  const filteredOptions = useMemo(() => {
    if (!query) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(query.toLowerCase())
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
    <div className={`relative w-full ${className}`} ref={selectRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white dark:bg-slate-950/60 border-slate-300 dark:border-white/10 px-3 py-2 text-sm ring-offset-white dark:ring-offset-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1c398e] dark:focus:ring-primary/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 text-left ${
          error ? 'border-red-500 focus:ring-red-500' : ''
        }`}
      >
        <span className={`truncate ${(!value || value === '') ? 'text-slate-400' : 'text-slate-900 dark:text-slate-200'}`}>{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
 
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md bg-white dark:bg-slate-900 border dark:border-white/10 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-white/5 max-h-60 flex flex-col">
          <div className="p-2 border-b dark:border-white/5 bg-transparent">
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
                  className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer ${
                    option.value === value ? 'bg-slate-50 dark:bg-white/10 font-semibold text-[#1c398e] dark:text-primary' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <CheckCircleIcon className="h-4 w-4 text-[#1c398e] dark:text-primary" />}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-slate-500 text-center">No results found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
