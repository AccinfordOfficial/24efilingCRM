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
                className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1c398e] disabled:cursor-not-allowed disabled:opacity-50 text-left ${
                    error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300'
                }`}
            >
                <span className={selectedCountry ? 'text-slate-900' : 'text-slate-400'}>
                    {selectedCountry ? `${selectedCountry.name} (${selectedCountry.code})` : 'Select Country...'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 opacity-50">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && !disabled && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                    <div className="p-2 border-b border-slate-100">
                        <input
                            type="text"
                            placeholder="Search country..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex h-8 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm outline-none focus:border-[#1c398e]"
                            autoFocus
                        />
                    </div>
                    <ul className="max-h-60 overflow-y-auto py-1 text-sm text-slate-700">
                        {filteredCountries.length > 0 ? (
                            filteredCountries.map(c => (
                                <li
                                    key={c.code}
                                    onClick={() => {
                                        onChange(c.code);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`cursor-pointer select-none px-3 py-2 hover:bg-slate-100 flex items-center justify-between ${
                                        value === c.code ? 'bg-slate-50 font-semibold text-[#1c398e]' : ''
                                    }`}
                                >
                                    <span>{c.name}</span>
                                    <span className="text-xs text-slate-400 font-mono">{c.code}</span>
                                </li>
                            ))
                        ) : (
                            <li className="px-3 py-2 text-slate-400 text-center">No country found</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};
