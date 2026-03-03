import type { PrintDocumentData } from "@/lib/print/types";
import { InvoiceHeader } from "@/components/print/headers/InvoiceHeader";
import { QRCodeSVG } from "qrcode.react";
import { formatCurrency } from "@/lib/gst.utils";

// Design concept: Fits comfortably in half-page height if items are few, or uses space efficiently.
export function InvoiceCompact({ data }: { data: PrintDocumentData }) {
  const { header, meta, customer, items, totals, footer, config } = data;

  return (
    <div className="w-[210mm] min-h-[148mm] mx-auto bg-white p-6 text-black font-sans text-xs">
      
      {/* Dynamic Header */}
      <div className="mb-4 relative">
         <InvoiceHeader data={data} />
         {data.qrCode && (
            <div className="absolute top-0 right-0 opacity-80 bg-white p-1">
                 <QRCodeSVG value={verifyUrl(data.qrCode)} size={50} level="M" />
            </div>
         )}
      </div>

      {/* Info Strip */}
      <div className="flex justify-between bg-slate-50 p-2 rounded mb-4 border border-slate-100">
         <div>
             <span className="text-slate-400 uppercase text-[10px] mr-2">Billed To:</span>
             <span className="font-bold text-slate-900">{customer.name}</span>
             {customer.gstin && <span className="ml-2 text-[10px] font-mono text-slate-600">(GST: {customer.gstin})</span>}
         </div>
      </div>

      {/* Compact Table */}
      <table className="w-full mb-4">
          <thead className="border-b border-slate-300">
              <tr>
                  <th className="text-left font-semibold py-1">Item</th>
                  <th className="text-center font-semibold py-1 w-12">Qty</th>
                  <th className="text-right font-semibold py-1 w-20">Rate</th>
                  <th className="text-right font-semibold py-1 w-20">Total</th>
              </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
              {items?.map((item, i) => (
                  <tr key={i}>
                      <td className="py-1 align-top">
                          <p className="font-medium text-slate-800">{item.name}</p>
                      </td>
                      <td className="py-1 text-center text-slate-600 align-top">{item.qty}</td>
                      <td className="py-1 text-right text-slate-600 align-top">{formatCurrency(item.rate)}</td>
                      <td className="py-1 text-right font-bold text-slate-900 align-top">{formatCurrency(item.total)}</td>
                  </tr>
              ))}
          </tbody>
      </table>

      {/* Compact Totals */}
      <div className="flex justify-end border-t border-slate-900 pt-2 mb-4">
          <div className="w-48 text-right space-y-1">
              <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{formatCurrency(totals?.subTotal || 0)}</span>
              </div>
              {totals?.taxLines?.map((t, i) => (
                  <div key={i} className="flex justify-between text-[10px] text-slate-600">
                      <span>{t.label}</span>
                      <span>{formatCurrency(t.amount)}</span>
                  </div>
              ))}
              <div className="flex justify-between font-bold text-base border-t border-dashed border-slate-300 pt-1 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(totals?.grandTotal || 0)}</span>
              </div>
              <p className="text-[10px] italic text-slate-500 text-right mt-1">{totals?.amountInWords}</p>
          </div>
      </div>

      {/* Minimal Footer */}
      <div className="flex justify-between items-end text-[10px] text-slate-400 border-t border-slate-100 pt-2">
         <div>
             {footer?.terms && footer.terms[0] && <p>Term: {footer.terms[0]}</p>}
         </div>
         <div className="text-right">
             Authorized Signatory
         </div>
      </div>
    </div>
  );
}

function verifyUrl(path: string) {
    if (path.startsWith("http")) return path;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${path}`;
}
