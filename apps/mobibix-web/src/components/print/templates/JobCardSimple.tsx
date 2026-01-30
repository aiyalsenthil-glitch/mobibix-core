import { PrintDocumentData } from "@/lib/print/types";
import { InvoiceHeader } from "../headers/InvoiceHeader";
import { QRCodeSVG } from "qrcode.react";

export function JobCardSimple({ data }: { data: PrintDocumentData }) {
    const { header, meta, customer, footer, qrCode } = data;

    // Helper to get meta value safely
    const getMeta = (key: string) => meta[key] !== undefined ? meta[key] : "N/A";
    const formatCurrency = (val: string | number | undefined) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return `₹${(num || 0).toLocaleString('en-IN')}`;
    };

    return (
        <div className="flex flex-col h-full font-sans text-xs text-gray-900 leading-relaxed max-w-[210mm] mx-auto p-12">
            {/* Header */}
            <div className="mb-4">
                 <InvoiceHeader data={data} />
            </div>

            {/* Main Grid Layout */}
            <div className="flex flex-col gap-4">
                
                {/* Top Row: Customer & Issue */}
                <div className="flex gap-4 items-stretch">
                     {/* Left Column Container */}
                     <div className="w-[45%] flex flex-col gap-4">
                        
                        {/* Customer Info */}
                        <div className="border border-gray-200 rounded p-3 bg-gray-50/50 h-full">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 pb-1 border-b border-gray-200">
                                Customer Information
                            </h3>
                            <div className="grid grid-cols-[80px_1fr] gap-y-1 text-sm">
                                <span className="text-gray-500 text-xs">Name:</span>
                                <span className="font-bold">{customer.name}</span>
                                
                                <span className="text-gray-500 text-xs">Phone:</span>
                                <span className="font-bold font-mono">{customer.phone}</span>
                                
                                <span className="text-gray-500 text-xs">Alt. Phone:</span>
                                <span>{data.customer.address || "N/A"}</span>
                            </div>
                        </div>

                         {/* Device Info (Stacked below Customer) */}
                         <div className="border border-gray-200 rounded p-3 bg-gray-50/50 h-full">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 pb-1 border-b border-gray-200">
                                Device Information
                            </h3>
                            <div className="grid grid-cols-[80px_1fr] gap-y-1 text-sm">
                                <span className="text-gray-500 text-xs">Type:</span>
                                <span className="font-medium">{getMeta("Device Type")}</span>

                                <span className="text-gray-500 text-xs">Brand/Model:</span>
                                <span className="font-bold">{getMeta("Device Brand")} {getMeta("Device Model")}</span>
                                
                                <span className="text-gray-500 text-xs">IMEI/Serial:</span>
                                <span className="font-mono">{getMeta("Device Serial")}</span>
                            </div>
                        </div>

                     </div>

                     {/* Right Column: Issue & Condition (Full height of left two) */}
                     <div className="flex-1 border border-gray-200 rounded p-3 bg-gray-50/50">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 pb-1 border-b border-gray-200">
                            Issue & Condition
                        </h3>
                        
                        <div className="mb-4">
                            <span className="block text-gray-500 text-[10px] uppercase mb-1">Customer Complaint</span>
                            <div className="p-2 border border-gray-200 bg-white rounded min-h-[60px] whitespace-pre-wrap font-medium">
                                {getMeta("Complaint")}
                            </div>
                        </div>

                        <div>
                            <span className="block text-gray-500 text-[10px] uppercase mb-1">Observed Physical Condition</span>
                            <div className="p-2 border border-gray-200 bg-white rounded min-h-[40px] whitespace-pre-wrap text-gray-700">
                                {getMeta("Condition")}
                            </div>
                        </div>
                     </div>
                </div>

                {/* Financials & Delivery Bar */}
                <div className="border border-gray-200 rounded p-3 bg-gray-50/50">
                     <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 pb-1 border-b border-gray-200">
                        Financials & Delivery
                    </h3>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex gap-8">
                             <div className="flex items-center gap-2">
                                <span className="text-gray-500">Estimated Budget:</span>
                                <span className="font-bold text-base">{formatCurrency(getMeta("Estimated Cost"))}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-gray-500">Advance Paid:</span>
                                <span className="font-bold">{formatCurrency(getMeta("Advance Paid"))}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-gray-500">Balance Due:</span>
                                <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                    {formatCurrency(getMeta("Balance Due"))}
                                </span>
                             </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Est. Delivery:</span>
                            <span className="font-bold text-blue-800">{getMeta("Est. Delivery")}</span>
                        </div>
                    </div>
                </div>

            </div>

             {/* Footer area */}
             <div className="mt-auto pt-6 border-t border-dashed border-gray-300">
                <div className="flex justify-between items-start">
                     {/* Terms */}
                     <div className="flex-1 max-w-[65%] text-[10px] text-gray-600">
                        <h4 className="font-bold text-gray-800 mb-1 uppercase">Terms & Conditions</h4>
                        <ol className="list-decimal list-inside space-y-0.5">
                             {footer?.terms?.slice(0, 5).map((term, i) => ( // Show up to 5 terms
                                 <li key={i}>{term}</li>
                             ))}
                        </ol>
                     </div>

                     {/* Signatures & QR */}
                     <div className="flex items-end gap-6">
                        <div className="text-center">
                            <div className="h-10 border-b border-gray-300 w-32 mb-1"></div>
                            <span className="text-[10px] text-gray-500 uppercase">Customer Signature</span>
                        </div>
                         {qrCode && (
                            <div className="flex flex-col items-center">
                                <QRCodeSVG value={qrCode} size={64} level="M" />
                                <span className="text-[9px] mt-1 text-gray-500 uppercase tracking-tight">Scan for Status</span>
                            </div>
                        )}
                        <div className="text-center">
                            <div className="h-10 border-b border-gray-300 w-32 mb-1"></div>
                            <span className="text-[10px] text-gray-500 uppercase">Staff Signature</span>
                        </div>
                     </div>
                </div>
             </div>
        </div>
    );
}
