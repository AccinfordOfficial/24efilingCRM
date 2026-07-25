import React, { useState, useMemo, useEffect, useRef } from 'react';
import { COUNTRIES } from '../../constants';

interface SearchableCountrySelectProps {
    id: string;
    value: string;
    onChange: (code: string) => void;
    disabled?: boolean;
    error?: boolean;
}

export const SearchableCountrySelect: React.FC<SearchableCountrySelectProps> = ({ id, value, onChange, disabled, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedCountry = COUNTRIES.find(c => c.code === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCountries = useMemo(() => {
        if (!searchTerm) return COUNTRIES;
        return COUNTRIES.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm]);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex h-10 w-full items-center justify-between rounded-md border border-input dark:border-white/10 bg-background dark:bg-slate-950 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-slate-900 dark:text-white text-left cursor-pointer transition-colors ${
                    error ? 'border-red-500 focus:ring-red-500' : ''
                }`}
            >
                <span className={selectedCountry ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-slate-400'}>
                    {selectedCountry ? `${selectedCountry.name} (${selectedCountry.code})` : 'Select Country...'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && !disabled && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-2xl backdrop-blur-md">
                    <div className="p-2 border-b border-slate-100 dark:border-white/10">
                        <input
                            type="text"
                            placeholder="Search country..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input dark:border-white/10 bg-background dark:bg-slate-900 px-3 py-1 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                        />
                    </div>
                    <ul className="max-h-60 overflow-y-auto py-1 text-sm text-slate-800 dark:text-slate-200 divide-y divide-slate-100 dark:divide-white/5">
                        {filteredCountries.length > 0 ? (
                            filteredCountries.map(c => (
                                <li
                                    key={c.code}
                                    onClick={() => {
                                        onChange(c.code);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`cursor-pointer select-none px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-between transition-colors ${
                                        value === c.code ? 'bg-primary/10 dark:bg-primary/20 font-bold text-primary dark:text-white' : ''
                                    }`}
                                >
                                    <span>{c.name}</span>
                                    <span className="text-xs text-slate-400 font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">{c.code}</span>
                                </li>
                            ))
                        ) : (
                            <li className="px-3 py-3 text-slate-400 text-center">No country found</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};
