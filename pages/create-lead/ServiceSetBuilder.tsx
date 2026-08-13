import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { CheckCircleIcon, Trash2Icon, PlusIcon } from '../../components/icons';
import { ServiceSet, Service } from '../../types';

interface ServiceSetBuilderProps {
    serviceSets: ServiceSet[];
    activeServices: Service[];
    getAvailableOffers: (mainServiceName: string) => any[];
    handleSetChange: (setId: string, field: 'mainService' | 'promo_code', value: string) => void;
    handleAddSubservice: (setId: string, subserviceName: string) => void;
    getSubServicesForSelection: (mainServiceName: string) => string[];
    handleSubserviceDetailChange: (setId: string, subserviceName: string, field: 'quantity' | 'amount' | 'is_tax_applicable' | 'tax_amount', value: string) => void;
    handleRemoveSubservice: (setId: string, subserviceNameToRemove: string) => void;
    handleDiscountChange: (setId: string, value: string) => void;
    handleRemovePromoCode: (setId: string) => void;
    handleApplyPromoCode: (setId: string) => void;
    handleApplyPromoCodeWithCode: (setId: string, codeToApply: string) => void;
    handleRemoveServiceSet: (setId: string) => void;
    handleAddServiceSet: () => void;
}

export const ServiceSetBuilder: React.FC<ServiceSetBuilderProps> = ({
    serviceSets,
    activeServices,
    getAvailableOffers,
    handleSetChange,
    handleAddSubservice,
    getSubServicesForSelection,
    handleSubserviceDetailChange,
    handleRemoveSubservice,
    handleDiscountChange,
    handleRemovePromoCode,
    handleApplyPromoCode,
    handleApplyPromoCodeWithCode,
    handleRemoveServiceSet,
    handleAddServiceSet
}) => {
    return (
        <div className="space-y-6">
            {serviceSets.map((set, setIndex) => (
                <Card key={set.id} className="dark:bg-slate-900/80 dark:border-white/10 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex flex-row items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-emerald-500/20 text-green-600 dark:text-emerald-400">
                                <CheckCircleIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="dark:text-white">Service Details {serviceSets.length > 1 ? `#${setIndex + 1} ` : ''}</CardTitle>
                                <CardDescription className="dark:text-slate-400">Select the services required by the lead.</CardDescription>
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
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Main Service Category</label>
                            <Select value={set.mainService} onChange={(e) => handleSetChange(set.id, 'mainService', e.target.value)} className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
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
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Sub-services</label>
                            <Select onChange={(e) => { handleAddSubservice(set.id, e.target.value); (e.target as HTMLSelectElement).selectedIndex = 0; }} className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                                <option value="" disabled className="bg-slate-950 text-white">
                                    {getSubServicesForSelection(set.mainService).length > 0 
                                        ? "Add a sub-service..." 
                                        : "No sub-services defined in catalog for this category"}
                                </option>
                                {getSubServicesForSelection(set.mainService)
                                    .filter(sub => !set.subservices.some(s => s.name === sub))
                                    .map(sub => <option key={sub} value={sub} className="bg-slate-950 text-white">{sub}</option>)}
                            </Select>
                        </div>
                        {set.subservices.length > 0 && (
                            <div className="space-y-2 pt-2">
                                {set.subservices.map(sub => {
                                    const mainServiceObj = activeServices.find(s => s.name === set.mainService);
                                    const subServiceObj = mainServiceObj?.sub_services?.find(sDef => sDef.name === sub.name);
                                    const requiredDocs = subServiceObj?.required_documents || [];

                                    return (
                                        <div key={sub.name} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5">
                                            <span className="col-span-12 sm:col-span-4 text-sm text-slate-700 dark:text-slate-300 font-medium">{sub.name}</span>
                                            <div className="col-span-6 sm:col-span-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Qty"
                                                    value={String(sub.quantity)}
                                                    onChange={(e) => handleSubserviceDetailChange(set.id, sub.name, 'quantity', e.target.value)}
                                                    min="1"
                                                    className="h-8 bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10"
                                                />
                                            </div>
                                            <div className="col-span-5 sm:col-span-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Amount (₹)"
                                                    value={sub.amount === 0 ? '' : String(sub.amount)}
                                                    onChange={(e) => handleSubserviceDetailChange(set.id, sub.name, 'amount', e.target.value)}
                                                    className="h-8 bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10"
                                                />
                                            </div>
                                            <div className="col-span-12 sm:col-span-3 flex items-center gap-2">
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!sub.is_tax_applicable}
                                                        onChange={(e) => handleSubserviceDetailChange(set.id, sub.name, 'is_tax_applicable', e.target.checked ? 'true' : 'false')}
                                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                                        title="Tax Applicable"
                                                    />
                                                </div>
                                                {sub.is_tax_applicable && (
                                                    <Input
                                                        type="number"
                                                        placeholder="Tax (₹)"
                                                        value={sub.tax_amount || ''}
                                                        onChange={(e) => handleSubserviceDetailChange(set.id, sub.name, 'tax_amount', e.target.value)}
                                                        className="h-8 w-full bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10"
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
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-b-xl border-t border-slate-200 dark:border-white/10">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-3 w-full border-b pb-4 border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Discount:</label>
                                <div className="relative w-32">
                                    <span className="absolute left-3 top-2 text-slate-500 dark:text-slate-400 text-sm">₹</span>
                                    <Input
                                        type="number"
                                        value={set.discount || ''}
                                        onChange={(e) => handleDiscountChange(set.id, e.target.value)}
                                        className="pl-6 h-9 bg-white dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10"
                                        placeholder="0"
                                        readOnly={!!set.promo_code && (set.discount || 0) > 0}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Promo Code:</label>
                                <div className="flex gap-1 items-center">
                                    <Input
                                        value={set.promo_code || ''}
                                        onChange={(e) => handleSetChange(set.id, 'promo_code', e.target.value.toUpperCase())}
                                        placeholder="CODE"
                                        className="h-9 w-28 uppercase bg-white dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10"
                                        readOnly={!!set.promo_code && (set.discount || 0) > 0}
                                    />
                                    {set.promo_code && (set.discount || 0) > 0 ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-9 text-xs px-2 text-red-500 hover:text-red-700 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 font-semibold"
                                            onClick={() => handleRemovePromoCode(set.id)}
                                        >
                                            Remove
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-9 text-xs px-2 bg-primary text-primary-foreground hover:opacity-90 font-bold"
                                            onClick={() => handleApplyPromoCode(set.id)}
                                        >
                                            Apply
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Advance:</label>
                                <span className="font-bold text-slate-600 dark:text-slate-300">₹{(set.advance_amount || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                        <div className="flex justify-end gap-6 w-full items-center">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                Subtotal: ₹{set.subservices.reduce((acc, sub) => acc + (sub.amount * sub.quantity), 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                Tax: ₹{set.subservices.reduce((acc, sub) => acc + (sub.tax_amount || 0), 0).toLocaleString('en-IN')}
                            </span>
                            {(set.discount || 0) > 0 && (
                                <span className="text-sm font-semibold text-red-500 dark:text-red-400">
                                    Discount: -₹{(set.discount || 0).toLocaleString('en-IN')}
                                </span>
                            )}
                            <span className="text-sm font-bold text-primary">
                                Set Total: ₹{(set.subservices.reduce((total, sub) => total + (sub.amount * sub.quantity) + (sub.tax_amount || 0), 0) + (set.service_fee || 0) - (set.discount || 0)).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </CardFooter>
                </Card>
            ))}
            <Button type="button" variant="outline" onClick={handleAddServiceSet} className="w-full gap-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
                <PlusIcon className="h-4 w-4" /> Add Another Service Set
            </Button>
        </div>
    );
};
