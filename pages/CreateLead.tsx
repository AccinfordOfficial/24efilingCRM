import React from 'react';
import { Lead, User, Service, Offer } from '../types';
import { Button } from '../components/ui/Button';
import { PlusCircleIcon } from '../components/icons';
import { useCreateLeadForm } from './create-lead/useCreateLeadForm';
import { ClientInfoSection } from './create-lead/ClientInfoSection';
import { ServiceSetBuilder } from './create-lead/ServiceSetBuilder';
import { ReferralSection } from './create-lead/ReferralSection';
import { PricingCalculator } from './create-lead/PricingCalculator';

interface CreateLeadProps {
    onAddLead: (lead: Omit<Lead, 'id' | 'created_at' | 'last_contacted' | 'status' | 'assigned_to' | 'service_requested'>, assignedToId: string | null) => void;
    onCancel: () => void;
    salesExecutives: User[];
    services: Service[];
    leads: Lead[];
    offers: Offer[];
}

const CreateLead: React.FC<CreateLeadProps> = (props) => {
    const { onCancel, salesExecutives } = props;
    const form = useCreateLeadForm(props);

    return (
        <div className="max-w-[95%] mx-auto space-y-8">
            <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center shadow-lg">
                    <PlusCircleIcon className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Create New Lead</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Fill in the details below to add a new lead to the system</p>
            </div>

            <form onSubmit={form.handleSubmit}>
                <div className="space-y-6">
                    <ClientInfoSection 
                        formData={form.formData}
                        handleChange={form.handleChange}
                        panError={form.panError}
                        alternateMobile={form.alternateMobile}
                        setAlternateMobile={form.setAlternateMobile}
                        alternateIsWhatsapp={form.alternateIsWhatsapp}
                        setAlternateIsWhatsapp={form.setAlternateIsWhatsapp}
                        businessErrors={form.businessErrors}
                        personalAddress={form.personalAddress}
                        handlePersonalAddressChange={form.handlePersonalAddressChange}
                        businessAddress={form.businessAddress}
                        handleBusinessAddressChange={form.handleBusinessAddressChange}
                        isSameAddress={form.isSameAddress}
                        handleSameAddressChange={form.handleSameAddressChange}
                        addressErrors={form.addressErrors}
                    />

                    <ServiceSetBuilder 
                        serviceSets={form.serviceSets}
                        activeServices={form.activeServices}
                        getAvailableOffers={form.getAvailableOffers}
                        handleSetChange={form.handleSetChange}
                        handleAddSubservice={form.handleAddSubservice}
                        getSubServicesForSelection={form.getSubServicesForSelection}
                        handleSubserviceDetailChange={form.handleSubserviceDetailChange}
                        handleRemoveSubservice={form.handleRemoveSubservice}
                        handleDiscountChange={form.handleDiscountChange}
                        handleRemovePromoCode={form.handleRemovePromoCode}
                        handleApplyPromoCode={form.handleApplyPromoCode}
                        handleApplyPromoCodeWithCode={form.handleApplyPromoCodeWithCode}
                        handleRemoveServiceSet={form.handleRemoveServiceSet}
                        handleAddServiceSet={form.handleAddServiceSet}
                    />

                    <ReferralSection 
                        formData={form.formData}
                        handleChange={form.handleChange}
                        assignedToId={form.assignedToId}
                        setAssignedToId={form.setAssignedToId}
                        salesExecutives={salesExecutives}
                        leadSources={form.leadSources}
                        allCustomers={form.allCustomers}
                        allUsers={form.allUsers}
                    />

                    <PricingCalculator 
                        serviceSets={form.serviceSets}
                        selectedServiceIdForPayment={form.selectedServiceIdForPayment}
                        handlePaymentServiceSelectionChange={form.handlePaymentServiceSelectionChange}
                        tempPaymentMode={form.tempPaymentMode}
                        setTempPaymentMode={form.setTempPaymentMode}
                        tempAdvanceAmount={form.tempAdvanceAmount}
                        setTempAdvanceAmount={form.setTempAdvanceAmount}
                        handleUpdateAdvanceAmount={form.handleUpdateAdvanceAmount}
                        totalAdvance={form.totalAdvance}
                        grandTotal={form.grandTotal}
                        remainingAmount={form.remainingAmount}
                        refNumber={form.refNumber}
                        formData={form.formData}
                    />
                </div>

                <div className="bg-white dark:bg-slate-900/60 p-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Grand Total:</span>
                        <p className="text-2xl font-bold text-primary">₹{form.grandTotal.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={form.isSubmitting} className="dark:bg-slate-900 dark:border-white/10 dark:text-slate-300">Cancel</Button>
                        <Button type="submit" disabled={form.isSubmitting} className="bg-primary text-primary-foreground hover:opacity-90 font-semibold disabled:opacity-50">
                            {form.isSubmitting ? 'Creating Lead...' : 'Create Lead'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>

    );
};

export default CreateLead;
