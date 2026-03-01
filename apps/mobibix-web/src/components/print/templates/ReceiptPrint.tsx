import type { PrintDocumentData } from "@/lib/print/types";
import { InvoiceHeader } from "@/components/print/headers/InvoiceHeader";

export function ReceiptPrint({ data }: { data: PrintDocumentData }) {
  const { meta, totals, footer, config } = data;

  return (
    <div className="w-[210mm] min-h-0 mx-auto bg-white p-6 text-black">
      {/* Dynamic Header */}
      <InvoiceHeader data={data} />

      {/* Receipt Title */}
      <div className="text-center mb-6 mt-4 border-b pb-4">
        <h2 className="text-2xl font-bold uppercase tracking-widest">Payment Receipt</h2>
        <p className="text-sm text-slate-500">Receipt No: {meta["Receipt No"]}</p>
        <p className="text-sm text-slate-500">Date: {meta["Date"]}</p>
      </div>

      {/* Main Content */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-8 px-8">
           <div className="text-lg">
             <span className="text-slate-500 mr-4">Received with thanks from:</span>
             <br />
             <span className="font-bold text-xl">{data.customer.name}</span>
             {data.customer.phone && <span className="text-slate-500 text-sm ml-2">({data.customer.phone})</span>}
           </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-8 rounded-lg mx-4">
            <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Payment Method</p>
                    <p className="text-lg font-semibold">{meta["Payment Mode"]}</p>
                </div>
                {meta["Reference"] && (
                    <div>
                         <p className="text-xs font-bold text-slate-400 uppercase mb-1">Transaction Ref</p>
                         <p className="text-lg font-mono">{meta["Reference"]}</p>
                    </div>
                )}
            </div>

            <div className="border-t border-slate-200 pt-6">
                 <p className="text-xs font-bold text-slate-400 uppercase mb-2">Amount Received</p>
                 <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-bold text-slate-900">₹{totals?.grandTotal.toFixed(2)}</span>
                     <span className="text-sm text-slate-500 italic">({totals?.amountInWords})</span>
                 </div>
            </div>
            
            {meta["Narration"] && (
                <div className="border-t border-slate-200 mt-6 pt-4">
                     <p className="text-xs font-bold text-slate-400 uppercase mb-1">Narration / Notes</p>
                     <p className="text-sm text-slate-700 italic">&quot;{meta["Narration"]}&quot;</p>
                </div>
            )}
        </div>
      </div>

      {/* Footer / Sign */}
      <div className="flex justify-between items-end mt-12 px-8">
           <div className="text-xs text-slate-400 max-w-xs">
               {footer?.text && <p>{footer.text}</p>}
           </div>

           <div className="text-center">
                <div className="h-16 mb-2"></div>
                <div className="border-t border-slate-300 pt-1 w-40 mx-auto">
                    <p className="text-xs font-bold text-slate-900">Authorized Signatory</p>
                </div>
           </div>
      </div>
    </div>
  );
}
