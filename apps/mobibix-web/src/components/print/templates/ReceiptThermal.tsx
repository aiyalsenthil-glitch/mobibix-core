import type { PrintDocumentData } from "@/lib/print/types";
import { QRCodeSVG } from "qrcode.react";

export function ReceiptThermal({ data }: { data: PrintDocumentData }) {
  const {
    header,
    meta,
    customer,
    items,
    totals,
    footer,
    qrCode,
    headerConfig,
  } = data;
  const accentColor = headerConfig?.accentColor || "#000000";

  return (
    <div className="w-[80mm] mx-auto bg-white p-2 text-black text-xs font-mono leading-tight">
      {/* Header */}
      <div className="text-center mb-3 pb-3 border-b-2 border-black border-dashed">
        <h1
          className="text-xl font-black uppercase mb-1"
          style={{ color: accentColor }}
        >
          {header.shopName}
        </h1>
        {header.addressLines.map((line, i) => (
          <p key={i} className="text-[10px] text-gray-600">
            {line}
          </p>
        ))}
        <div className="mt-1">
          {header.contactInfo.map((info, i) => (
            <p key={i} className="text-[10px] font-bold">
              {info}
            </p>
          ))}
        </div>
        {header.gstNumber && (
          <p className="font-bold mt-1 text-[10px]">
            GSTIN: {header.gstNumber}
          </p>
        )}

        <div className="mt-3 border-2 border-black px-2 py-1 inline-block rounded font-bold uppercase text-sm">
          PAYMENT RECEIPT
        </div>
      </div>

      {/* Meta Grid */}
      <div className="mb-3 border-b border-black pb-2 border-dashed grid grid-cols-2 gap-x-2 gap-y-1">
        <div className="text-left">
          <span className="block text-[9px] text-gray-500 uppercase">
            Receipt No
          </span>
          <span className="font-bold">{meta["Invoice No"]}</span>
        </div>
        <div className="text-right">
          <span className="block text-[9px] text-gray-500 uppercase">Date</span>
          <span className="font-bold">{meta["Date"]}</span>
        </div>
        {customer.name && (
          <div className="col-span-2 mt-1 pt-1 border-t border-dotted border-gray-300">
            <span className="block text-[9px] text-gray-500 uppercase">
              Customer
            </span>
            <span className="font-bold truncate block">{customer.name}</span>
          </div>
        )}
      </div>

      {/* Items */}
      {items && items.length > 0 && (
        <div className="mb-2 border-b border-black pb-2 border-dashed">
          <div className="flex font-bold uppercase border-b border-black mb-1 pb-1 text-[10px]">
            <span className="w-8">Qty</span>
            <span className="flex-1">Item</span>
            <span className="w-16 text-right">Amount</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="mb-1.5">
              <div className="font-bold text-sm mb-0.5">{item.name}</div>
              <div className="flex justify-between text-[11px]">
                <span className="w-8 text-gray-500">{item.qty} x</span>
                <span className="flex-1 text-gray-500">@{item.rate}</span>
                <span className="w-16 text-right font-medium">
                  {item.total.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="mb-4 space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">{totals?.subTotal?.toFixed(2)}</span>
        </div>
        {totals?.taxLines?.map((tax, i) => (
          <div
            key={i}
            className="flex justify-between text-[10px] text-gray-500"
          >
            <span>
              {tax.label} ({tax.rate}%)
            </span>
            <span>{tax.amount.toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between font-black text-xl mt-2 pt-2 border-t-2 border-black border-dashed">
          <span className="uppercase">Total</span>
          <span style={{ color: accentColor }}>
            ₹{totals?.grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-2">
        {qrCode && (
          <div className="flex justify-center mb-3">
            <QRCodeSVG value={qrCode} size={60} />
          </div>
        )}

        {footer?.text && (
          <p className="mb-2 text-[10px] italic">{footer.text}</p>
        )}
        <p className="text-[9px] uppercase font-bold text-gray-400">
          *** Thank You Visit Again ***
        </p>
      </div>
    </div>
  );
}
