
// pages/CreateLead.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Lead, LeadPriority, ServiceSet, User, Service, Offer } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { UserIcon, BriefcaseIcon, TargetIcon, PlusCircleIcon, CheckCircleIcon, Trash2Icon, PlusIcon, MailIcon } from '../components/icons';
import { LEAD_SOURCES, LEAD_PRIORITIES, BUSINESS_CATEGORIES, INDUSTRY_TYPES, COUNTRIES } from '../constants';
import { useApi } from '../hooks/useApi';
import { Badge } from '../components/ui/Badge';
import { InvoicePreview } from '../components/InvoicePreview';
import { supabase } from '../lib/supabaseClient';
import { getNextPaymentSequenceClientSide, formatPaymentReferenceId } from '../lib/paymentUtils';
import { SearchableSelect } from '../components/ui/SearchableSelect';

interface CreateLeadProps {
    onAddLead: (lead: Omit<Lead, 'id' | 'created_at' | 'last_contacted' | 'status' | 'assigned_to' | 'service_requested'>, assignedToId: string | null) => void;
    onCancel: () => void;
    salesExecutives: User[];
    services: Service[];
    leads: Lead[];
    offers: Offer[];
}

interface SearchableCountrySelectProps {
    id: string;
    value: string;
    onChange: (code: string) => void;
    disabled?: boolean;
    error?: boolean;
}

