import type { PrintDocumentData } from "@/lib/print/types";
import { QRCodeSVG } from "qrcode.react";

export function VoucherClassic({ data }: { data: PrintDocumentData }) {
  const { header, meta, customer, items, notes, footer, qrCode, headerConfig } =
    data;
  const accentColor = headerConfig?.accentColor || "#000000";

  return (
    <div className="w-[210mm] min-h-[297mm] mx-auto bg-white p-12 text-black font-sans">
      {/* Top Banner */}
      <div
        className="flex justify-between items-start border-b-4 border-double pb-6 mb-8"
        style={{ borderColor: accentColor }}
      >
        <div className="flex gap-6">
          {header.logoUrl && (
            <img
              src={header.logoUrl}
              alt="Logo"
              className="w-20 h-20 object-contain"
            />
          )}
          <div>
            <h1
              className="text-3xl font-bold uppercase tracking-tighter"
              style={{ color: accentColor }}
            >
              {header.shopName}
            </h1>
            {header.addressLines.slice(0, 1).map((line, i) => (
              <p key={i} className="text-sm text-gray-600">
                {line}
              </p>
            ))}
            <p className="text-sm font-bold mt-1 text-gray-800">
              {header.contactInfo[0]}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div
            className="inline-block px-4 py-1 text-white text-lg font-bold uppercase tracking-widest rounded mb-2"
            style={{ backgroundColor: accentColor }}
          >
            SERVICE VOUCHER
          </div>
          <p className="text-2xl font-mono font-bold text-gray-900">
            #{meta["Job No"]}
          </p>
          <p className="text-sm text-gray-500">{meta["Date"]}</p>
        </div>
      </div>

      {/* Customer & Info Grid */}
      <div className="grid grid-cols-2 gap-12 mb-10">
        <div>
          <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 border-b border-gray-200 pb-1">
            Customer Details
          </h3>
          <p className="font-bold text-xl text-gray-900 mb-1">
            {customer.name}
          </p>
          <p className="text-gray-700">{customer.phone}</p>
          {customer.address && (
            <p className="text-sm text-gray-500 mt-1">{customer.address}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded border border-gray-100">
            <span className="block text-xs uppercase text-gray-500 font-bold mb-1">
              Status
            </span>
            <span className="block font-bold text-gray-800">
              {meta["Status"]}
            </span>
          </div>
          <div className="bg-gray-50 p-3 rounded border border-gray-100">
            <span className="block text-xs uppercase text-gray-500 font-bold mb-1">
              Est. Delivery
            </span>
            <span className="block font-bold text-gray-800">
              {meta["Est. Delivery"]}
            </span>
          </div>
        </div>
      </div>

      {/* Device Table */}
      <div className="mb-8">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="py-2 px-4 text-xs font-bold text-gray-500 uppercase rounded-l">
                Device / Item
              </th>
              <th className="py-2 px-4 text-xs font-bold text-gray-500 uppercase">
                Service Requested / Issues
              </th>
              <th className="py-2 px-4 text-xs font-bold text-gray-500 uppercase text-right rounded-r">
                Est. Cost
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items &&
              items.map((item, i) => (
                <tr key={item.id}>
                  <td className="py-4 px-4 align-top font-bold text-gray-900">
                    {item.name}
                  </td>
                  <td className="py-4 px-4 align-top text-gray-700 whitespace-pre-wrap">
                    {item.description}
                  </td>
                  <td className="py-4 px-4 align-top text-right font-mono font-medium">
                    {item.total > 0 ? `₹${item.total}` : "TBD"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Notes & Terms */}
      <div className="grid grid-cols-3 gap-8 mb-12">
        <div className="col-span-2">
          {notes && notes.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-xs text-gray-400 uppercase mb-2">
                Technician Notes
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 bg-yellow-50/50 p-4 rounded-lg border border-yellow-100">
                {notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          )}
          {footer?.terms && (
            <div>
              <h4 className="font-bold text-xs text-gray-400 uppercase mb-2">
                Terms & Conditions
              </h4>
              <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-gray-500">
                {footer.terms.slice(0, 5).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
        <div className="col-span-1 text-center flex flex-col items-center justify-end">
          {qrCode && (
            <div className="mb-4 bg-white p-2 rounded shadow-sm border border-gray-100">
              <QRCodeSVG value={qrCode} size={90} />
              <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-wider">
                Scan to Track
              </p>
            </div>
          )}
          <div className="mt-8 pt-4 w-full border-t border-gray-300">
            <p className="text-xs font-bold text-gray-400 uppercase">
              Customer Signature
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="border-t-4 border-double pt-4 flex justify-between items-center text-xs text-gray-400"
        style={{ borderColor: accentColor }}
      >
        <p className="italic">{header.shopName}</p>
        <p>Generated on {data.config.printDate}</p>
      </div>
    </div>
  );
}
