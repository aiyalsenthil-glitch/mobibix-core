
import { PrintDocumentData } from "@/lib/print/types";
import { InvoiceHeader } from "../headers/InvoiceHeader";
import { QRCodeSVG } from "qrcode.react";

export function JobCardDetailed({ data }: { data: PrintDocumentData }) {
    const { header, meta, items, notes, footer, customer, qrCode } = data;

    return (
        <div className="flex flex-col h-full font-sans text-xs text-gray-900 leading-snug">
            {/* Header Block */}
            <div className="border-2 border-gray-800 rounded-lg p-4 mb-4">
                <InvoiceHeader data={data} />
            </div>

            {/* Meta Grid & QR */}
            <div className="grid grid-cols-[1fr_auto] gap-4 mb-4">
                 <div className="grid grid-cols-2 gap-px bg-gray-300 border border-gray-300">
                    {Object.entries(meta).map(([key, value]) => (
                        <div key={key} className="bg-white p-2 flex justify-between items-center">
                            <span className="font-bold text-gray-600 uppercase text-[10px]">{key}</span>
                            <span className="font-bold text-sm">{value}</span>
                        </div>
                    ))}
                    {customer.name && (
                         <div className="bg-white p-2 flex justify-between items-center col-span-2">
                             <span className="font-bold text-gray-600 uppercase text-[10px]">Customer</span>
                             <span className="font-bold">{customer.name} {customer.phone ? `(${customer.phone})` : ''}</span>
                         </div>
                    )}
                </div>
                {qrCode && (
                    <div className="border border-gray-300 p-2 bg-white flex flex-col items-center justify-center w-[120px]">
                        <QRCodeSVG value={qrCode} size={80} />
                        <span className="text-[9px] mt-1 font-mono text-center">SCAN TO TRACK</span>
                    </div>
                )}
            </div>

            {/* Detailed Items Table */}
            <div className="border border-gray-800 rounded-lg overflow-hidden mb-4">
                 <table className="w-full">
                    <thead className="bg-gray-800 text-white text-[10px] uppercase">
                        <tr>
                            <th className="py-2 px-3 text-left w-1/3">Device / Item</th>
                            <th className="py-2 px-3 text-left w-1/2">Problem / Description</th>
                            <th className="py-2 px-3 text-right">Est. Cost</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {items?.map((item, i) => (
                            <tr key={i}>
                                <td className="py-3 px-3 align-top font-bold">{item.name}</td>
                                <td className="py-3 px-3 align-top">
                                    <div className="whitespace-pre-wrap">{item.description}</div>
                                </td>
                                <td className="py-3 px-3 align-top text-right font-mono text-sm">₹{item.rate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Service Checklist Placeholder (for manual marking) */}
            <div className="mb-4 grid grid-cols-2 gap-4">
                <div className="border border-gray-300 p-3 rounded h-32 bg-gray-50">
                    <h4 className="font-bold text-[10px] uppercase mb-2 border-b border-gray-200 pb-1">Technician Checklist</h4>
                    <div className="space-y-1.5 text-[10px] text-gray-500">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 border border-gray-400 rounded-sm"></div> Physical Damage Check</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 border border-gray-400 rounded-sm"></div> Power / Battery Check</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 border border-gray-400 rounded-sm"></div> Data Backup Confirmed</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 border border-gray-400 rounded-sm"></div> Final Functional Test</div>
                    </div>
                </div>
                 <div className="border border-gray-300 p-3 rounded h-32 bg-gray-50">
                     <h4 className="font-bold text-[10px] uppercase mb-2 border-b border-gray-200 pb-1">Customer Remarks / Notes</h4>
                     <ul className="list-disc list-inside text-[11px]">
                        {notes?.map((n, i) => <li key={i}>{n}</li>)}
                     </ul>
                 </div>
            </div>

            {/* Footer Terms */}
            <div className="mt-auto border-t-2 border-gray-800 pt-4">
                 <div className="text-[10px] text-gray-600 mb-6 text-justify leading-tight columns-2 gap-6">
                    {footer?.terms?.map((term, index) => (
                        <p key={index} className="mb-1">• {term}</p>
                    ))}
                 </div>
                 
                 <div className="flex justify-between items-end pb-4 px-4">
                     <div className="text-center">
                         <div className="h-10 w-40 border-b border-gray-800 mb-1"></div>
                         <span className="font-bold text-[10px] uppercase">Customer Signature</span>
                     </div>
                     <div className="text-center">
                         <div className="h-10 w-40 border-b border-gray-800 mb-1"></div>
                         <span className="font-bold text-[10px] uppercase">Shop Authority</span>
                     </div>
                 </div>
                 <div className="text-center text-[9px] text-gray-400 mt-2">
                     {footer?.text}
                 </div>
            </div>
        </div>
    );
}
