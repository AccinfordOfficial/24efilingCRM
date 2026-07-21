import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Lead, LeadPriority, ServiceSet, User, Service, Offer, Payment } from '../../types';
import { COUNTRIES } from '../../constants';
import { useApi } from '../../hooks/useApi';
import { getNextPaymentSequenceClientSide, formatPaymentReferenceId } from '../../lib/paymentUtils';

export interface StructuredAddress {
    flatNo: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
}

export const initialAddressState: StructuredAddress = {
    flatNo: '',
    street: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
};

export const formatAddress = (addr: StructuredAddress) => {
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

interface UseCreateLeadFormProps {
    onAddLead: (lead: Omit<Lead, 'id' | 'created_at' | 'last_contacted' | 'status' | 'assigned_to' | 'service_requested'>, assignedToId: string | null) => void;
    onCancel: () => void;
    salesExecutives: User[];
    services: Service[];
    leads: Lead[];
    offers: Offer[];
}

export function useCreateLeadForm({ onAddLead, onCancel, salesExecutives, services, leads, offers }: UseCreateLeadFormProps) {
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

    const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const activeServices = useMemo(() => (services || []).filter(s => s.is_active), [services]);

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

    const autoPromoForService = useCallback((serviceName: string) => {
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
    }, [activeServices, offers]);

    const recalculateDiscounts = useCallback((sets: ServiceSet[]): ServiceSet[] => {
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
    }, [activeServices, offers]);

    const [serviceSets, setServiceSets] = useState<ServiceSet[]>([]);

    useEffect(() => {
        if (serviceSets.length === 0 && activeServices.length > 0) {
            const defaultService = activeServices[0].name;
            const promo = autoPromoForService(defaultService);
            setServiceSets([
                {
                    id: `set-${Date.now()}`,
                    mainService: defaultService,
                    subservices: [],
                    advance_amount: 0,
                    promo_code: promo ? promo.promo_code : '',
                    promo_discount_type: promo ? promo.discount_type : undefined,
                    promo_discount_value: promo ? promo.discount_value : undefined,
                    discount: 0
                }
            ]);
        }
    }, [activeServices, serviceSets.length, autoPromoForService]);

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
            return total + setTotal + (Number(set.service_fee) || 0) - (Number(set.discount) || 0);
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
            if (upperValue && !/^[A-Z0-9]*$/.test(upperValue)) {
                 return;
            }
            if (value && value.length === 10 && !PAN_REGEX.test(upperValue)) {
                setPanError('Invalid PAN format (e.g., ABCDE1234F)');
            } else if (value.length > 10) {
                 return;
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

        if (formData.pan_number && !PAN_REGEX.test(formData.pan_number)) {
            setPanError('Please enter a valid PAN number before creating the lead.');
            return;
        }

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
                date: leadCreationDate,
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
            payments: payments,
            remaining_amount: remainingAmount,
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

    return {
        leadSources,
        allCustomers,
        allUsers,
        formData,
        setFormData,
        businessErrors,
        assignedToId,
        setAssignedToId,
        isSameAddress,
        alternateMobile,
        setAlternateMobile,
        alternateIsWhatsapp,
        setAlternateIsWhatsapp,
        panError,
        refNumber,
        personalAddress,
        businessAddress,
        addressErrors,
        activeServices,
        serviceSets,
        setServiceSets,
        selectedServiceIdForPayment,
        tempAdvanceAmount,
        setTempAdvanceAmount,
        tempPaymentMode,
        setTempPaymentMode,
        grandTotal,
        totalAdvance,
        remainingAmount,
        handleChange,
        handlePersonalAddressChange,
        handleBusinessAddressChange,
        handleSameAddressChange,
        handleAddServiceSet,
        handleRemoveServiceSet,
        handleRemovePromoCode,
        handleApplyPromoCode,
        handleApplyPromoCodeWithCode,
        getAvailableOffers,
        handleSetChange,
        handleAddSubservice,
        handleRemoveSubservice,
        handleSubserviceDetailChange,
        handleServiceFeeChange,
        handleDiscountChange,
        getSubServicesForSelection,
        handleSubmit,
        handlePaymentServiceSelectionChange,
        handleUpdateAdvanceAmount,
    };
}
