import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { Lead, User, ServiceSet, Service, Offer } from '../types';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { SearchableSelect } from './ui/SearchableSelect';
import { LEAD_STATUSES, LEAD_PRIORITIES } from '../constants';
import { UserIcon, Trash2Icon, PlusIcon, CheckCircleIcon } from './icons';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

import { BUSINESS_CATEGORIES, INDUSTRY_TYPES } from '../constants';

interface LeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Lead | Omit<Lead, 'id' | 'created_at' | 'last_contacted'>) => void;
  lead: Lead | null;
  users: User[];
  currentUser: User;
  services: Service[]; // Added services prop
  offers: Offer[]; // Added offers prop
  onUploadDocument?: (file: File) => Promise<void>;
  onDeleteDocument?: (docId: string) => Promise<void>;
}

const initialFormState = {
  business_name: '',
  business_category: '',
  industry_type: '',
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  pan_number: '',
  residential_address: '',
  business_address: '',
  service_requested: '',
  status: 'New Lead',
  priority: 'Warm',
  assignedToId: '',
  next_follow_up: '',
  source: '',
  referred_by_customer_id: '',
  referred_by_employee_id: '',
  total_payment: 0,
  avatar_url: '',
  created_at: new Date().toISOString().split('T')[0], // Default to today
};

const FormField: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-4 items-center gap-4">
    <label className="text-right text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
    <div className="col-span-3">{children}</div>
  </div>
);

