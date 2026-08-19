import React, { useState } from 'react';
import { Button } from './ui/Button';
import { DownloadIcon } from './icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface CustomPaymentExportProps {
    transactions: any[];
    dateRange: { from: string; to: string };
}

const CustomPaymentExport: React.FC<CustomPaymentExportProps> = ({ transactions, dateRange }) => {
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    const exportToPDF = () => {
        const doc = new jsPDF();

        // Add Header
        doc.setFontSize(20);
        doc.text('Payment Transactions Report', 14, 22);
        
        doc.setFontSize(11);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        if (dateRange.from && dateRange.to) {
             doc.text(`Period: ${new Date(dateRange.from).toLocaleDateString()} - ${new Date(dateRange.to).toLocaleDateString()}`, 14, 36);
        }

        const tableColumn = ["Transaction ID", "Customer", "Amount (INR)", "Status", "Date", "Order ID"];
        const tableRows: any[] = [];

        transactions.forEach(txn => {
            const txnData = [
                txn.transactionId,
                txn.customer,
                txn.amount.toLocaleString('en-IN'),
                txn.status,
                new Date(txn.date).toLocaleDateString('en-GB'),
                txn.orderId,
            ];
            tableRows.push(txnData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        });

        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payment_report_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(transactions.map(txn => ({
            "Transaction ID": txn.transactionId,
            "Customer": txn.customer,
            "Amount": txn.amount,
            "Status": txn.status,
            "Date": new Date(txn.date).toLocaleDateString('en-GB'),
            "Order ID": txn.orderId
        })));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payment_report_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    return (
        <div className="relative inline-block text-left">
            <div>
                <Button 
                    variant="outline" 
                    className="w-full sm:w-auto gap-2"
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                >
                    <DownloadIcon className="h-4 w-4" />
                    Export
                </Button>
            </div>

            {isExportMenuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        <button
                            onClick={exportToPDF}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                            Export as PDF
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                            Export as Excel
                        </button>
                    </div>
                </div>
            )}
            {/* Overlay to close menu on click outside */}
             {isExportMenuOpen && (
                <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setIsExportMenuOpen(false)}
                ></div>
            )}
        </div>
    );
};

export default CustomPaymentExport;
