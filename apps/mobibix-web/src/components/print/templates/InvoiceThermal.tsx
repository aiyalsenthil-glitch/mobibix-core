import type { PrintDocumentData } from "@/lib/print/types";
import { QRCodeSVG } from "qrcode.react";

export function InvoiceThermal({ data }: { data: PrintDocumentData }) {
  const { header, meta, customer, items, totals, footer, qrCode, config } = data;

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
        {header.gstNumber && <p className="font-bold mt-1">GSTIN: {header.gstNumber}</p>}
        {qrCode && (
            <div className="flex justify-center my-1 py-1">
                 <QRCodeSVG value={qrCode} size={80} />
            </div>
        )}
        <p className="border mt-1 inline-block px-1 rounded uppercase font-bold">{header.title}</p>
      </div>

      {/* Meta */}
      <div className="mb-2 border-b border-black pb-2 border-dashed">
          <div className="flex justify-between">
            <span>Inv No:</span>
            <span className="font-bold">{meta["Invoice No"]}</span>
        </div>
        <div className="flex justify-between">
            <span>Date:</span>
            <span>{meta["Date"]}</span>
        </div>
      </div>

      {/* Customer */}
      <div className="mb-2 border-b border-black pb-2 border-dashed">
        <p className="font-bold uppercase">Customer:</p>
        <p className="text-sm truncate">{customer.name}</p>
        {customer.phone && <p>{customer.phone}</p>}
        {customer.gstin && <p>GST: {customer.gstin}</p>}
      </div>

      {/* Items */}
      {items && items.length > 0 && (
      <div className="mb-2 border-b border-black pb-2 border-dashed">
        <div className="flex font-bold uppercase border-b border-dashed mb-1 pb-1">
            <span className="w-8">Qty</span>
            <span className="flex-1">Item</span>
            <span className="w-12 text-right">Amt</span>
        </div>
        {items.map((item) => (
             <div key={item.id} className="mb-2">
                 <div className="flex justify-between font-bold">
                     <span className="w-full">{item.name}</span>
                 </div>
                 <div className="flex justify-between">
                     <span className="w-8">{item.qty} x</span>
                     <span className="flex-1">@{item.rate}</span>
                     <span className="w-12 text-right">{item.total.toFixed(2)}</span>
                 </div>
             </div>
         ))}
      </div>
      )}

      {/* Totals */}
      <div className="mb-4">
          <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{totals?.subTotal?.toFixed(2)}</span>
          </div>
          {totals?.taxLines?.map((tax, i) => (
               <div key={i} className="flex justify-between">
                  <span>{tax.label} ({tax.rate}%):</span>
                  <span>{tax.amount.toFixed(2)}</span>
              </div>
          ))}
           <div className="flex justify-between font-bold text-lg mt-2 border-t border-black border-dashed pt-1">
              <span>Total:</span>
              <span>{totals?.grandTotal.toFixed(2)}</span>
          </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        {footer?.text && <p className="mb-2">{footer.text}</p>}
        
        <p className="text-[10px] mb-2">** Thank You **</p>


      </div>
    </div>
  );
}