const SearchableCountrySelect: React.FC<SearchableCountrySelectProps> = ({ id, value, onChange, disabled, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

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

const formatAddress = (addr: {
    flatNo: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
}) => {
    const countryName = COUNTRIES.find(c => c.code === addr.country)?.name || addr.country;
    const parts = [
        addr.flatNo,
        addr.street,
        addr.city,
        addr.state,
        countryName,
        addr.zipCode
    ].map(p => (p || '').trim()).filter(Boolean);
    return parts.join(', ');
};

interface StructuredAddress {
    flatNo: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
}

const initialAddressState: StructuredAddress = {
    flatNo: '',
    street: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
};

const CreateLead: React.FC<CreateLeadProps> = ({ onAddLead, onCancel, salesExecutives, services, leads, offers }) => {
    const { leadSources, customers: allCustomers, users: allUsers } = useApi();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        pan_number: '',
        business_name: '',
        business_category: '',
        industry_type: '',
        residential_address: '',
        business_address: '',
        source: 'Other',
        referred_by_customer_id: '',
        referred_by_employee_id: '',
        priority: LeadPriority.WARM,
        notes: '',
        created_at: new Date().toISOString().split('T')[0], // Default to today
    });

    const [businessErrors, setBusinessErrors] = useState({
        business_name: '',
        business_category: '',
        industry_type: '',
    });
    const [assignedToId, setAssignedToId] = useState<string>('HEAD_OFFICE');
    const [isSameAddress, setIsSameAddress] = useState(false);
    const [alternateMobile, setAlternateMobile] = useState<string>('');
    const [alternateIsWhatsapp, setAlternateIsWhatsapp] = useState<boolean>(false);
    const [advanceAmount, setAdvanceAmount] = useState<number>(0);
    const [panError, setPanError] = useState<string>('');
    const [refNumber, setRefNumber] = useState<string>('');

    // Structured Address States
    const [personalAddress, setPersonalAddress] = useState<StructuredAddress>(initialAddressState);
    const [businessAddress, setBusinessAddress] = useState<StructuredAddress>(initialAddressState);
    const [addressErrors, setAddressErrors] = useState<{
        personal: Partial<Record<keyof StructuredAddress, string>>;
        business: Partial<Record<keyof StructuredAddress, string>>;
    }>({
        personal: {},
        business: {},
    });

    useEffect(() => {
        let isMounted = true;
        const fetchRefNumber = async () => {
            const currentYear = new Date(formData.created_at).getFullYear() || new Date().getFullYear();
            try {
                const { data, error } = await (supabase as any).from('payment_sequences').select('current_sequence').eq('year', currentYear).maybeSingle();
                if (!error && data && isMounted) {
                    const currentSeq = (data as any).current_sequence || 0;
                    setRefNumber(`E-${String(currentSeq + 1).padStart(3, '0')}-${currentYear}`);
                    return;
                }
            } catch (e) {
                console.warn("Could not fetch sequence from table:", e);
            }
            if (isMounted) {
                const seqVal = leads.length + 1;
                setRefNumber(`E-${String(seqVal).padStart(3, '0')}-${currentYear}`);
            }
        };
        fetchRefNumber();
        return () => {
            isMounted = false;
        };
    }, [leads, formData.created_at]);

    const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    const activeServices = useMemo(() => (services || []).filter(s => s.is_active), [services]);

    const autoPromoForService = (serviceName: string) => {
        const matchedService = activeServices.find(s => s.name === serviceName);
        const todayStr = new Date().toISOString().split('T')[0];
        const serviceOffers = (offers || []).filter(o => {
            if (o.status !== 'active') return false;
            if (todayStr > o.end_date) return false;
            if (o.max_usage !== undefined && o.max_usage !== null && o.usage_count >= o.max_usage) return false;
            if (o.service_id && o.service_id !== matchedService?.id) return false;
            return true;
        });
        return serviceOffers.length > 0 ? serviceOffers[0] : null;
    };

    const recalculateDiscounts = (sets: ServiceSet[]): ServiceSet[] => {
        const todayStr = new Date().toISOString().split('T')[0];
        return sets.map(set => {
            if (!set.promo_code) {
                return set;
            }
            
            const matchedOffer = (offers || []).find(o => o.promo_code.toUpperCase() === set.promo_code!.toUpperCase());
            if (!matchedOffer) {
                return { ...set, discount: 0, promo_code: '', promo_discount_type: undefined, promo_discount_value: undefined };
            }
            
            const serviceObj = activeServices.find(s => s.name === set.mainService);
            const isEligible = matchedOffer.status === 'active' && 
                               todayStr <= matchedOffer.end_date &&
                               (!matchedOffer.service_id || matchedOffer.service_id === serviceObj?.id) &&
                               (matchedOffer.max_usage === undefined || matchedOffer.max_usage === null || matchedOffer.usage_count < matchedOffer.max_usage);
                               
            if (!isEligible) {
                return { ...set, discount: 0, promo_code: '', promo_discount_type: undefined, promo_discount_value: undefined };
            }

            const subservicesTotal = set.subservices.reduce((acc, sub) => acc + (sub.amount * sub.quantity), 0);
            const serviceFee = Number(set.service_fee) || 0;
            const subtotalBeforeDiscount = subservicesTotal + serviceFee;

            let discountVal = 0;
            if (matchedOffer.discount_type === 'percentage') {
                discountVal = Math.round((subtotalBeforeDiscount * matchedOffer.discount_value) / 100);
            } else {
                discountVal = matchedOffer.discount_value;
            }

            if (discountVal > subtotalBeforeDiscount) {
                discountVal = subtotalBeforeDiscount;
            }

            return {
                ...set,
                discount: discountVal,
                promo_discount_type: matchedOffer.discount_type,
                promo_discount_value: matchedOffer.discount_value
            };
        });
    };

    const [serviceSets, setServiceSets] = useState<ServiceSet[]>([
        { id: `set - ${Date.now()} `, mainService: activeServices.length > 0 ? activeServices[0].name : '', subservices: [], advance_amount: 0 }
    ]);

    // State for Payment Section
    const [selectedServiceIdForPayment, setSelectedServiceIdForPayment] = useState<string>('');
    const [tempAdvanceAmount, setTempAdvanceAmount] = useState<number | string>('');
    const [tempPaymentMode, setTempPaymentMode] = useState<string>('Cash');

    // Initialize/Reset selected service for payment when serviceSets change
    useEffect(() => {
        if (serviceSets.length > 0 && !selectedServiceIdForPayment) {
            setSelectedServiceIdForPayment(serviceSets[0].id);
            setTempAdvanceAmount(serviceSets[0].advance_amount || 0);
            setTempPaymentMode(serviceSets[0].payment_mode || 'Cash');
        } else if (serviceSets.length > 0 && selectedServiceIdForPayment) {
             // If currently selected service still exists, make sure temp amount reflects it if it wasn't modified yet? 
             // Actually better to just sync when selection changes.
             const exists = serviceSets.find(s => s.id === selectedServiceIdForPayment);
             if (!exists) {
                 setSelectedServiceIdForPayment(serviceSets[0].id);
                 setTempAdvanceAmount(serviceSets[0].advance_amount || 0);
                 setTempPaymentMode(serviceSets[0].payment_mode || 'Cash');
             }
        }
    }, [serviceSets, selectedServiceIdForPayment]);

    const handlePaymentServiceSelectionChange = (setId: string) => {
        setSelectedServiceIdForPayment(setId);
        const set = serviceSets.find(s => s.id === setId);
        if (set) {
            setTempAdvanceAmount(set.advance_amount || 0);
            setTempPaymentMode(set.payment_mode || 'Cash');
        }
    };

    const handleUpdateAdvanceAmount = () => {
        if (!selectedServiceIdForPayment) return;
        setServiceSets(prev => prev.map(s => s.id === selectedServiceIdForPayment ? { ...s, advance_amount: Number(tempAdvanceAmount) || 0, payment_mode: tempPaymentMode } : s));
    };

    // Update initial service set if data loads later
    useEffect(() => {
        if (serviceSets.length === 1 && serviceSets[0].mainService === '' && activeServices.length > 0) {
            const defaultService = activeServices[0].name;
            const promo = autoPromoForService(defaultService);
            setServiceSets([{
                ...serviceSets[0],
                mainService: defaultService,
                promo_code: promo ? promo.promo_code : '',
                promo_discount_type: promo ? promo.discount_type : undefined,
                promo_discount_value: promo ? promo.discount_value : undefined,
                discount: 0
            }]);
        }
    }, [activeServices, serviceSets]);

    const personalAddressStr = useMemo(() => formatAddress(personalAddress), [personalAddress]);
    const businessAddressStr = useMemo(() => formatAddress(businessAddress), [businessAddress]);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            residential_address: personalAddressStr,
            business_address: businessAddressStr
        }));
    }, [personalAddressStr, businessAddressStr]);

    const grandTotal = useMemo(() => {
        return serviceSets.reduce((total, set) => {
            const setTotal = set.subservices.reduce((subTotal, sub) => subTotal + ((Number(sub.amount) || 0) * (Number(sub.quantity) || 1)) + (Number(sub.tax_amount) || 0), 0);
            return total + setTotal + (Number(set.service_fee) || 0) - (Number(set.discount) || 0); // Include Service Fee and Discount
        }, 0);
    }, [serviceSets]);

    const totalAdvance = useMemo(() => {
        return serviceSets.reduce((total, set) => total + (Number(set.advance_amount) || 0), 0);
    }, [serviceSets]);

    const remainingAmount = grandTotal - totalAdvance;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (!name) return;
        
        if (name === 'pan_number') {
            const upperValue = value.toUpperCase();
            // Basic format validation for immediate feedback
            if (upperValue && !/^[A-Z0-9]*$/.test(upperValue)) {
                 // Don't update if invalid chars are typed
                 return;
            }
            // Strict regex test for error message
            if (value && value.length === 10 && !PAN_REGEX.test(upperValue)) {
                setPanError('Invalid PAN format (e.g., ABCDE1234F)');
            } else if (value.length > 10) {
                 return; // Limit length
            } else {
                setPanError('');
            }
            setFormData(prev => ({ ...prev, [name]: upperValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePersonalAddressChange = (field: keyof StructuredAddress, value: string) => {
        setPersonalAddress(prev => {
            const updated = { ...prev, [field]: value };
            if (isSameAddress) {
                setBusinessAddress(updated);
            }
            return updated;
        });
        setAddressErrors(prev => ({
            ...prev,
            personal: { ...prev.personal, [field]: '' }
        }));
    };

    const handleBusinessAddressChange = (field: keyof StructuredAddress, value: string) => {
        setBusinessAddress(prev => ({ ...prev, [field]: value }));
        setAddressErrors(prev => ({
            ...prev,
            business: { ...prev.business, [field]: '' }
        }));
    };

    const handleSameAddressChange = (checked: boolean) => {
        setIsSameAddress(checked);
        if (checked) {
            setBusinessAddress(personalAddress);
            setAddressErrors(prev => ({ ...prev, business: {} }));
        }
    };

    const handleAddServiceSet = () => {
        const defaultService = activeServices.length > 0 ? activeServices[0].name : '';
        const promo = autoPromoForService(defaultService);
        setServiceSets(prev => recalculateDiscounts([...prev, {
            id: `set-${Date.now()}`,
            mainService: defaultService,
            subservices: [],
            advance_amount: 0,
            promo_code: promo ? promo.promo_code : '',
            promo_discount_type: promo ? promo.discount_type : undefined,
            promo_discount_value: promo ? promo.discount_value : undefined,
            discount: 0
        }]));
    };

    const handleRemoveServiceSet = (setId: string) => {
        setServiceSets(prev => prev.filter(s => s.id !== setId));
    };

    const handleRemovePromoCode = (setId: string) => {
        setServiceSets(prev => prev.map(s => {
            if (s.id === setId) {
                return {
                    ...s,
                    discount: 0,
                    promo_code: '',
                    promo_discount_type: undefined,
                    promo_discount_value: undefined
                };
            }
            return s;
        }));
    };

    const handleApplyPromoCodeWithCode = (setId: string, codeToApply: string) => {
        const set = serviceSets.find(s => s.id === setId);
        if (!set) return;

        const matchedOffer = (offers || []).find(o => o.promo_code.toUpperCase() === codeToApply.toUpperCase());
        if (!matchedOffer) return;

        const subservicesTotal = set.subservices.reduce((acc, sub) => acc + (sub.amount * sub.quantity), 0);
        const serviceFee = Number(set.service_fee) || 0;
        const subtotalBeforeDiscount = subservicesTotal + serviceFee;

        let discountVal = 0;
        if (matchedOffer.discount_type === 'percentage') {
            discountVal = Math.round((subtotalBeforeDiscount * matchedOffer.discount_value) / 100);
        } else {
            discountVal = matchedOffer.discount_value;
        }

        if (discountVal > subtotalBeforeDiscount) {
            discountVal = subtotalBeforeDiscount;
        }

        setServiceSets(prev => prev.map(s => {
            if (s.id === setId) {
                return {
                    ...s,
                    discount: discountVal,
                    promo_code: matchedOffer.promo_code,
                    promo_discount_type: matchedOffer.discount_type,
                    promo_discount_value: matchedOffer.discount_value
                };
            }
            return s;
        }));
    };

    const handleApplyPromoCode = (setId: string) => {
        const set = serviceSets.find(s => s.id === setId);
        if (!set) return;
        
        const code = (set.promo_code || '').trim().toUpperCase();
        if (!code) return;

        const matchedOffer = (offers || []).find(o => o.promo_code.toUpperCase() === code);
        if (!matchedOffer) {
            alert("Invalid Promo Code.");
            return;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        if (matchedOffer.status !== 'active' || todayStr > matchedOffer.end_date) {
            alert("This promo code has expired or is inactive.");
            return;
        }

        if (matchedOffer.max_usage !== undefined && matchedOffer.max_usage !== null && matchedOffer.usage_count >= matchedOffer.max_usage) {
            alert("This promo code has reached its maximum usage limit.");
            return;
        }

        const serviceObj = activeServices.find(s => s.name === set.mainService);
        if (matchedOffer.service_id && matchedOffer.service_id !== serviceObj?.id) {
            alert(`This promo code is only valid for the "${activeServices.find(s => s.id === matchedOffer.service_id)?.name}" service.`);
            return;
        }

        const subservicesTotal = set.subservices.reduce((acc, sub) => acc + (sub.amount * sub.quantity), 0);
        const serviceFee = Number(set.service_fee) || 0;
        const subtotalBeforeDiscount = subservicesTotal + serviceFee;

        let discountVal = 0;
        if (matchedOffer.discount_type === 'percentage') {
            discountVal = Math.round((subtotalBeforeDiscount * matchedOffer.discount_value) / 100);
        } else {
            discountVal = matchedOffer.discount_value;
        }

        if (discountVal > subtotalBeforeDiscount) {
            discountVal = subtotalBeforeDiscount;
        }

        setServiceSets(prev => prev.map(s => {
            if (s.id === setId) {
                return {
                    ...s,
                    discount: discountVal,
                    promo_code: matchedOffer.promo_code,
                    promo_discount_type: matchedOffer.discount_type,
                    promo_discount_value: matchedOffer.discount_value
                };
            }
            return s;
        }));

        alert(`Success! Applied promo code "${matchedOffer.name}" for a discount of ₹${discountVal.toLocaleString('en-IN')}.`);
    };

    const getAvailableOffers = (mainServiceName: string) => {
        const serviceObj = activeServices.find(s => s.name === mainServiceName);
        const todayStr = new Date().toISOString().split('T')[0];

        return (offers || []).filter(o => {
            if (o.status !== 'active') return false;
            if (todayStr > o.end_date) return false;
            if (o.max_usage !== undefined && o.max_usage !== null && o.usage_count >= o.max_usage) return false;
            if (o.service_id && o.service_id !== serviceObj?.id) return false;
            return true;
        });
    };

    const handleSetChange = (setId: string, field: 'mainService' | 'promo_code', value: string) => {
        setServiceSets(prev => recalculateDiscounts(prev.map(s => {
            if (s.id === setId) {
                if (field === 'mainService') {
                    const promo = autoPromoForService(value);
                    return {
                        ...s,
                        mainService: value,
                        subservices: [],
                        promo_code: promo ? promo.promo_code : '',
                        discount: 0,
                        promo_discount_type: promo ? promo.discount_type : undefined,
                        promo_discount_value: promo ? promo.discount_value : undefined
                    };
                }
                if (field === 'promo_code') return { ...s, promo_code: value };
            }
            return s;
        })));
    };

    const handleAddSubservice = (setId: string, subserviceName: string) => {
        if (!subserviceName) return;

        // Find price
        const set = serviceSets.find(s => s.id === setId);
        if (!set) return;

        const mainServiceObj = activeServices.find(s => s.name === set.mainService);
        const subServiceObj = mainServiceObj?.sub_services?.find(sub => sub.name === subserviceName);
        const price = subServiceObj ? subServiceObj.price : 0;

        setServiceSets(prev => recalculateDiscounts(prev.map(set => {
            if (set.id === setId && !set.subservices.some(s => s.name === subserviceName)) {
                return { ...set, subservices: [...set.subservices, { name: subserviceName, quantity: 1, amount: price, is_tax_applicable: false, tax_amount: 0 }] };
            }
            return set;
        })));
    };

    const handleRemoveSubservice = (setId: string, subserviceNameToRemove: string) => {
        setServiceSets(prev => recalculateDiscounts(prev.map(set => {
            if (set.id === setId) {
                return { ...set, subservices: set.subservices.filter(s => s.name !== subserviceNameToRemove) };
            }
            return set;
        })));
    };

    // setId + subserviceName used to find and update; value is string from input -> convert to number safely
    const handleSubserviceDetailChange = (setId: string, subserviceName: string, field: 'quantity' | 'amount' | 'is_tax_applicable' | 'tax_amount', value: string) => {
        setServiceSets(prev => recalculateDiscounts(prev.map(set => {
            if (set.id === setId) {
                return {
                    ...set,
                    subservices: set.subservices.map(sub => {
                        if (sub.name === subserviceName) {
                            if (field === 'is_tax_applicable') {
                                return { ...sub, is_tax_applicable: value === 'true', tax_amount: value === 'false' ? 0 : sub.tax_amount };
                            }
                            const numeric = value === '' ? 0 : Number(value);
                            if (isNaN(numeric)) return sub;
                            return { ...sub, [field]: numeric };
                        }
                        return sub;
                    })
                };
            }
            return set;
        })));

    };

    const handleServiceFeeChange = (setId: string, value: string) => {
        const fee = value === '' ? 0 : Number(value);
        setServiceSets(prev => recalculateDiscounts(prev.map(s => s.id === setId ? { ...s, service_fee: fee } : s)));
    };

    const handleDiscountChange = (setId: string, value: string) => {
        const discount = value === '' ? 0 : Number(value);
        setServiceSets(prev => recalculateDiscounts(prev.map(s => s.id === setId ? { ...s, discount: discount } : s)));
    };

    const getSubServicesForSelection = (mainServiceName: string) => {
        const service = activeServices.find(s => s.name === mainServiceName);
        if (!service || !service.sub_services) return [];
        return service.sub_services.filter(sub => sub.is_active).map(sub => sub.name);
    };

    const handleSetAdvanceAmountChange = (setId: string, value: string) => {
        const amount = value === '' ? 0 : Number(value);
        setServiceSets(prev => prev.map(s => s.id === setId ? { ...s, advance_amount: amount } : s));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate Business Information
        const newBusinessErrors = {
            business_name: !formData.business_name?.trim() ? 'Business Name is mandatory' : '',
            business_category: !formData.business_category?.trim() ? 'Business Category is mandatory' : '',
            industry_type: !formData.industry_type?.trim() ? 'Industry Type is mandatory' : '',
        };

        if (newBusinessErrors.business_name || newBusinessErrors.business_category || newBusinessErrors.industry_type) {
            setBusinessErrors(newBusinessErrors);
            const firstErrorEl = document.querySelector('.border-red-500');
            if (firstErrorEl) {
                firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        } else {
            setBusinessErrors({ business_name: '', business_category: '', industry_type: '' });
        }

        // Validate PAN before submission
        if (formData.pan_number && !PAN_REGEX.test(formData.pan_number)) {
            setPanError('Please enter a valid PAN number before creating the lead.');
            return;
        }

        // Validate Address fields
        const newAddressErrors = {
            personal: {} as Partial<Record<keyof StructuredAddress, string>>,
            business: {} as Partial<Record<keyof StructuredAddress, string>>
        };
        let hasAddressError = false;

        const validateAddr = (addr: StructuredAddress, key: 'personal' | 'business') => {
            if (!addr.country) {
                newAddressErrors[key].country = 'Country is mandatory';
                hasAddressError = true;
            }
            if (!addr.street?.trim()) {
                newAddressErrors[key].street = 'Street Address is mandatory';
                hasAddressError = true;
            }
            if (!addr.city?.trim()) {
                newAddressErrors[key].city = 'City is mandatory';
                hasAddressError = true;
            }
            if (!addr.state?.trim()) {
                newAddressErrors[key].state = 'State/Province is mandatory';
                hasAddressError = true;
            }
            if (!addr.zipCode?.trim()) {
                newAddressErrors[key].zipCode = 'ZIP/Postal Code is mandatory';
                hasAddressError = true;
            }
        };

        validateAddr(personalAddress, 'personal');
        if (!isSameAddress) {
            validateAddr(businessAddress, 'business');
        }

        if (hasAddressError) {
            setAddressErrors(newAddressErrors);
            const firstErrorEl = document.querySelector('.border-red-500');
            if (firstErrorEl) {
                firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Determine creation date (Backdated or Current)
        const leadCreationDate = formData.created_at 
            ? new Date(`${formData.created_at}T${new Date().toTimeString().split(' ')[0]}`).toISOString() 
            : new Date().toISOString();
        
        const currentYear = new Date(leadCreationDate).getFullYear();
        const activeSets = serviceSets.filter(set => (set.advance_amount || 0) > 0);
        
        const payments = [];
        for (let i = 0; i < activeSets.length; i++) {
            const set = activeSets[i];
            let nextSeq: number;
            try {
                const { data, error } = await (supabase.rpc as any)('generate_next_payment_sequence', { payment_year: currentYear });
                if (error || data === null) throw error || new Error("RPC returned null");
                nextSeq = Number(data);
            } catch (err) {
                console.warn("Postgres RPC not available, falling back to client-side sequence calculation", err);
                const clientSeq = getNextPaymentSequenceClientSide(leads, currentYear);
                nextSeq = clientSeq + i;
            }
            const receiptNumber = formatPaymentReferenceId(nextSeq, currentYear);
            payments.push({
                id: `pay-${Date.now()}-${i}`,
                amount: set.advance_amount || 0,
                date: leadCreationDate, // Sync payment date with lead creation date
                method: (set.payment_mode || 'Cash') as any,
                receipt_number: receiptNumber,
                notes: `Advance Payment for ${set.mainService}`,
                service_set_id: set.id,
                service_name: set.mainService
            });
        }

        const leadData = {
            ...formData,
            alternate_mobile: alternateMobile || undefined,
            alternate_is_whatsapp: alternateMobile ? alternateIsWhatsapp : undefined,
            service_sets: serviceSets,
            payments: payments, // Pass payments
            remaining_amount: remainingAmount, // Pass explicitly if needed (though calculated)
            advance_amount: totalAdvance,
            created_at: leadCreationDate,
            personal_flat_no: personalAddress.flatNo || null,
            personal_street: personalAddress.street || null,
            personal_city: personalAddress.city || null,
            personal_state: personalAddress.state || null,
            personal_country: personalAddress.country || null,
            personal_zip_code: personalAddress.zipCode || null,
            business_flat_no: businessAddress.flatNo || null,
            business_street: businessAddress.street || null,
            business_city: businessAddress.city || null,
            business_state: businessAddress.state || null,
            business_country: businessAddress.country || null,
            business_zip_code: businessAddress.zipCode || null,
        };
        onAddLead(leadData as any, assignedToId || null);
    };

    return (
        <div className="max-w-[95%] mx-auto space-y-8">
            <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-[#1c398e] to-blue-600 text-white flex items-center justify-center shadow-lg">
                    <PlusCircleIcon className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Create New Lead</h1>
                <p className="text-slate-500 mt-2">Fill in the details below to add a new lead to the system</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#1c398e]">
                                <UserIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Basic details about the lead.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="first_name" className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                <Input id="first_name" name="first_name" value={formData.first_name} onChange={handleChange} placeholder="e.g., John" />
                            </div>
                            <div>
                                <label htmlFor="last_name" className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                <Input id="last_name" name="last_name" value={formData.last_name} onChange={handleChange} placeholder="e.g., Doe" />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="e.g., john.doe@example.com" />
                            </div>
                            <div>
                                <label htmlFor="phone_number" className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                <Input id="phone_number" name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} placeholder="e.g., 9876543210" />
                            </div>
                            <div>
                                <label htmlFor="whatsapp_number" className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
                                <Input 
                                    id="pan_number" 
                                    name="pan_number" 
                                    value={formData.pan_number} 
                                    onChange={handleChange} 
                                    placeholder="e.g., ABCDE1234F" 
                                    className={panError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                />
                                {panError && <p className="text-xs text-red-500 mt-1">{panError}</p>}
                            </div>
                            <div>
                                <label htmlFor="alternate_mobile" className="block text-sm font-medium text-slate-700 mb-1">
                                    Alternate Mobile Number
                                </label>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                    <div className="flex-1">
                                        <Input
                                            id="alternate_mobile"
                                            name="alternate_mobile"
                                            type="tel"
                                            value={alternateMobile}
                                            onChange={(e) => setAlternateMobile(e.target.value)}
                                            placeholder="e.g., 9876543211"
                                        />
                                    </div>
                                    <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all select-none h-10 sm:w-48 shrink-0 ${alternateIsWhatsapp ? 'bg-green-50 border-green-400 text-green-700' : 'bg-slate-50 border-slate-300 text-slate-600'}`}
                                        onClick={() => setAlternateIsWhatsapp(prev => !prev)}
                                    >
                                        <input
                                            type="checkbox"
                                            id="alternateIsWhatsapp"
                                            checked={alternateIsWhatsapp}
                                            onChange={(e) => setAlternateIsWhatsapp(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <label htmlFor="alternateIsWhatsapp" className="text-sm font-medium cursor-pointer whitespace-nowrap flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`h-4 w-4 ${alternateIsWhatsapp ? 'text-green-600' : 'text-slate-400'}`}>
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                            </svg>
                                            WhatsApp Enabled
                                        </label>
                                    </div>
                                </div>
                                {alternateMobile && (
                                    <p className={`text-xs mt-1.5 font-medium ${alternateIsWhatsapp ? 'text-green-600' : 'text-slate-500'}`}>
                                        {alternateIsWhatsapp
                                            ? '✅ This alternate number is also a WhatsApp number.'
                                            : '📱 Alternate number saved as mobile-only (not WhatsApp).'}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                                <BriefcaseIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle>Business Information</CardTitle>
                                <CardDescription>Details about the lead's business.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label htmlFor="business_name" className="block text-sm font-medium text-slate-700 mb-1">Business Name <span className="text-red-500">*</span></label>
                                    <Input 
                                        id="business_name" 
                                        name="business_name" 
                                        value={formData.business_name} 
                                        onChange={handleChange} 
                                        placeholder="e.g., Acme Corporation" 
                                        className={businessErrors.business_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                    />
                                    {businessErrors.business_name && <p className="text-xs text-red-500 mt-1">{businessErrors.business_name}</p>}
                                </div>
                                <div>
                                    <label htmlFor="business_category" className="block text-sm font-medium text-slate-700 mb-1">Business Category <span className="text-red-500">*</span></label>
                                    <SearchableSelect 
                                        options={BUSINESS_CATEGORIES} 
                                        value={formData.business_category} 
                                        onChange={(val) => {
                                            setFormData(prev => ({ ...prev, business_category: val }));
                                            if (val) setBusinessErrors(prev => ({ ...prev, business_category: '' }));
                                        }}
                                        placeholder="Select Category..." 
                                        error={!!businessErrors.business_category}
                                    />
                                    {businessErrors.business_category && <p className="text-xs text-red-500 mt-1">{businessErrors.business_category}</p>}
                                </div>
                                <div>
                                    <label htmlFor="industry_type" className="block text-sm font-medium text-slate-700 mb-1">Industry Type <span className="text-red-500">*</span></label>
                                    <SearchableSelect 
                                        options={INDUSTRY_TYPES} 
                                        value={formData.industry_type} 
                                        onChange={(val) => {
                                            setFormData(prev => ({ ...prev, industry_type: val }));
                                            if (val) setBusinessErrors(prev => ({ ...prev, industry_type: '' }));
                                        }}
                                        placeholder="Select Industry..." 
                                        error={!!businessErrors.industry_type}
                                    />
                                    {businessErrors.industry_type && <p className="text-xs text-red-500 mt-1">{businessErrors.industry_type}</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                                <MailIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle>Address Information</CardTitle>
                                <CardDescription>Lead's contact addresses.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                                <input 
                                    type="checkbox" 
                                    id="sameAddressCheckbox" 
                                    checked={isSameAddress} 
                                    onChange={(e) => handleSameAddressChange(e.target.checked)} 
                                    className="h-4.5 w-4.5 rounded border-slate-300 text-[#1c398e] focus:ring-[#1c398e]/50 cursor-pointer" 
                                />
                                <label htmlFor="sameAddressCheckbox" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                                    Personal Address is the same as Business Address
                                </label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Personal Address Column */}
                                <div className="space-y-4">
                                    <h3 className="text-base font-semibold text-[#1c398e] flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#1c398e] border border-blue-200">1</span>
                                        Personal Address
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="col-span-1 sm:col-span-2">
                                            <label htmlFor="personal_flatNo" className="block text-xs font-semibold text-slate-500 mb-1">Flat / House No / Building / Apartment Name</label>
                                            <Input
                                                id="personal_flatNo"
                                                value={personalAddress.flatNo}
                                                onChange={(e) => handlePersonalAddressChange('flatNo', e.target.value)}
                                                placeholder="e.g., Suite 404, Apex Tower"
                                            />
                                        </div>
                                        <div className="col-span-1 sm:col-span-2">
                                            <label htmlFor="personal_street" className="block text-xs font-semibold text-slate-500 mb-1">Street Address <span className="text-red-500">*</span></label>
                                            <Input
                                                id="personal_street"
                                                value={personalAddress.street}
                                                onChange={(e) => handlePersonalAddressChange('street', e.target.value)}
                                                placeholder="e.g., 123 Main Road, Jubilee Hills"
                                                className={addressErrors.personal.street ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                            />
                                            {addressErrors.personal.street && <p className="text-xs text-red-500 mt-1">{addressErrors.personal.street}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="personal_city" className="block text-xs font-semibold text-slate-500 mb-1">City <span className="text-red-500">*</span></label>
                                            <Input
                                                id="personal_city"
                                                value={personalAddress.city}
                                                onChange={(e) => handlePersonalAddressChange('city', e.target.value)}
                                                placeholder="e.g., Hyderabad"
                                                className={addressErrors.personal.city ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                            />
                                            {addressErrors.personal.city && <p className="text-xs text-red-500 mt-1">{addressErrors.personal.city}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="personal_state" className="block text-xs font-semibold text-slate-500 mb-1">State / Province <span className="text-red-500">*</span></label>
                                            <Input
                                                id="personal_state"
                                                value={personalAddress.state}
                                                onChange={(e) => handlePersonalAddressChange('state', e.target.value)}
                                                placeholder="e.g., Telangana"
                                                className={addressErrors.personal.state ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                            />
                                            {addressErrors.personal.state && <p className="text-xs text-red-500 mt-1">{addressErrors.personal.state}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="personal_zipCode" className="block text-xs font-semibold text-slate-500 mb-1">ZIP / Postal Code <span className="text-red-500">*</span></label>
                                            <Input
                                                id="personal_zipCode"
                                                value={personalAddress.zipCode}
                                                onChange={(e) => handlePersonalAddressChange('zipCode', e.target.value)}
                                                placeholder="e.g., 500033"
                                                className={addressErrors.personal.zipCode ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                            />
                                            {addressErrors.personal.zipCode && <p className="text-xs text-red-500 mt-1">{addressErrors.personal.zipCode}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="personal_country" className="block text-xs font-semibold text-slate-500 mb-1">Country <span className="text-red-500">*</span></label>
                                            <SearchableCountrySelect
                                                id="personal_country"
                                                value={personalAddress.country}
                                                onChange={(val) => handlePersonalAddressChange('country', val)}
                                                error={!!addressErrors.personal.country}
                                            />
                                            {addressErrors.personal.country && <p className="text-xs text-red-500 mt-1">{addressErrors.personal.country}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Business Address Column */}
                                <div className="space-y-4">
                                    <h3 className={`text-base font-semibold flex items-center gap-2 ${isSameAddress ? 'text-slate-400' : 'text-[#1c398e]'}`}>
                                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold border ${isSameAddress ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-blue-50 text-[#1c398e] border-blue-200'}`}>2</span>
                                        Business Address
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="col-span-1 sm:col-span-2">
                                            <label htmlFor="business_flatNo" className="block text-xs font-semibold text-slate-500 mb-1">Flat / House No / Building / Apartment Name</label>
                                            <Input
                                                id="business_flatNo"
                                                value={businessAddress.flatNo}
                                                onChange={(e) => handleBusinessAddressChange('flatNo', e.target.value)}
                                                placeholder="e.g., Suite 404, Apex Tower"
                                                disabled={isSameAddress}
                                            />
                                        </div>
                                        <div className="col-span-1 sm:col-span-2">
                                            <label htmlFor="business_street" className="block text-xs font-semibold text-slate-500 mb-1">Street Address {!isSameAddress && <span className="text-red-500">*</span>}</label>
                                            <Input
                                                id="business_street"
                                                value={businessAddress.street}
                                                onChange={(e) => handleBusinessAddressChange('street', e.target.value)}
                                                placeholder="e.g., 123 Main Road, Jubilee Hills"
                                                disabled={isSameAddress}
                                                className={!isSameAddress && addressErrors.business.street ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                            />
                                            {!isSameAddress && addressErrors.business.street && <p className="text-xs text-red-500 mt-1">{addressErrors.business.street}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="business_city" className="block text-xs font-semibold text-slate-500 mb-1">City {!isSameAddress && <span className="text-red-500">*</span>}</label>
                                            <Input
                                                id="business_city"
                                                value={businessAddress.city}
                                                onChange={(e) => handleBusinessAddressChange('city', e.target.value)}
                                                placeholder="e.g., Hyderabad"
                                                disabled={isSameAddress}
                                                className={!isSameAddress && addressErrors.business.city ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                            />
                                            {!isSameAddress && addressErrors.business.city && <p className="text-xs text-red-500 mt-1">{addressErrors.business.city}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="business_state" className="block text-xs font-semibold text-slate-500 mb-1">State / Province {!isSameAddress && <span className="text-red-500">*</span>}</label>
                                            <Input
                                                id="business_state"
                                                value={businessAddress.state}
                                                onChange={(e) => handleBusinessAddressChange('state', e.target.value)}
                                                placeholder="e.g., Telangana"
                                                disabled={isSameAddress}
                                                className={!isSameAddress && addressErrors.business.state ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                            />
                                            {!isSameAddress && addressErrors.business.state && <p className="text-xs text-red-500 mt-1">{addressErrors.business.state}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="business_zipCode" className="block text-xs font-semibold text-slate-500 mb-1">ZIP / Postal Code {!isSameAddress && <span className="text-red-500">*</span>}</label>
                                            <Input
                                                id="business_zipCode"
                                                value={businessAddress.zipCode}
                                                onChange={(e) => handleBusinessAddressChange('zipCode', e.target.value)}
                                                placeholder="e.g., 500033"
                                                disabled={isSameAddress}
                                                className={!isSameAddress && addressErrors.business.zipCode ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                            />
                                            {!isSameAddress && addressErrors.business.zipCode && <p className="text-xs text-red-500 mt-1">{addressErrors.business.zipCode}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="business_country" className="block text-xs font-semibold text-slate-500 mb-1">Country {!isSameAddress && <span className="text-red-500">*</span>}</label>
                                            <SearchableCountrySelect
                                                id="business_country"
                                                value={businessAddress.country}
                                                onChange={(val) => handleBusinessAddressChange('country', val)}
                                                disabled={isSameAddress}
                                                error={!isSameAddress && !!addressErrors.business.country}
                                            />
                                            {!isSameAddress && addressErrors.business.country && <p className="text-xs text-red-500 mt-1">{addressErrors.business.country}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>


                    {serviceSets.map((set, setIndex) => (
                        <Card key={set.id}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex flex-row items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                                        <CheckCircleIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle>Service Details {serviceSets.length > 1 ? `#${setIndex + 1} ` : ''}</CardTitle>
                                        <CardDescription>Select the services required by the lead.</CardDescription>
                                    </div>
                                </div>
                                {serviceSets.length > 1 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveServiceSet(set.id)}>
                                        <Trash2Icon className="h-4 w-4 text-red-500" />
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Main Service Category</label>
                                    <Select value={set.mainService} onChange={(e) => handleSetChange(set.id, 'mainService', e.target.value)}>
                                        {activeServices.length > 0 ? (
                                            activeServices.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                                        ) : (
                                            <option value="" disabled>No services available</option>
                                        )}
                                    </Select>
                                </div>
                                {getAvailableOffers(set.mainService).length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 py-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">🎁 Available Offers:</span>
                                        {getAvailableOffers(set.mainService).map(offer => (
                                            <button
                                                key={offer.id}
                                                type="button"
                                                onClick={() => {
                                                    handleSetChange(set.id, 'promo_code', offer.promo_code);
                                                    setTimeout(() => handleApplyPromoCodeWithCode(set.id, offer.promo_code), 50);
                                                }}
                                                className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 px-2 py-0.5 rounded-full shadow-sm transition-all"
                                                title={`Click to apply promo code: ${offer.name}`}
                                            >
                                                {offer.promo_code} ({offer.discount_type === 'percentage' ? `${offer.discount_value}%` : `₹${offer.discount_value}`} Off)
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Sub-services</label>
                                    <Select onChange={(e) => { handleAddSubservice(set.id, e.target.value); /* try to reset selection visually */ (e.target as HTMLSelectElement).selectedIndex = 0; }}>
                                        <option value="" disabled>Add a sub-service...</option>
                                        {getSubServicesForSelection(set.mainService)
                                            .filter(sub => !set.subservices.some(s => s.name === sub))
                                            .map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                    </Select>
                                </div>
                                {set.subservices.length > 0 && (
                                    <div className="space-y-2 pt-2">
                                        {set.subservices.map(sub => {
                                            const mainServiceObj = activeServices.find(s => s.name === set.mainService);
                                            const subServiceObj = mainServiceObj?.sub_services?.find(sDef => sDef.name === sub.name);
                                            const requiredDocs = subServiceObj?.required_documents || [];

                                            return (
                                                <div key={sub.name} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-50">
                                                    <span className="col-span-12 sm:col-span-4 text-sm text-slate-700 font-medium">{sub.name}</span>
                                                    <div className="col-span-6 sm:col-span-2">
                                                        <Input
                                                            type="number"
                                                            placeholder="Qty"
                                                            value={String(sub.quantity)}
                                                            onChange={(e) => handleSubserviceDetailChange(set.id, sub.name, 'quantity', e.target.value)}
                                                            min="1"
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div className="col-span-5 sm:col-span-2">
                                                        <Input
                                                            type="number"
                                                            placeholder="Amount (₹)"
                                                            value={sub.amount === 0 ? '' : String(sub.amount)}
                                                            onChange={(e) => handleSubserviceDetailChange(set.id, sub.name, 'amount', e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div className="col-span-12 sm:col-span-3 flex items-center gap-2">
                                                        <div className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!sub.is_tax_applicable}
                                                                onChange={(e) => handleSubserviceDetailChange(set.id, sub.name, 'is_tax_applicable', e.target.checked ? 'true' : 'false')}
                                                                className="h-4 w-4 rounded border-slate-300 text-[#1c398e] focus:ring-[#1c398e]/50 cursor-pointer"
                                                                title="Tax Applicable"
                                                            />
                                                        </div>
                                                        {sub.is_tax_applicable && (
                                                            <Input
                                                                type="number"
                                                                placeholder="Tax (₹)"
                                                                value={sub.tax_amount || ''}
                                                                onChange={(e) => handleSubserviceDetailChange(set.id, sub.name, 'tax_amount', e.target.value)}
                                                                className="h-8 w-full"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="col-span-1 text-right">
                                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveSubservice(set.id, sub.name)}>
                                                            <Trash2Icon className="h-4 w-4 text-slate-400 hover:text-red-500" />
                                                        </Button>
                                                    </div>
                                                    {requiredDocs.length > 0 && (
                                                        <div className="col-span-12 text-xs text-slate-500 mt-1 px-1">
                                                            <span className="font-medium">Required Docs:</span> {requiredDocs.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-col gap-4 bg-slate-50/50 p-4 rounded-b-xl">
                                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-3 w-full border-b pb-4 border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-slate-700">Service Fee:</label>
                                        <div className="relative w-32">
                                            <span className="absolute left-3 top-2 text-slate-500 text-sm">₹</span>
                                            <Input
                                                type="number"
                                                value={set.service_fee || ''}
                                                onChange={(e) => handleServiceFeeChange(set.id, e.target.value)}
                                                className="pl-6 h-9 bg-white"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-slate-700">Discount:</label>
                                        <div className="relative w-32">
                                            <span className="absolute left-3 top-2 text-slate-500 text-sm">₹</span>
                                            <Input
                                                type="number"
                                                value={set.discount || ''}
                                                onChange={(e) => handleDiscountChange(set.id, e.target.value)}
                                                className="pl-6 h-9 bg-white"
                                                placeholder="0"
                                                readOnly={!!set.promo_code && set.discount > 0}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-slate-700">Promo Code:</label>
                                        <div className="flex gap-1 items-center">
                                            <Input
                                                value={set.promo_code || ''}
                                                onChange={(e) => handleSetChange(set.id, 'promo_code', e.target.value.toUpperCase())}
                                                placeholder="CODE"
                                                className="h-9 w-28 uppercase"
                                                readOnly={!!set.promo_code && set.discount > 0}
                                            />
                                            {set.promo_code && set.discount > 0 ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-9 text-xs px-2 text-red-500 hover:text-red-700 bg-white font-semibold"
                                                    onClick={() => handleRemovePromoCode(set.id)}
                                                >
                                                    Remove
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-9 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                                    onClick={() => handleApplyPromoCode(set.id)}
                                                >
                                                    Apply
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-slate-700">Advance:</label>
                                        <span className="font-bold text-slate-600">₹{(set.advance_amount || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-6 w-full items-center">
                                    <span className="text-sm font-semibold text-slate-600">
                                        Subtotal: ₹{set.subservices.reduce((acc, sub) => acc + (sub.amount * sub.quantity), 0).toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-600">
                                        Tax: ₹{set.subservices.reduce((acc, sub) => acc + (sub.tax_amount || 0), 0).toLocaleString('en-IN')}
                                    </span>
                                    {(set.discount || 0) > 0 && (
                                        <span className="text-sm font-semibold text-red-500">
                                            Discount: -₹{(set.discount || 0).toLocaleString('en-IN')}
                                        </span>
                                    )}
                                    <span className="text-sm font-bold text-[#1c398e]">
                                        Set Total: ₹{(set.subservices.reduce((total, sub) => total + (sub.amount * sub.quantity) + (sub.tax_amount || 0), 0) + (set.service_fee || 0) - (set.discount || 0)).toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                    <Button type="button" variant="outline" onClick={handleAddServiceSet} className="w-full gap-2 bg-white">
                        <PlusIcon className="h-4 w-4" /> Add Another Service Set
                    </Button>

                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                                <TargetIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle>Lead Details</CardTitle>
                                <CardDescription>Additional information for tracking and management.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="assignTo" className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                                <Select id="assignTo" name="assignTo" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
                                    <option value="HEAD_OFFICE">🏢 Head Office</option>
                                    <option value="">— Unassigned —</option>
                                    {salesExecutives.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                                </Select>
                            </div>
                            <div>
                                <label htmlFor="created_at" className="block text-sm font-medium text-slate-700 mb-1">Received Date</label>
                                <Input 
                                    id="created_at" 
                                    name="created_at" 
                                    type="date" 
                                    value={formData.created_at} 
                                    onChange={handleChange} 
                                    max={new Date().toISOString().split('T')[0]} 
                                />
                            </div>
                            <div>
                                <label htmlFor="source" className="block text-sm font-medium text-slate-700 mb-1">Lead Source</label>
                                <Select id="source" name="source" value={formData.source} onChange={handleChange}>
                                    <option value="">Select Lead Source</option>
                                    {leadSources.map(s => <option key={s.id} value={s.source_name}>{s.source_name}</option>)}
                                </Select>
                            </div>
                            {formData.source === 'Customer Referral' && (
                                <div>
                                    <label htmlFor="referred_by_customer_id" className="block text-sm font-medium text-slate-700 mb-1">Referring Customer</label>
                                    <Select 
                                        id="referred_by_customer_id" 
                                        name="referred_by_customer_id" 
                                        value={formData.referred_by_customer_id} 
                                        onChange={handleChange}
                                    >
                                        <option value="">Select Referring Customer</option>
                                        {allCustomers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                                        ))}
                                    </Select>
                                </div>
                            )}
                            {formData.source === 'Employer Referral' && (
                                <div>
                                    <label htmlFor="referred_by_employee_id" className="block text-sm font-medium text-slate-700 mb-1">Referring Employee</label>
                                    <Select 
                                        id="referred_by_employee_id" 
                                        name="referred_by_employee_id" 
                                        value={formData.referred_by_employee_id} 
                                        onChange={handleChange}
                                    >
                                        <option value="">Select Referring Employee</option>
                                        {allUsers.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                        ))}
                                    </Select>
                                </div>
                            )}
                            <div>
                                <label htmlFor="priority" className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                                <Select id="priority" name="priority" value={formData.priority as unknown as string} onChange={handleChange}>
                                    {LEAD_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                </Select>
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={4} className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c398e]" placeholder="Add any relevant notes here..." />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Details & Invoice */ }
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <CheckCircleIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle>Payment & Invoice</CardTitle>
                                <CardDescription>Manage advance payments and generate invoice.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Service to Update Advance</label>
                                    <Select 
                                        value={selectedServiceIdForPayment} 
                                        onChange={(e) => handlePaymentServiceSelectionChange(e.target.value)}
                                        className="mb-4"
                                    >
                                        {serviceSets.map((set, idx) => (
                                            <option key={set.id} value={set.id}>
                                                {set.mainService || `Service #${idx + 1}`}
                                            </option>
                                        ))}
                                    </Select>

                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Mode</label>
                                            <Select
                                                value={tempPaymentMode}
                                                onChange={(e) => setTempPaymentMode(e.target.value)}
                                                className="h-12 text-base"
                                            >
                                                <option value="UPI">UPI</option>
                                                <option value="Net Banking">Net Banking</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Credit Card">Credit Card</option>
                                                <option value="Debit Card">Debit Card</option>
                                                <option value="Cheque">Cheque</option>
                                                <option value="Other">Other</option>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Advance Amount</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₹</span>
                                                    <Input 
                                                        type="number" 
                                                        value={tempAdvanceAmount} 
                                                        onChange={(e) => setTempAdvanceAmount(e.target.value)} 
                                                        className="pl-8 text-lg font-bold text-[#1c398e] h-12" 
                                                        placeholder="0" 
                                                    />
                                                </div>
                                                <Button 
                                                    type="button" 
                                                    onClick={handleUpdateAdvanceAmount}
                                                    className="h-12 px-6 bg-[#1c398e] hover:bg-[#152c6e]"
                                                >
                                                    Update
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Total Advance Paid: <span className="font-bold text-green-600">₹{totalAdvance.toLocaleString('en-IN')}</span>
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Total Amount:</span>
                                        <span className="font-bold">₹{grandTotal.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span className="font-medium">Advance Paid:</span>
                                        <span className="font-bold">- ₹{totalAdvance.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-base border-t pt-2 mt-2 text-[#1c398e]">
                                        <span className="font-bold">Remaining Balance:</span>
                                        <span className="font-bold">₹{remainingAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t pt-8">
                                <h4 className="font-medium text-slate-700 mb-4 flex items-center gap-2">
                                    Invoice Preview <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Draft</Badge>
                                </h4>
                                <div className="max-w-3xl mx-auto border rounded-xl shadow-sm bg-slate-50/30 p-1">
                                    <InvoicePreview 
                                        customerName={`${formData.first_name} ${formData.last_name}`}
                                        businessName={formData.business_name}
                                        email={formData.email}
                                        phone={formData.phone_number}
                                        address={formData.business_address || formData.residential_address}
                                        description={formData.notes}
                                        serviceSets={serviceSets} 
                                        advanceAmount={totalAdvance} 
                                        grandTotal={grandTotal} 
                                        referenceNumber={refNumber}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="sticky bottom-0 bg-white/80 backdrop-blur-md py-4 mt-8 flex items-center justify-between rounded-t-xl border-t">
                    <div>
                        <span className="text-sm text-slate-600">Grand Total:</span>
                        <p className="text-2xl font-bold text-[#1c398e]">₹{grandTotal.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                        <Button type="submit">Create Lead</Button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateLead;
