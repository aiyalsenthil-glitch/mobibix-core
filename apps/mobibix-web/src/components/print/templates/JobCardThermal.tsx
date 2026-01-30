import type { PrintDocumentData } from "@/lib/print/types";
import { QRCodeSVG } from "qrcode.react";

export function JobCardThermal({ data }: { data: PrintDocumentData }) {
  const { header, meta, customer, items, notes, footer, qrCode } = data;

  return (
    <div className="w-[80mm] mx-auto bg-white p-2 text-black text-xs font-mono leading-tight">
      {/* Header */}
      <div className="text-center mb-2 border-b border-black pb-2 border-dashed">
        <h1 className="text-lg font-bold uppercase">{header.shopName}</h1>
        {header.addressLines.map((line, i) => (
          <p key={i} className="text-[10px]">{line}</p>
        ))}
        <div className="mt-1">
            {header.contactInfo.map((info, i) => (
                <p key={i} className="text-[10px] font-bold">{info}</p>
            ))}
        </div>
        {qrCode && (
            <div className="flex justify-center my-2 py-2">
                 <QRCodeSVG value={qrCode} size={100} />
            </div>
        )}
      </div>

      {/* Meta */}
      <div className="mb-2 border-b border-black pb-2 border-dashed">
        <div className="flex justify-between font-bold text-sm">
            <span>JOB NO:</span>
            <span>{meta["Job No"]}</span>
        </div>
        <div className="flex justify-between">
            <span>Date:</span>
            <span>{meta["Date"]}</span>
        </div>
        <div className="flex justify-between font-bold mt-1">
            <span>Status:</span>
            <span>{meta["Status"]}</span>
        </div>
        <div className="flex justify-between">
             <span>Est. Delivery:</span>
             <span>{meta["Est. Delivery"]}</span>
        </div>
      </div>

      {/* Customer */}
      <div className="mb-2 border-b border-black pb-2 border-dashed">
        <p className="font-bold uppercase">Customer:</p>
        <p className="text-sm">{customer.name}</p>
        <p>{customer.phone}</p>
      </div>

      {/* Device / Items */}
      {items && items.length > 0 && (
      <div className="mb-2 border-b border-black pb-2 border-dashed">
         <p className="font-bold uppercase mb-1">Device Details:</p>
         {items.map((item) => (
             <div key={item.id} className="mb-2">
                 <p className="font-bold">{item.name}</p>
                 <p className="text-[10px] text-gray-700 whitespace-pre-wrap">{item.description}</p>
             </div>
         ))}
      </div>
      )}

       {/* Issues / Notes */}
       <div className="mb-2 border-b border-black pb-2 border-dashed">
         <p className="font-bold uppercase mb-1">Reported Issue:</p>
         {notes?.map((note, i) => (
             <p key={i} className="mb-1">• {note}</p>
         ))}
      </div>

      {/* Totals / Estimates */}
      <div className="mb-4">
          <div className="flex justify-between font-bold text-sm">
              <span>Est. Cost:</span>
              <span>₹{data.totals?.grandTotal.toFixed(2)}</span>
          </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        {footer?.terms && (
             <div className="text-[8px] text-left mb-2">
                 <p className="font-bold underline">Terms:</p>
                 <ol className="list-decimal pl-3">
                    {footer.terms.slice(0, 3).map((t, i) => <li key={i}>{t}</li>)}
                 </ol>
             </div>
        )}
        

        <p className="font-bold text-[10px]">Track Status by Scanning QR</p>
        <p className="mt-2 text-[10px]">*** Thank You ***</p>
      </div>
    </div>
  );
}