export const LeadForm: React.FC<LeadFormProps> = ({ isOpen, onClose, onSave, lead, users, currentUser, services, offers, onUploadDocument, onDeleteDocument }) => {
  const { leadSources, customers: allCustomers, users: allUsers } = useApi();
  const [formData, setFormData] = useState<any>(initialFormState);
  const [isSameAddress, setIsSameAddress] = useState(false);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [serviceSets, setServiceSets] = useState<ServiceSet[]>([]);
  const [panError, setPanError] = useState<string>('');
  const [businessErrors, setBusinessErrors] = useState<any>({
    business_name: '',
    business_category: '',
    industry_type: '',
  });

  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  const activeServices = useMemo(() => (services || []).filter(s => s.is_active), [services]);

  const canEditAssignee = useMemo(() => {
    return ['Super Admin', 'Admin', 'Sales Executive'].includes(currentUser.role);
  }, [currentUser]);

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
          const subtotalBeforeDiscount = subservicesTotal;

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

  useEffect(() => {
    if (lead) {
      setFormData({
        ...initialFormState,
        ...lead,
        assignedToId: lead.assigned_to?.id || '',
        next_follow_up: lead.next_follow_up ? lead.next_follow_up.split('T')[0] : '',
        created_at: lead.created_at ? new Date(lead.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      });
      setBusinessErrors({ business_name: '', business_category: '', industry_type: '' });
      const same = !!(lead.residential_address && lead.residential_address === lead.business_address);
      setIsSameAddress(same);
      setProfilePicPreview(lead.avatar_url || null);

      if (lead.service_sets && lead.service_sets.length > 0) {
        setServiceSets(lead.service_sets);
      } else {
        let initialSets: ServiceSet[] = [];

        if (lead.service_requested) {
          const legacyServices = lead.service_requested.split(',').map(s => s.trim()).filter(Boolean);
          if (legacyServices.length > 0) {
            initialSets = legacyServices.map((srvName, idx) => {
              const matchedService = activeServices.find(s => s.name.toLowerCase() === srvName.toLowerCase());
              const serviceName = matchedService ? matchedService.name : srvName;
              const promo = autoPromoForService(serviceName);
              return {
                id: `set-${Date.now()}-${idx}`,
                mainService: serviceName,
                subservices: [],
                promo_code: promo ? promo.promo_code : '',
                promo_discount_type: promo ? promo.discount_type : undefined,
                promo_discount_value: promo ? promo.discount_value : undefined,
                discount: 0
              };
            });
          }
        }

        if (initialSets.length === 0) {
          const defaultService = activeServices.length > 0 ? activeServices[0].name : '';
          const promo = autoPromoForService(defaultService);
          initialSets = [{
              id: `set-${Date.now()}`,
              mainService: defaultService,
              subservices: [],
              promo_code: promo ? promo.promo_code : '',
              promo_discount_type: promo ? promo.discount_type : undefined,
              promo_discount_value: promo ? promo.discount_value : undefined,
              discount: 0
          }];
        }

        setServiceSets(initialSets);
      }

    } else {
      setFormData({ 
          ...initialFormState, 
          assignedToId: users[0]?.id || '',
          created_at: new Date().toISOString().split('T')[0] 
      });
      setIsSameAddress(false);
      setProfilePicPreview(null);
      const defaultService = activeServices.length > 0 ? activeServices[0].name : '';
      const promo = autoPromoForService(defaultService);
      setServiceSets([{
          id: `set-${Date.now()}`,
          mainService: defaultService,
          subservices: [],
          promo_code: promo ? promo.promo_code : '',
          promo_discount_type: promo ? promo.discount_type : undefined,
          promo_discount_value: promo ? promo.discount_value : undefined,
          discount: 0
      }]);
      setBusinessErrors({ business_name: '', business_category: '', industry_type: '' });
    }
  }, [lead, isOpen, users, activeServices, offers]);


  const grandTotal = useMemo(() => {
    return serviceSets.reduce((total, set) => {
      const setTotal = set.subservices.reduce((subTotal, sub) => subTotal + ((Number(sub.amount) || 0) * (Number(sub.quantity) || 1)) + (Number(sub.tax_amount) || 0), 0);
      return total + setTotal + (Number(set.service_fee) || 0) - (Number(set.discount) || 0);
    }, 0);
  }, [serviceSets]);


  useEffect(() => {
    if (isSameAddress) {
      setFormData((prev: any) => ({ ...prev, business_address: prev.residential_address }));
    }
  }, [formData.residential_address, isSameAddress]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'pan_number') {
        const upperValue = value.toUpperCase();
        if (upperValue && !/^[A-Z0-9]*$/.test(upperValue)) return;

        if (value && value.length === 10 && !PAN_REGEX.test(upperValue)) {
            setPanError('Invalid PAN format (e.g., ABCDE1234F)');
        } else if (value.length > 10) {
            return;
        } else {
            setPanError('');
        }
        setFormData((prev: any) => ({ ...prev, [name]: upperValue }));
    } else {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSameAddressChange = (checked: boolean) => {
    setIsSameAddress(checked);
    if (checked) {
      setFormData((prev: any) => ({ ...prev, business_address: prev.residential_address }));
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfilePicPreview(result);
        setFormData((prev: any) => ({ ...prev, avatar_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadDocument) {
      setIsUploading(true);
      try {
        await onUploadDocument(file);
      } catch (error) {
        console.error("Upload failed", error);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleAddServiceSet = () => {
    const defaultService = activeServices.length > 0 ? activeServices[0].name : '';
    const promo = autoPromoForService(defaultService);
    setServiceSets(prev => recalculateDiscounts([...prev, {
        id: `set-${Date.now()}`,
        mainService: defaultService,
        subservices: [],
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
      const subtotalBeforeDiscount = subservicesTotal;

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
      const subtotalBeforeDiscount = subservicesTotal;

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

  const handleSetChange = (setId: string, field: 'mainService' | 'discount' | 'advance_amount' | 'promo_code', value: string) => {
    setServiceSets(prev => recalculateDiscounts(prev.map(s => {
        if (s.id === setId) {
            if (field === 'mainService') {
                const promo = autoPromoForService(value);
                return {
                    ...s,
                    mainService: value,
                    promo_code: promo ? promo.promo_code : '',
                    discount: 0,
                    promo_discount_type: promo ? promo.discount_type : undefined,
                    promo_discount_value: promo ? promo.discount_value : undefined
                };
            }
            if (field === 'discount') return { ...s, discount: Number(value) };
            if (field === 'advance_amount') return { ...s, advance_amount: Number(value) };
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

    setServiceSets(prev => recalculateDiscounts(prev.map(s => {
      if (s.id === setId && !s.subservices.some(sub => sub.name === subserviceName)) {
        return { ...s, subservices: [...s.subservices, { name: subserviceName, quantity: 1, amount: price, is_tax_applicable: false, tax_amount: 0 }] };
      }
      return s;
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

  const getSubServicesForSelection = (mainServiceName: string) => {
    const service = activeServices.find(s => s.name === mainServiceName);
    if (!service || !service.sub_services) return [];
    return service.sub_services.filter(sub => sub.is_active).map(sub => sub.name);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      console.warn("Prevented duplicate submission attempt in LeadForm.");
      return;
    }

    const newBusinessErrors = {
      business_name: !formData.business_name?.trim() ? 'Business Name is mandatory' : '',
      business_category: !formData.business_category?.trim() ? 'Business Category is mandatory' : '',
      industry_type: !formData.industry_type?.trim() ? 'Industry Type is mandatory' : '',
    };

    if (newBusinessErrors.business_name || newBusinessErrors.business_category || newBusinessErrors.industry_type) {
      setBusinessErrors(newBusinessErrors);
      alert('Please fill all mandatory Business Details.');
      return;
    } else {
      setBusinessErrors({ business_name: '', business_category: '', industry_type: '' });
    }

    const assignedToUser = (users || []).find(u => u.id === formData.assignedToId);
    if (!assignedToUser && formData.assignedToId) {
      alert("Please select a valid user to assign the lead to.");
      return;
    }

    if (formData.pan_number && !PAN_REGEX.test(formData.pan_number)) {
        setPanError('Please enter a valid PAN number before saving.');
        return;
    }

    const requestedServices = (serviceSets || []).flatMap(s => (s.subservices || []).map(sub => sub.name));

    const serviceRequestedString = requestedServices.length > 0 ? requestedServices.join(', ') : 'No service specified';

    const saveData = {
      ...formData,
      assigned_to: assignedToUser,
      total_payment: grandTotal,
      service_sets: serviceSets,
      service_requested: serviceRequestedString,
      next_follow_up: formData.next_follow_up ? formData.next_follow_up : null,
      created_at: formData.created_at ? new Date(`${formData.created_at}T${new Date().toTimeString().split(' ')[0]}`).toISOString() : new Date().toISOString(),
    };

    delete saveData.assignedToId;

    setIsSubmitting(true);
    onSave(saveData);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={lead ? 'Edit Lead' : 'Add New Lead'}
      description={lead ? `Update details for ${lead.business_name}.` : 'Enter the details for the new lead.'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b border-slate-200 dark:border-white/10 pb-2 mb-4 dark:text-white">Business Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Business Name *</label>
              <Input 
                name="business_name" 
                value={formData.business_name || ''} 
                onChange={handleChange} 
                className={businessErrors.business_name ? 'border-red-500' : ''}
              />
              {businessErrors.business_name && <span className="text-[10px] text-red-500">{businessErrors.business_name}</span>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Business Category *</label>
              <SearchableSelect 
                options={BUSINESS_CATEGORIES} 
                value={formData.business_category || ''} 
                onChange={(val) => {
                  setFormData((prev: any) => ({ ...prev, business_category: val }));
                  if (val) setBusinessErrors(prev => ({ ...prev, business_category: '' }));
                }}
                placeholder="Select Category..." 
                error={!!businessErrors.business_category}
              />
              {businessErrors.business_category && <span className="text-[10px] text-red-500">{businessErrors.business_category}</span>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Industry Type *</label>
              <SearchableSelect 
                options={INDUSTRY_TYPES} 
                value={formData.industry_type || ''} 
                onChange={(val) => {
                  setFormData((prev: any) => ({ ...prev, industry_type: val }));
                  if (val) setBusinessErrors(prev => ({ ...prev, industry_type: '' }));
                }}
                placeholder="Select Industry..." 
                error={!!businessErrors.industry_type}
              />
              {businessErrors.industry_type && <span className="text-[10px] text-red-500">{businessErrors.industry_type}</span>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b border-slate-200 dark:border-white/10 pb-2 mb-4 dark:text-white">Contact Information</h3>
          <FormField label="Profile Picture">
            <div className="flex items-center gap-4">
              {profilePicPreview ? (
                <img src={profilePicPreview} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-slate-400" />
                </div>
              )}
              <div>
                <label htmlFor="lead-profile-pic-upload" className="text-sm font-medium text-[#1c398e] dark:text-blue-400 cursor-pointer hover:underline">
                  Upload Picture
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG up to 5MB.</p>
                <input id="lead-profile-pic-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleProfilePicChange} />
              </div>
            </div>
          </FormField>
          <FormField label="First Name">
            <Input name="first_name" value={formData.first_name || ''} onChange={handleChange} required />
          </FormField>
          <FormField label="Last Name">
            <Input name="last_name" value={formData.last_name || ''} onChange={handleChange} required />
          </FormField>
          <FormField label="Email">
            <Input name="email" type="email" value={formData.email || ''} onChange={handleChange} required />
          </FormField>
          <FormField label="Phone Number">
            <Input name="phone_number" value={formData.phone_number || ''} onChange={handleChange} required />
          </FormField>
          <FormField label="PAN Number">
            <Input 
                name="pan_number" 
                value={formData.pan_number || ''} 
                onChange={handleChange} 
                placeholder="ABCDE1234F" 
                className={panError ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {panError && <p className="text-xs text-red-500 mt-1">{panError}</p>}
          </FormField>
          <FormField label="Alternate Mobile">
            <div className="space-y-2">
                <Input
                    name="alternate_mobile"
                    type="tel"
                    value={formData.alternate_mobile || ''}
                    onChange={handleChange}
                    placeholder="e.g., 9876543211"
                />
                <div
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all select-none ${formData.alternate_is_whatsapp ? 'bg-green-50 dark:bg-green-950/40 border-green-400 dark:border-green-800 text-green-700 dark:text-green-300' : 'bg-slate-50 dark:bg-slate-950/40 border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400'}`}
                    onClick={() => setFormData((prev: any) => ({ ...prev, alternate_is_whatsapp: !prev.alternate_is_whatsapp }))}
                >
                    <input
                        type="checkbox"
                        id="alternateIsWhatsappForm"
                        checked={!!formData.alternate_is_whatsapp}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, alternate_is_whatsapp: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <label htmlFor="alternateIsWhatsappForm" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`h-4 w-4 ${formData.alternate_is_whatsapp ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp Enabled
                    </label>
                </div>
                {formData.alternate_mobile && (
                    <p className={`text-xs font-medium ${formData.alternate_is_whatsapp ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {formData.alternate_is_whatsapp
                            ? '✅ Alternate number is also a WhatsApp number.'
                            : '📱 Alternate number saved as mobile-only (not WhatsApp).'}
                    </p>
                )}
            </div>
          </FormField>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b border-slate-200 dark:border-white/10 pb-2 mb-4 dark:text-white">Address Details</h3>
          <FormField label="Residential Address">
            <textarea name="residential_address" value={formData.residential_address || ''} onChange={handleChange} rows={3} className="flex w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c398e] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50" />
          </FormField>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-start-2 col-span-3 flex items-center gap-2">
              <input type="checkbox" id="sameAddressCheckboxForm" checked={isSameAddress} onChange={(e) => handleSameAddressChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#1c398e] focus:ring-[#1c398e]/50 cursor-pointer" />
              <label htmlFor="sameAddressCheckboxForm" className="text-sm text-slate-700 dark:text-slate-300">Residential Address same as Business Address</label>
            </div>
          </div>
          <FormField label="Business Address">
            <textarea name="business_address" value={formData.business_address || ''} onChange={handleChange} rows={3} disabled={isSameAddress} className="flex w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c398e] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50" />
          </FormField>
        </div>

        {/* Service Sets Section */}
        <div className="space-y-4">
          {serviceSets.map((set, setIndex) => (
            <Card key={set.id} className="bg-white dark:bg-slate-900/80 dark:border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex flex-row items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-emerald-500/20 text-green-600 dark:text-emerald-400">
                    <CheckCircleIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base dark:text-white">Service Details {serviceSets.length > 1 ? `#${setIndex + 1}` : ''}</CardTitle>
                  </div>
                </div>
                {serviceSets.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveServiceSet(set.id)}>
                    <Trash2Icon className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Service Category</label>
                  <Select value={set.mainService} onChange={(e) => handleSetChange(set.id, 'mainService', e.target.value)} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10">
                    {activeServices.length > 0 ? (
                      activeServices.map(s => <option key={s.id} value={s.name} className="bg-slate-950 text-white">{s.name}</option>)
                    ) : (
                      <option value="" disabled className="bg-slate-950 text-white">No services available</option>
                    )}
                  </Select>
                </div>
                {getAvailableOffers(set.mainService).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 py-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">🎁 Available Offers:</span>
                    {getAvailableOffers(set.mainService).map(offer => (
                      <button
                        key={offer.id}
                        type="button"
                        onClick={() => {
                          handleSetChange(set.id, 'promo_code', offer.promo_code);
                          setTimeout(() => handleApplyPromoCodeWithCode(set.id, offer.promo_code), 50);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 hover:border-indigo-300 px-2 py-0.5 rounded-full shadow-sm transition-all"
                        title={`Click to apply promo code: ${offer.name}`}
                      >
                        {offer.promo_code} ({offer.discount_type === 'percentage' ? `${offer.discount_value}%` : `₹${offer.discount_value}`} Off)
                      </button>
                    ))}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Add Sub-service</label>
                  <Select onChange={(e) => { handleAddSubservice(set.id, e.target.value); (e.target as HTMLSelectElement).selectedIndex = 0; }} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10">
                    <option value="" disabled className="bg-slate-950 text-white">Select a sub-service...</option>
                    {getSubServicesForSelection(set.mainService).filter(sub => !set.subservices.some(s => s.name === sub)).map(sub => <option key={sub} value={sub} className="bg-slate-950 text-white">{sub}</option>)}
                  </Select>
                </div>
                {set.subservices.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {set.subservices.map(sub => {
                      const subServiceDef = activeServices
                        .find(s => s.name === set.mainService)?.sub_services
                        ?.find(sDef => sDef.name === sub.name);
                      const requiredDocs = subServiceDef?.required_documents || [];

                      return (
                        <div key={sub.name} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5">
                          <span className="col-span-12 sm:col-span-4 text-sm text-slate-700 dark:text-slate-300 truncate" title={sub.name}>{sub.name}</span>
                          <div className="col-span-6 sm:col-span-2">
                            <Input type="number" placeholder="Qty" value={String(sub.quantity)} onChange={(e) => handleSubserviceDetailChange(set.id, sub.name, 'quantity', e.target.value)} min="1" className="h-8 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10" />
                          </div>
                          <div className="col-span-6 sm:col-span-2">
                            <Input type="number" placeholder="Amt (₹)" value={sub.amount === 0 ? '' : String(sub.amount)} onChange={(e) => handleSubserviceDetailChange(set.id, sub.name, 'amount', e.target.value)} className="h-8 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10" />
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
                                className="h-8 w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10"
                              />
                            )}
                          </div>
                          <div className="col-span-1 text-right">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveSubservice(set.id, sub.name)}>
                              <Trash2Icon className="h-4 w-4 text-slate-400 hover:text-red-500" />
                            </Button>
                          </div>
                          {requiredDocs.length > 0 && (
                            <div className="col-span-12 text-xs text-slate-500 dark:text-slate-400 mt-1 px-1">
                              <span className="font-medium">Required Docs:</span> {requiredDocs.join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
              <CardContent className="flex flex-col gap-4 border-t border-slate-200 dark:border-white/10 pt-2">
                  <div className="flex flex-wrap items-center justify-end gap-4">
                      <div className="w-32">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Advance (₹)</label>
                        <Input
                           type="number"
                           value={set.advance_amount || ''}
                           onChange={(e) => handleSetChange(set.id, 'advance_amount', e.target.value)}
                           placeholder="0"
                           className="h-8 text-right bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10"
                        />
                      </div>
                      <div className="w-32">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Discount (₹)</label>
                        <Input
                           type="number"
                           value={set.discount || ''}
                           onChange={(e) => handleSetChange(set.id, 'discount', e.target.value)}
                           placeholder="0"
                           className="h-8 text-right bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10"
                           readOnly={!!set.promo_code && set.discount > 0}
                        />
                      </div>
                      <div className="w-44 flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">Promo Code</label>
                        <div className="flex gap-1">
                          <Input
                             value={set.promo_code || ''}
                             onChange={(e) => handleSetChange(set.id, 'promo_code', e.target.value.toUpperCase())}
                             placeholder="CODE"
                             className="h-8 text-xs w-28 uppercase bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10"
                             readOnly={!!set.promo_code && set.discount > 0}
                          />
                          {set.promo_code && set.discount > 0 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs px-2 text-red-500 hover:text-red-700 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 font-semibold"
                              onClick={() => handleRemovePromoCode(set.id)}
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                              onClick={() => handleApplyPromoCode(set.id)}
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Subtotal: ₹{set.subservices.reduce((acc, sub) => acc + (sub.amount * sub.quantity), 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Tax: ₹{set.subservices.reduce((acc, sub) => acc + (sub.tax_amount || 0), 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-semibold text-red-500 dark:text-red-400">
                      Discount: -₹{(Number(set.discount) || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm font-bold text-[#1c398e]">
                      Set Total: ₹{(set.subservices.reduce((total, sub) => total + (sub.amount * sub.quantity) + (sub.tax_amount || 0), 0) + (Number(set.service_fee) || 0) - (Number(set.discount) || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" onClick={handleAddServiceSet} className="w-full gap-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
            <PlusIcon className="h-4 w-4" /> Add Another Service Set
          </Button>
        </div>


        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b border-slate-200 dark:border-white/10 pb-2 mb-4 dark:text-white">Lead Management</h3>
          <FormField label="Status">
            <Select name="status" value={formData.status || ''} onChange={handleChange} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10">
              {LEAD_STATUSES.map(status => <option key={status} value={status} className="bg-slate-950 text-white">{status}</option>)}
            </Select>
          </FormField>
          <FormField label="Received Date">
            <Input 
              name="created_at" 
              type="date" 
              value={formData.created_at || ''} 
              onChange={handleChange} 
              max={new Date().toISOString().split('T')[0]}
            />
          </FormField>
          <FormField label="Priority">
            <Select name="priority" value={formData.priority || ''} onChange={handleChange} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10">
              {LEAD_PRIORITIES.map(p => <option key={p} value={p} className="bg-slate-950 text-white">{p}</option>)}
            </Select>
          </FormField>
          <FormField label="Assigned To">
            <Select name="assignedToId" value={formData.assignedToId || ''} onChange={handleChange} disabled={!canEditAssignee} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10">
              {users.map(user => <option key={user.id} value={user.id} className="bg-slate-950 text-white">{user.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Next Follow-Up">
            <Input name="next_follow_up" type="date" value={formData.next_follow_up || ''} onChange={handleChange} />
          </FormField>
          <FormField label="Lead Source">
            <Select name="source" value={formData.source || ''} onChange={handleChange} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10">
              <option value="" className="bg-slate-950 text-white">Select Lead Source</option>
              {leadSources.map(s => <option key={s.id} value={s.source_name} className="bg-slate-950 text-white">{s.source_name}</option>)}
            </Select>
          </FormField>
          {formData.source === 'Customer Referral' && (
            <FormField label="Referring Customer">
              <Select 
                name="referred_by_customer_id" 
                value={formData.referred_by_customer_id || ''} 
                onChange={handleChange}
                className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10"
              >
                <option value="" className="bg-slate-950 text-white">Select Referring Customer</option>
                {allCustomers.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-950 text-white">{c.name} ({c.phone})</option>
                ))}
              </Select>
            </FormField>
          )}
          {formData.source === 'Employer Referral' && (
            <FormField label="Referring Employee">
              <Select 
                name="referred_by_employee_id" 
                value={formData.referred_by_employee_id || ''} 
                onChange={handleChange}
                className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-slate-300 dark:border-white/10"
              >
                <option value="" className="bg-slate-950 text-white">Select Referring Employee</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id} className="bg-slate-950 text-white">{u.name} ({u.role})</option>
                ))}
              </Select>
            </FormField>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b border-slate-200 dark:border-white/10 pb-2 mb-4 dark:text-white">Payment Details</h3>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium text-slate-700 dark:text-slate-300">Total Payment (₹)</label>
            <div className="col-span-3">
              <Input name="total_payment" type="number" value={grandTotal} disabled className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>
        </div>

        {lead && onUploadDocument && onDeleteDocument && (
          <div className="space-y-4">
            <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
            <h3 className="text-lg font-medium border-b border-slate-200 dark:border-white/10 pb-2 mb-4 dark:text-white">Documents</h3>
            {lead.documents && lead.documents.length > 0 ? (
              <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {lead.documents.map(doc => (
                  <li key={doc.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-md group">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline text-slate-900 dark:text-white" title={doc.name}>
                      <span className="font-semibold">{doc.type}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">{doc.name}</span>
                    </a>
                    <Button type="button" variant="ghost" size="icon" onClick={() => onDeleteDocument(doc.id)} className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2Icon className="h-4 w-4 text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic text-center py-2">No documents uploaded.</p>
            )}
            <Button type="button" variant="outline" className="w-full" onClick={handleUploadClick} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload New Document'}
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/10">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="disabled:opacity-50">
            {isSubmitting ? 'Saving...' : (lead ? 'Save Changes' : 'Create Lead')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};