import type { PrintDocumentData } from "@/lib/print/types";
import { InvoiceHeader } from "@/components/print/headers/InvoiceHeader";
import { QRCodeSVG } from "qrcode.react";
import { formatCurrency } from "@/lib/gst.utils";

export function InvoiceClassic({ data }: { data: PrintDocumentData }) {
  const { header, meta, customer, items, totals, footer, qrCode, config, headerConfig } = data;
  const accentColor = config.accentColor || headerConfig?.accentColor || "#000000";
  
  return (
    <div className="w-[210mm] min-h-[297mm] print:min-h-0 print:w-full mx-auto bg-white p-6 text-black">
      {/* Dynamic Header */}
      <InvoiceHeader data={data} />

      {/* Inclusive/Exclusive Notices */}
      {config.isIndianGSTInvoice && config.pricesInclusive && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded text-sm print:bg-gray-100 print:text-black print:border-gray-300">
            <strong>Note:</strong> All prices are inclusive of GST
        </div>
      )}
      {config.isIndianGSTInvoice && !config.pricesInclusive && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded text-sm print:bg-gray-100 print:text-black print:border-gray-300">
            <strong>Note:</strong> GST will be added to the base price. Final amount may not be a round figure.
        </div>
      )}

      {/* Meta & Customer */}
      <div className="flex justify-between mb-4 gap-8">
        <div className="flex-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
            <div className="border-l-2 pl-3" style={{ borderColor: accentColor }}>
                <p className="font-bold text-lg text-slate-900">{customer.name}</p>
                {customer.phone && <p className="text-sm text-slate-600">Phone: {customer.phone}</p>}
                {customer.address && <p className="text-sm text-slate-600 max-w-[250px]">{customer.address}</p>}
                {customer.gstin && <p className="text-sm font-semibold mt-1">GSTIN: {customer.gstin}</p>}
                {customer.state && <p className="text-sm text-slate-600">State: {customer.state}</p>}
            </div>
        </div>
        
        <div className="min-w-[250px] flex flex-col items-end gap-4">
            {qrCode && (
                 <div className="bg-white p-1">
                     <QRCodeSVG value={verifyUrl(qrCode)} size={80} level="M" />
                 </div>
            )}
            <table className="w-full text-sm">
                <tbody>
                    {Object.entries(meta)
                        .filter(([key]) => !["Bank Name", "A/c No", "IFSC", "Branch"].includes(key) && meta[key]) // Filter bank & empty
                        .map(([key, value]) => (
                        <tr key={key}>
                            <td className="text-slate-500 py-1 pr-4 text-right align-top">{key}:</td>
                            <td className="font-semibold text-slate-900 py-1 align-top">{value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8 min-h-[300px] print:min-h-0">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2" style={{ borderColor: accentColor }}>
              <th className="py-2 text-left text-xs font-bold text-slate-500 uppercase w-12">#</th>
              <th className="py-2 text-left text-xs font-bold text-slate-500 uppercase">Item Description</th>
              {config.isIndianGSTInvoice && <th className="py-2 text-center text-xs font-bold text-slate-500 uppercase w-24">HSN</th>}
              <th className="py-2 text-center text-xs font-bold text-slate-500 uppercase w-16">Qty</th>
              <th className="py-2 text-right text-xs font-bold text-slate-500 uppercase w-28">
                  Rate
                  {config.pricesInclusive && config.isIndianGSTInvoice && <span className="block text-[8px] text-slate-400 font-normal">(Incl. Tax)</span>}
              </th>
              {config.isIndianGSTInvoice && <th className="py-2 text-center text-xs font-bold text-slate-500 uppercase w-20">Tax %</th>}
              <th className="py-2 text-right text-xs font-bold text-slate-500 uppercase w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items && items.length > 0 ? (
                items.map((item, i) => (
              <tr key={item.id}>
                <td className="py-2 text-sm text-slate-500">{i + 1}</td>
                <td className="py-2 text-sm font-medium text-slate-900">
                  {item.name}
                  {item.description && <div className="text-xs text-slate-400 font-normal">{item.description}</div>}
                </td>
                {config.isIndianGSTInvoice && <td className="py-2 text-sm text-center text-slate-500">{item.hsn}</td>}
                <td className="py-2 text-sm text-center text-slate-900">{item.qty}</td>
                <td className="py-2 text-sm text-right text-slate-900">{formatCurrency(item.rate)}</td>
                {config.isIndianGSTInvoice && <td className="py-2 text-sm text-center text-slate-500">{item.taxRate}%</td>}
                <td className="py-2 text-sm text-right font-bold text-slate-900">{formatCurrency(item.total)}</td>
              </tr>
            ))
            ) : (
                <tr>
                    <td colSpan={7} className="py-4 text-center text-sm text-slate-500">No items</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Totals */}
      <div className="flex justify-between border-t border-slate-200 pt-8 break-inside-avoid">
        {/* Left: Notes, Terms, Sign */}
        <div className="w-3/5 pr-8">
            <div className="mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Amount in Words</p>
                <p className="text-sm italic font-medium bg-slate-50 p-2 rounded border border-slate-100 capitalize">
                    {totals?.amountInWords}
                </p>
            </div>
            
            {/* Bank Details Block */}
            {meta["Bank Name"] && (
                <div className="mb-6">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Bank Details</p>
                    <div className="text-sm text-slate-800 bg-white border-l-4 border-slate-200 pl-3 py-1">
                        <p><span className="text-slate-500 min-w-[80px] inline-block">Bank Name:</span> <span className="font-semibold">{meta["Bank Name"]}</span></p>
                        {meta["A/c No"] && <p><span className="text-slate-500 min-w-[80px] inline-block">A/c No:</span> <span className="font-mono">{meta["A/c No"]}</span></p>}
                        {meta["IFSC"] && <p><span className="text-slate-500 min-w-[80px] inline-block">IFSC:</span> <span className="font-mono">{meta["IFSC"]}</span></p>}
                        {meta["Branch"] && <p><span className="text-slate-500 min-w-[80px] inline-block">Branch:</span> <span>{meta["Branch"]}</span></p>}
                    </div>
                </div>
            )}

            {footer?.terms && (
                <div className="mb-6">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Terms & Conditions</p>
                    <ul className="text-xs text-slate-500 list-disc list-inside space-y-0.5">
                        {footer.terms.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                </div>
            )}
            
            {footer?.text && (
                 <p className="text-xs text-slate-400 mt-8 text-center border-t pt-2 w-full max-w-xs mx-auto">
                    {footer.text}
                 </p>
            )}
        </div>

        {/* Right: Totals */}
        <div className="w-2/5">
            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-slate-600">
                   <span>Subtotal</span>
                   <span>{formatCurrency(totals?.subTotal || 0)}</span>
                </div>
                {totals?.taxLines?.map((tax, i) => (
                    <div key={i} className="flex justify-between text-sm text-slate-600">
                        <span>{tax.label} {tax.rate ? `(${tax.rate}%)` : ''}</span>
                        <span>{formatCurrency(tax.amount)}</span>
                    </div>
                ))}
            </div>
            
            <div className="border-t-2 border-slate-800 pt-2 flex justify-between items-center text-slate-900">
                <span className="text-base font-bold">Grand Total</span>
                <span className="text-xl font-bold">{formatCurrency(totals?.grandTotal || 0)}</span>
            </div>

            <div className="mt-8 text-center">

                 <div className="border-t border-slate-300 pt-1 w-32 mx-auto">
                     <p className="text-xs font-bold text-slate-900">Authorized Signatory</p>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
}

// Helper to make QR code URL absolute if needed, or pass through
function verifyUrl(path: string) {
    if (path.startsWith("http")) return path;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${path}`;
}
