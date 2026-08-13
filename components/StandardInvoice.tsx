import React, { useRef } from 'react';
import { Customer } from '../types';
import { Button } from './ui/Button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PrinterIcon, MessageSquareIcon, DownloadIcon } from 'lucide-react';

export interface InvoiceItem {
    name: string;
    description?: string;
    quantity: number;
    rate: number;
    taxAmount?: number;
    advance?: number;
    paymentMode?: string;
    discount?: number;
    total: number;
    date?: string;
}

export interface StandardInvoiceProps {
    customer: Customer;
    invoiceNumber: string;
    date: string;
    items: InvoiceItem[];
    subtotal: number;
    advanceAmount?: number;
    discount?: number;
    grandTotal: number;
    title?: string; // "INVOICE" or "RECEIPT"
    type?: 'invoice' | 'receipt';
    promoCode?: string;
    paymentMode?: string;
}

export const StandardInvoice: React.FC<StandardInvoiceProps> = ({
    customer,
    invoiceNumber,
    date,
    items,
    subtotal,
    advanceAmount = 0,
    discount = 0,
    grandTotal,
    title = "INVOICE",
    type = 'invoice',
    promoCode,
    paymentMode
}) => {
    const componentRef = useRef<HTMLDivElement>(null);

    const handleDownloadPDF = async () => {
        if (!componentRef.current) return;
        
        try {
            const canvas = await html2canvas(componentRef.current, {
                scale: 2, // Improve quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${invoiceNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. You can try the Print option and Save as PDF.");
        }
    };

    const handleShareWhatsApp = () => {
        const totalFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(grandTotal);
        // Using encodeURIComponent strictly for the message body
        const message = encodeURIComponent(`Halo ${customer.name},\n\n` +
            `Here is your ${title.toLowerCase()} from 24efiling.\n` +
            `Ref: ${invoiceNumber}\n` +
            `Date: ${date}\n` +
            `Total Amount: ${totalFormatted}\n\n` +
            `Please find the details attached/below.\n\nRegards,\n24efiling Pvt Ltd`);

        const phoneNumber = customer.phone;
        if (phoneNumber) {
            // Remove all non-numeric characters for the phone parameter
            const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
            // Ensure 91 prefix if 10 digits; otherwise assume it's correct or let WA handle it
            const finalNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
            // Use standard wa.me format
            window.open(`https://wa.me/${finalNumber}?text=${message}`, '_blank');
        } else {
            alert('Customer phone number is missing.');
        }
    };

    const handleShareGmail = () => {
        const totalFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(grandTotal);
        const subject = encodeURIComponent(`${title} #${invoiceNumber} from 24efiling`);
        const body = encodeURIComponent(`Dear ${customer.name},\n\n` +
            `Here is your ${title.toLowerCase()} from 24efiling.\n` +
            `Ref: ${invoiceNumber}\n` +
            `Date: ${date}\n` +
            `Total Amount: ${totalFormatted}\n\n` +
            `Please find the details attached/below.\n\nRegards,\n24efiling Pvt Ltd`);

        // Use standard mailto or Gmail web link. Gmail web link is more reliable for desktop browser usage.
        // mailto: works with system default client.
        // https://mail.google.com/mail/?view=cm&fs=1... specific to Gmail web.
        if (customer.email) {
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(customer.email)}&su=${subject}&body=${body}`;
            window.open(gmailUrl, '_blank');
        } else {
            alert('Customer email is missing.');
        }
    };

    return (
        <div className="bg-slate-50 p-4 rounded-lg">
            {/* Actions Bar */}
            <div className="flex justify-end gap-2 mb-4 no-print print:hidden">
                <Button size="sm" variant="outline" onClick={handleShareWhatsApp} className="gap-2 bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
                    <MessageSquareIcon className="h-4 w-4" />
                    WhatsApp
                </Button>
                <Button size="sm" variant="outline" onClick={handleShareGmail} className="gap-2 bg-red-50 text-red-700 hover:bg-red-100 border-red-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                    Gmail
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadPDF} className="gap-2 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900">
                    <DownloadIcon className="h-4 w-4" />
                    Download PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-2 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900">
                    <PrinterIcon className="h-4 w-4" />
                    Print
                </Button>
            </div>

            {/* Invoice Container */}
            <div ref={componentRef} className="bg-white p-8 max-w-5xl mx-auto border shadow-sm text-sm text-slate-800" id="printable-invoice">
                {/* Header */}
                {/* Header: Title, Meta, Logo */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-[#1c398e] tracking-tight">{title}</h1>
                        <div className="mt-2 text-sm text-slate-500 space-y-1">
                            <p className="font-medium">Ref: <span className="text-slate-800">{invoiceNumber}</span></p>
                            <p className="font-medium">Date: <span className="text-slate-800">{date}</span></p>
                        </div>
                    </div>
                    <div className="h-20 w-64 flex items-center justify-end">
                         <img src="/logo.png" alt="24 eFiling" className="h-full object-contain" onError={(e) => {
                             (e.target as HTMLImageElement).style.display = 'none';
                             (e.target as HTMLImageElement).parentElement!.innerText = '24 eFiling';
                         }} />
                    </div>
                </div>

                {/* Addresses Row: Bill To & From */}
                <div className="grid grid-cols-2 gap-12 mb-8 items-start">
                    {/* Bill To */}
                    <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Bill To</h3>
                        <p className="font-bold text-slate-900 text-base">{customer.business_name || customer.name}</p>
                        {(customer as any).reference_number && (
                            <p className="text-xs font-mono font-semibold text-[#1c398e] mt-0.5">Customer Ref: {(customer as any).reference_number}</p>
                        )}
                        <p className="text-slate-600 text-sm">{customer.name}</p>
                        <p className="text-slate-600 text-sm">{customer.email}</p>
                        <p className="text-slate-600 text-sm">{customer.phone}</p>
                        {customer.business_address && <p className="text-slate-600 text-sm mt-1 leading-relaxed">{customer.business_address}</p>}
                    </div>

                    {/* From Address */}
                    <div className="text-right pt-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">From</h3>
                        <p className="font-bold text-slate-900 text-lg">24 eFiling</p>
                        <div className="text-sm text-slate-500 space-y-0.5">
                            <p>#19, Road No.2B, Chandrapuri Colony</p>
                            <p>LB Nagar, Hyderabad – 500081</p>
                            <p>Telangana, India</p>
                            <p className="mt-2">support@24efiling.com</p>
                            <p className="font-medium">Ph: 81870 44222</p>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-0">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#1c398e] text-white text-xs uppercase tracking-wider">
                                <th className="py-3 px-2 text-left font-semibold rounded-tl-md">Description</th>
                                <th className="py-3 px-2 text-center font-semibold w-24">Date</th>
                                <th className="py-3 px-2 text-center font-semibold w-16">Qty</th>
                                <th className="py-3 px-2 text-right font-semibold w-24">Rate</th>
                                <th className="py-3 px-2 text-right font-semibold w-20">Tax</th>
                                <th className="py-3 px-2 text-right font-semibold w-24">Discount</th>
                                <th className="py-3 px-2 text-right font-semibold w-24">Advance</th>
                                <th className="py-3 px-2 text-right font-semibold rounded-tr-md w-24">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 border-x border-b border-slate-200">
                            {items.map((item, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                    <td className="py-3 px-4">
                                        <p className="font-medium text-slate-900">{item.name}</p>
                                        {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                                    </td>
                                    <td className="py-3 px-4 text-center text-slate-600 font-mono text-xs">
                                        {item.date || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-center text-slate-600">{item.quantity}</td>
                                    <td className="py-3 px-4 text-right text-slate-600">
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.rate)}
                                    </td>
                                    <td className="py-3 px-4 text-right text-slate-600">
                                        {item.taxAmount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.taxAmount) : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right text-red-500">
                                        {item.discount ? '-' + new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.discount) : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right text-slate-600">
                                        {item.advance ? (
                                            <>
                                                <div>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.advance)}</div>
                                                {item.paymentMode && <div className="text-[10px] text-slate-400 mt-0.5">{item.paymentMode}</div>}
                                            </>
                                        ) : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end pt-4 mb-8">
                    <div className="w-72 space-y-3">
                        {subtotal !== grandTotal && (
                             <div className="flex justify-between text-slate-600">
                                <span>Subtotal:</span>
                                <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(subtotal)}</span>
                            </div>
                        )}
                        {discount > 0 && (
                            <div className="flex justify-between text-red-500 font-medium">
                                <span>Discount{promoCode ? ` (${promoCode})` : ''}:</span>
                                <span>- {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(discount)}</span>
                            </div>
                        )}
                        {/* Add tax summary if needed */}
                        
                        <div className="flex justify-between text-lg font-bold text-[#1c398e] border-t-2 border-slate-100 pt-3">
                            <span>Total:</span>
                            <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(grandTotal)}</span>
                        </div>

                        {type === 'invoice' && advanceAmount > 0 && (
                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between text-green-600 font-medium">
                                    <span>Advance Paid{paymentMode ? ` (${paymentMode})` : ''}:</span>
                                    <span>- {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(advanceAmount)}</span>
                                </div>
                                <div className="flex justify-between text-slate-800 font-bold border-t border-dashed border-slate-300 pt-2">
                                    <span>Balance Due:</span>
                                    <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.max(0, grandTotal - advanceAmount))}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer / Terms */}
                <div className="mt-auto pt-8 border-t border-slate-200">
                    <div className="grid grid-cols-3 gap-8 items-end">
                        <div>
                            <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase">Bank Details</h4>
                            <div className="text-xs text-slate-600 space-y-1">
                                <p>Bank: <span className="font-medium text-slate-800">Bank of Maharashtra</span></p>
                                <p>Account: <span className="font-medium text-slate-800">60486598973</span></p>
                                <p>IFSC: <span className="font-medium text-slate-800">MAHB0002556</span></p>
                                <p>Branch: <span className="font-medium text-slate-800">HAYATNAGAR</span></p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase">Scan & Pay</h4>
                             <div className="h-56 w-56 bg-white p-1 border rounded shadow-sm flex items-center justify-center">
                                 <img src="/payment-scanner.png" alt="Scan to Pay" className="max-h-full max-w-full" onError={(e) => {
                                     (e.target as HTMLImageElement).style.display = 'none';
                                 }} />
                             </div>
                        </div>
                        <div className="text-right">
                             <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase">Authorized Signatory</h4>
                             <div className="h-16 w-32 ml-auto mb-2 flex items-center justify-end">
                                 <img src="/signature.png" alt="Authorized Signature" className="h-full object-contain" onError={(e) => {
                                     (e.target as HTMLImageElement).style.display = 'none';
                                     (e.target as HTMLImageElement).parentElement!.innerText = 'Authorized Signatory';
                                 }} />
                             </div>
                             <p className="text-xs font-bold text-slate-800">Scion Financials Services Pvt. Ltd.</p>
                        </div>
                    </div>
                    
                    <div className="mt-8 text-center text-[10px] text-slate-400">
                        <p>This is a computer generated document and does not require a physical signature.</p>
                        <p className="mt-1">Ranked #1 in Hyderabad for Financial Services.</p>
                        <p className="mt-1 font-semibold text-slate-500">* Terms and Conditions Apply *</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
