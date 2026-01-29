import type { PrintDocumentData } from "@/lib/print/types";
import { QRCodeSVG } from "qrcode.react";

export function JobCardClassic({ data }: { data: PrintDocumentData }) {
  const { header, meta, customer, items, notes, footer, qrCode } = data;

  return (
    <div className="w-[210mm] min-h-[297mm] mx-auto bg-white p-12 text-black">
      {/* Header */}
      <div className="border-b-2 border-slate-800 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div className="flex gap-6">
            {header.logoUrl && (
              <div className="w-24 h-24 relative mr-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                    src={header.logoUrl} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-slate-800 tracking-tight mb-2">{header.shopName}</h1>
              {header.addressLines.map((line, i) => (
                <p key={i} className="text-sm text-slate-600 uppercase tracking-wide">{line}</p>
              ))}
              <div className="flex gap-4 mt-3 text-sm text-slate-600 font-medium">
                  {header.contactInfo.map((info, i) => (
                      <span key={i}>{info}</span>
                  ))}
              </div>
              {header.gstNumber && <p className="text-sm font-bold mt-2 text-slate-700">GSTIN: {header.gstNumber}</p>}
            </div>
          </div>
          <div className="text-right">
            {qrCode && (
                 <div className="flex justify-end mb-3">
                     <QRCodeSVG value={qrCode} size={80} level="M" />
                 </div>
            )}
            <h2 className="text-3xl font-bold text-slate-800 uppercase tracking-widest border-4 border-slate-800 px-4 py-2 inline-block">JOB CARD</h2>
            <div className="mt-4 space-y-1">
                <p className="font-bold text-xl text-slate-900">#{meta["Job No"]}</p>
                <p className="text-sm text-slate-500">Date: {meta["Date"]}</p>
                <div className="inline-block bg-slate-100 px-3 py-1 rounded text-sm font-bold uppercase mt-2 border border-slate-200">
                    {meta["Status"]}
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer & Device Row */}
      <div className="flex gap-8 mb-8">
          {/* Customer */}
          <div className="flex-1 bg-slate-50 p-6 rounded-lg border border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Customer Details</h3>
            <p className="font-bold text-xl text-slate-900 mb-1">{customer.name}</p>
            <p className="text-slate-600 font-medium">{customer.phone}</p>
            {customer.address && <p className="text-sm text-slate-500 mt-2">{customer.address}</p>}
          </div>

          {/* Job Dates */}
          <div className="w-1/3 bg-slate-50 p-6 rounded-lg border border-slate-100">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Scheduling</h3>
             <div className="space-y-4">
                 <div>
                     <p className="text-xs text-slate-500 uppercase">Estimated Delivery</p>
                     <p className="font-bold text-lg text-slate-900">{meta["Est. Delivery"]}</p>
                 </div>
                 <div>
                     <p className="text-xs text-slate-500 uppercase">Estimated Cost</p>
                     <p className="font-bold text-lg text-slate-900">₹{data.totals?.grandTotal.toFixed(2)}</p>
                 </div>
             </div>
          </div>
      </div>

      {/* Device & Issue Details */}
      <div className="mb-12">
        <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-6 uppercase tracking-wide">Reported Issues & Device Information</h3>
        
        {items && items.length > 0 && (
             <div className="mb-8">
                 <table className="w-full border-collapse">
                     <thead className="bg-slate-100">
                         <tr>
                             <th className="py-3 px-4 text-left text-xs font-bold text-slate-600 uppercase w-1/3 border border-slate-200">Device</th>
                             <th className="py-3 px-4 text-left text-xs font-bold text-slate-600 uppercase border border-slate-200">Problem Description</th>
                         </tr>
                     </thead>
                     <tbody>
                         {items.map((item, i) => (
                             <tr key={item.id} className="border-b border-slate-100">
                                 <td className="py-4 px-4 align-top border-l border-r border-slate-100">
                                     <p className="font-bold text-slate-900 text-lg">{item.name}</p>
                                      {/* Password field if mapped in description or elsewhere */}
                                 </td>
                                 <td className="py-4 px-4 align-top border-r border-slate-100">
                                     <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{item.description}</p>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        )}

        {notes && notes.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-lg">
                <h4 className="font-bold text-yellow-800 mb-2 text-sm uppercase">Technician Notes / Conditions</h4>
                <ul className="list-disc list-inside space-y-1">
                    {notes.map((note, i) => (
                        <li key={i} className="text-slate-700 text-sm">{note}</li>
                    ))}
                </ul>
            </div>
        )}
      </div>

      {/* Footer Area */}
      <div className="flex justify-between items-end border-t-2 border-slate-200 pt-8 mt-auto">
         <div className="max-w-[60%]">
             {footer?.terms && (
                 <div className="mb-6">
                     <p className="text-xs font-bold text-slate-400 uppercase mb-2">Terms & Conditions of Service</p>
                     <ul className="text-[10px] text-slate-500 list-decimal list-inside space-y-0.5 leading-tight">
                         {footer.terms.map((t, i) => <li key={i}>{t}</li>)}
                     </ul>
                 </div>
             )}
         </div>

         <div className="text-center w-[150px]">

             <p className="text-[10px] uppercase font-bold text-slate-400">Scan to Track Status</p>
             <div className="mt-8 border-t border-slate-300 pt-2">
                 <p className="text-xs font-bold text-slate-900">Customer Signature</p>
             </div>
         </div>
      </div>
    </div>
  );
}
