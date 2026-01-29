import type { PrintDocumentData } from "@/lib/print/types";
import { InvoiceHeader } from "@/components/print/headers/InvoiceHeader";
import { QRCodeSVG } from "qrcode.react";

export function InvoiceModern({ data }: { data: PrintDocumentData }) {
  const { header, meta, customer, items, totals, footer, qrCode, config } = data;

  return (
    <div className="w-[210mm] min-h-[297mm] mx-auto bg-white p-12 text-black font-sans">
      
      {/* Dynamic Header */}
      <InvoiceHeader data={data} />
      
      {/* Spacer if header doesn't include one (Header component handles its own spacing but we might need extra here) */}
      <div className="mb-8"></div>

      {/* 2. Customer & Meta Grid */}
      <div className="grid grid-cols-2 gap-12 mb-12">
          {/* Bill To */}
          <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Billed To</p>
              <div className="text-sm text-slate-800 space-y-1">
                  <p className="font-bold text-base">{customer.name}</p>
                  {customer.address && <p className="text-slate-600 leading-relaxed">{customer.address}</p>}
                  {customer.phone && <p className="text-slate-600">Tel: {customer.phone}</p>}
                  {customer.gstin && <p className="font-semibold text-slate-900 mt-2">GSTIN: {customer.gstin}</p>}
              </div>
          </div>
          
          {/* Shipment / Details */}
          <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Details</p>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-slate-500">Place of Supply</div>
                  <div className="font-medium text-slate-900 text-right">{meta["Place of Supply"] || "-"}</div>
                  
                  <div className="text-slate-500">Invoice Date</div>
                  <div className="font-medium text-slate-900 text-right">{meta["Date"]}</div>
                  
                  <div className="text-slate-500">Due Date</div>
                  <div className="font-medium text-slate-900 text-right">{meta["Due Date"] || "Immediate"}</div>
              </div>
          </div>
      </div>
      
       {/* QR Code Positioned Absolute or Flexible */}
       {qrCode && (
            <div className="absolute top-12 right-12 opacity-80">
                 <QRCodeSVG value={verifyUrl(qrCode)} size={60} level="L" />
            </div>
        )}

      {/* 3. Items Table - Clean & Open */}
      <div className="mb-12">
          <table className="w-full text-left border-collapse">
              <thead>
                  <tr className="border-b border-slate-200">
                      <th className="py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-12">#</th>
                      <th className="py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Item / Description</th>
                      <th className="py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-20">HSN</th>
                      <th className="py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-16">Qty</th>
                      <th className="py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-24">Rate</th>
                      <th className="py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-28">Amount</th>
                  </tr>
              </thead>
              <tbody className="text-sm">
                  {items?.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50">
                          <td className="py-4 text-slate-400 align-top">{i + 1}</td>
                          <td className="py-4 font-medium text-slate-900 align-top">
                              {item.name}
                              {item.description && <p className="text-xs text-slate-500 font-normal mt-0.5">{item.description}</p>}
                          </td>
                          <td className="py-4 text-slate-500 text-center align-top">{item.hsn || "-"}</td>
                          <td className="py-4 text-slate-900 text-center align-top">{item.qty}</td>
                          <td className="py-4 text-slate-600 text-right align-top">
                             {item.rate.toFixed(2)}
                          </td>
                          <td className="py-4 font-bold text-slate-900 text-right align-top">
                             {item.total.toFixed(2)}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {/* 4. Totals & Footer */}
      <div className="flex items-start justify-between border-t border-slate-200 pt-8">
          
          {/* Left: Notes & Terms */}
          <div className="w-1/2 pr-12">
              <div className="mb-8">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Amount in Words</p>
                  <p className="text-sm font-medium text-slate-800 capitalize leading-relaxed border-l-2 border-teal-500 pl-3">
                      {totals?.amountInWords}
                  </p>
              </div>

              {footer?.terms && (
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Terms & Conditions</p>
                   <ul className="text-[10px] text-slate-500 space-y-1 list-disc list-inside">
                       {footer.terms.map((t, i) => <li key={i}>{t}</li>)}
                   </ul>
                </div>
              )}
          </div>

          {/* Right: Calculations */}
          <div className="w-2/5">
              <div className="space-y-3 text-sm mb-6 border-b border-slate-100 pb-6">
                  <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-medium">₹{totals?.subTotal?.toFixed(2)}</span>
                  </div>
                  
                  {totals?.taxLines?.map((tax, i) => (
                       <div key={i} className="flex justify-between text-slate-600">
                          <span>{tax.label} <span className="text-xs text-slate-400">({tax.rate}%)</span></span>
                          <span className="font-medium">₹{tax.amount.toFixed(2)}</span>
                       </div>
                  ))}
                  
                  {/* Round off if any logic existed or derived */}
                  {/* <div className="flex justify-between text-slate-400 text-xs">
                      <span>Round Off</span>
                      <span>0.00</span>
                  </div> */}
              </div>

              <div className="flex justify-between items-end mb-8">
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">Grand Total</span>
                  <span className="text-3xl font-bold text-slate-900">₹{totals?.grandTotal?.toFixed(2)}</span>
              </div>

              {/* Signature Block */}
              <div className="text-right mt-12">
                   {/* Placeholder for optional signature image */}
                   <div className="h-12"></div> 
                   <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">Authorized Signatory</p>
                   {header.shopName && <p className="text-[10px] text-slate-500 mt-1">For {header.shopName}</p>}
              </div>
          </div>
      </div>
      
      {/* Footer Bottom Bar */}
      <div className="mt-auto pt-12 text-center">
         {footer?.text && <p className="text-xs text-slate-400">{footer.text}</p>}
      </div>

    </div>
  );

}

function verifyUrl(path: string) {
    if (path.startsWith("http")) return path;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${path}`;
}
