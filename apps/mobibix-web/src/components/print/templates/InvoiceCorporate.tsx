import type { PrintDocumentData } from "@/lib/print/types";
import { InvoiceHeader } from "@/components/print/headers/InvoiceHeader";
import { QRCodeSVG } from "qrcode.react";

export function InvoiceCorporate({ data }: { data: PrintDocumentData }) {
  const { header, meta, customer, items, totals, footer, config } = data;

  return (
    <div className="w-[210mm] min-h-[297mm] mx-auto bg-white p-12 text-black font-sans text-sm">
      
      {/* Heavy Header Border */}
      <div className="border-t-8 border-slate-800 mb-8"></div>

      {/* Dynamic Header */}
      <div className="relative">
          <InvoiceHeader data={data} />
          {data.qrCode && (
            <div className="absolute top-0 right-0 p-2 bg-white">
                 <QRCodeSVG value={verifyUrl(data.qrCode)} size={65} level="M" />
            </div>
          )}
      </div>
      <div className="mb-8"></div>

      {/* Boxed Customer Info */}
      <div className="border border-slate-300 mb-8 flex">
          <div className="w-1/2 p-4 border-r border-slate-300">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Details of Receiver (Billed To)</h3>
              <p className="font-bold text-slate-900 text-base">{customer.name}</p>
              {customer.address && <p className="text-slate-600 mt-1 whitespace-pre-wrap">{customer.address}</p>}
              
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {customer.gstin && (
                    <>
                        <span className="text-slate-500">GSTIN:</span>
                        <span className="font-semibold">{customer.gstin}</span>
                    </>
                  )}
                  <span className="text-slate-500">State:</span>
                  <span className="font-semibold">{customer.state || meta["Place of Supply"]}</span>
              </div>
          </div>
          <div className="w-1/2 p-4 bg-slate-50">
               {/* Shipping same as billing simulation */}
               <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Details of Consignee (Shipped To)</h3>
              <p className="font-bold text-slate-900 text-base">{customer.name}</p>
              {customer.address && <p className="text-slate-600 mt-1 whitespace-pre-wrap">{customer.address}</p>}
          </div>
      </div>

      {/* Items Grid - Boxed */}
      <div className="border border-slate-300 mb-0 border-b-0">
          <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100">
                  <tr>
                      <th className="py-2 px-3 border-r border-slate-300 border-b border-slate-300 text-xs font-bold text-slate-600 uppercase w-10 text-center">Sr</th>
                      <th className="py-2 px-3 border-r border-slate-300 border-b border-slate-300 text-xs font-bold text-slate-600 uppercase">Description of Goods</th>
                      <th className="py-2 px-3 border-r border-slate-300 border-b border-slate-300 text-xs font-bold text-slate-600 uppercase w-20 text-center">HSN/SAC</th>
                      <th className="py-2 px-3 border-r border-slate-300 border-b border-slate-300 text-xs font-bold text-slate-600 uppercase w-16 text-center">Qty</th>
                      <th className="py-2 px-3 border-r border-slate-300 border-b border-slate-300 text-xs font-bold text-slate-600 uppercase w-24 text-right">Rate</th>
                      <th className="py-2 px-3 border-b border-slate-300 text-xs font-bold text-slate-600 uppercase w-32 text-right">Amount</th>
                  </tr>
              </thead>
              <tbody className="text-sm">
                  {items?.map((item, i) => (
                      <tr key={i}>
                          <td className="py-2 px-3 border-r border-slate-300 border-b border-slate-300 text-center align-top">{i + 1}</td>
                          <td className="py-2 px-3 border-r border-slate-300 border-b border-slate-300 align-top">
                              <span className="font-semibold">{item.name}</span>
                              {item.description && <div className="text-xs text-slate-500 mt-1">{item.description}</div>}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300 border-b border-slate-300 text-center align-top">{item.hsn || "-"}</td>
                          <td className="py-2 px-3 border-r border-slate-300 border-b border-slate-300 text-center align-top">{item.qty}</td>
                          <td className="py-2 px-3 border-r border-slate-300 border-b border-slate-300 text-right align-top">{item.rate.toFixed(2)}</td>
                          <td className="py-2 px-3 border-b border-slate-300 text-right font-bold align-top">{item.total.toFixed(2)}</td>
                      </tr>
                  ))}
                  {/* Empty rows filler if needed, but handled by height normally */}
              </tbody>
          </table>
      </div>

      {/* Totals Section Boxed */}
      <div className="border border-slate-300 border-t-0 flex">
          <div className="w-[65%] border-r border-slate-300 p-4">
              {/* Tax Table Summary Placeholder */}
              <div className="mb-4">
                   <p className="text-xs font-bold text-slate-500 mb-2">Tax Amount In Words:</p>
                   <p className="text-sm italic font-medium">{totals?.amountInWords}</p>
              </div>
              <div className="text-xs text-slate-400">
                  Declarations: {footer?.text || "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."}
              </div>
          </div>
          <div className="w-[35%]">
               <div className="flex justify-between px-4 py-2 border-b border-slate-300 bg-slate-50">
                   <span className="text-slate-600">Sub Total</span>
                   <span className="font-bold">₹{totals?.subTotal?.toFixed(2)}</span>
               </div>
               {totals?.taxLines?.map((t, i) => (
                   <div key={i} className="flex justify-between px-4 py-2 border-b border-slate-300">
                       <span className="text-slate-600">{t.label}</span>
                       <span>₹{t.amount.toFixed(2)}</span>
                   </div>
               ))}
               <div className="flex justify-between px-4 py-3 bg-slate-800 text-white">
                   <span className="font-bold uppercase">Grand Total</span>
                   <span className="font-bold text-lg">₹{totals?.grandTotal?.toFixed(2)}</span>
               </div>
          </div>
      </div>

      {/* Footer Signatures */}
      <div className="mt-8 flex justify-between items-end px-4">
          <div className="text-xs text-slate-500 w-1/2">
             <p className="font-bold mb-1">Terms & Conditions:</p>
             <ul className="list-decimal list-inside space-y-0.5">
                 {footer?.terms?.slice(0, 3).map((t, i) => <li key={i}>{t}</li>)}
             </ul>
          </div>
          <div className="text-center w-64 border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-800 text-sm">For {header.shopName}</p>
              <p className="text-[10px] text-slate-500 mt-8 uppercase">Authorized Signatory</p>
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
