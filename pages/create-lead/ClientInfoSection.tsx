import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { UserIcon, BriefcaseIcon } from '../../components/icons';
import { BUSINESS_CATEGORIES, INDUSTRY_TYPES } from '../../constants';
import { SearchableCountrySelect } from './SearchableCountrySelect';
import { StructuredAddress } from './useCreateLeadForm';

interface ClientInfoSectionProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    panError: string;
    alternateMobile: string;
    setAlternateMobile: (val: string) => void;
    alternateIsWhatsapp: boolean;
    setAlternateIsWhatsapp: React.Dispatch<React.SetStateAction<boolean>>;
    businessErrors: any;
    personalAddress: StructuredAddress;
    handlePersonalAddressChange: (field: keyof StructuredAddress, value: string) => void;
    businessAddress: StructuredAddress;
    handleBusinessAddressChange: (field: keyof StructuredAddress, value: string) => void;
    isSameAddress: boolean;
    handleSameAddressChange: (checked: boolean) => void;
    addressErrors: any;
}

export const ClientInfoSection: React.FC<ClientInfoSectionProps> = ({
    formData,
    handleChange,
    panError,
    alternateMobile,
    setAlternateMobile,
    alternateIsWhatsapp,
    setAlternateIsWhatsapp,
    businessErrors,
    personalAddress,
    handlePersonalAddressChange,
    businessAddress,
    handleBusinessAddressChange,
    isSameAddress,
    handleSameAddressChange,
    addressErrors
}) => {
    return (
        <>
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
                        <label htmlFor="pan_number" className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
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
                                placeholder="e.g., Acme Corp" 
                                className={businessErrors.business_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {businessErrors.business_name && <p className="text-xs text-red-500 mt-1">{businessErrors.business_name}</p>}
                        </div>
                        <div>
                            <label htmlFor="business_category" className="block text-sm font-medium text-slate-700 mb-1">Business Category <span className="text-red-500">*</span></label>
                            <select 
                                id="business_category" 
                                name="business_category" 
                                value={formData.business_category} 
                                onChange={handleChange}
                                className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-[#1c398e] ${
                                    businessErrors.business_category ? 'border-red-500 focus:ring-red-500' : 'border-slate-300'
                                }`}
                            >
                                <option value="">Select Category</option>
                                {BUSINESS_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            {businessErrors.business_category && <p className="text-xs text-red-500 mt-1">{businessErrors.business_category}</p>}
                        </div>
                        <div>
                            <label htmlFor="industry_type" className="block text-sm font-medium text-slate-700 mb-1">Industry Type <span className="text-red-500">*</span></label>
                            <select 
                                id="industry_type" 
                                name="industry_type" 
                                value={formData.industry_type} 
                                onChange={handleChange}
                                className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-[#1c398e] ${
                                    businessErrors.industry_type ? 'border-red-500 focus:ring-red-500' : 'border-slate-300'
                                }`}
                            >
                                <option value="">Select Industry</option>
                                {INDUSTRY_TYPES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                            </select>
                            {businessErrors.industry_type && <p className="text-xs text-red-500 mt-1">{businessErrors.industry_type}</p>}
                        </div>
                    </div>

                    {/* Address Fields */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 border-t pt-8">
                        <div>
                            <h3 className="font-semibold text-slate-800 mb-4">Personal / Residential Address</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="personal_flat_no" className="block text-xs font-semibold text-slate-500 mb-1">Flat / Plot / House No.</label>
                                        <Input
                                            id="personal_flat_no"
                                            value={personalAddress.flatNo}
                                            onChange={(e) => handlePersonalAddressChange('flatNo', e.target.value)}
                                            placeholder="e.g., Flat 4B"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="personal_street" className="block text-xs font-semibold text-slate-500 mb-1">Street / Area <span className="text-red-500">*</span></label>
                                        <Input
                                            id="personal_street"
                                            value={personalAddress.street}
                                            onChange={(e) => handlePersonalAddressChange('street', e.target.value)}
                                            placeholder="e.g., Park Street"
                                            className={addressErrors.personal.street ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                        />
                                        {addressErrors.personal.street && <p className="text-xs text-red-500 mt-1">{addressErrors.personal.street}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="personal_city" className="block text-xs font-semibold text-slate-500 mb-1">City <span className="text-red-500">*</span></label>
                                        <Input
                                            id="personal_city"
                                            value={personalAddress.city}
                                            onChange={(e) => handlePersonalAddressChange('city', e.target.value)}
                                            placeholder="e.g., Kolkata"
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
                                            placeholder="e.g., West Bengal"
                                            className={addressErrors.personal.state ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                        />
                                        {addressErrors.personal.state && <p className="text-xs text-red-500 mt-1">{addressErrors.personal.state}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="personal_zip_code" className="block text-xs font-semibold text-slate-500 mb-1">ZIP / Postal Code <span className="text-red-500">*</span></label>
                                        <Input
                                            id="personal_zip_code"
                                            value={personalAddress.zipCode}
                                            onChange={(e) => handlePersonalAddressChange('zipCode', e.target.value)}
                                            placeholder="e.g., 700016"
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
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-800">Business / Office Address</h3>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="same_address"
                                        checked={isSameAddress}
                                        onChange={(e) => handleSameAddressChange(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-[#1c398e] focus:ring-[#1c398e]/50 cursor-pointer"
                                    />
                                    <label htmlFor="same_address" className="text-xs font-semibold text-slate-500 cursor-pointer">
                                        Same as Residential
                                    </label>
                                </div>
                            </div>

                            <div className={`space-y-4 transition-opacity duration-200 ${isSameAddress ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="business_flat_no" className="block text-xs font-semibold text-slate-500 mb-1">Flat / Plot / House No.</label>
                                        <Input
                                            id="business_flat_no"
                                            value={businessAddress.flatNo}
                                            onChange={(e) => handleBusinessAddressChange('flatNo', e.target.value)}
                                            placeholder="e.g., Office 302"
                                            disabled={isSameAddress}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="business_street" className="block text-xs font-semibold text-slate-500 mb-1">Street / Area {!isSameAddress && <span className="text-red-500">*</span>}</label>
                                        <Input
                                            id="business_street"
                                            value={businessAddress.street}
                                            onChange={(e) => handleBusinessAddressChange('street', e.target.value)}
                                            placeholder="e.g., Salt Lake Sector V"
                                            disabled={isSameAddress}
                                            className={!isSameAddress && addressErrors.business.street ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                        />
                                        {!isSameAddress && addressErrors.business.street && <p className="text-xs text-red-500 mt-1">{addressErrors.business.street}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="business_city" className="block text-xs font-semibold text-slate-500 mb-1">City {!isSameAddress && <span className="text-red-500">*</span>}</label>
                                        <Input
                                            id="business_city"
                                            value={businessAddress.city}
                                            onChange={(e) => handleBusinessAddressChange('city', e.target.value)}
                                            placeholder="e.g., Kolkata"
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
                                            placeholder="e.g., West Bengal"
                                            disabled={isSameAddress}
                                            className={!isSameAddress && addressErrors.business.state ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                        />
                                        {!isSameAddress && addressErrors.business.state && <p className="text-xs text-red-500 mt-1">{addressErrors.business.state}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="business_zip_code" className="block text-xs font-semibold text-slate-500 mb-1">ZIP / Postal Code {!isSameAddress && <span className="text-red-500">*</span>}</label>
                                        <Input
                                            id="business_zip_code"
                                            value={businessAddress.zipCode}
                                            onChange={(e) => handleBusinessAddressChange('zipCode', e.target.value)}
                                            placeholder="e.g., 700091"
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
                    </div>
                </CardContent>
            </Card>
        </>
    );
};
