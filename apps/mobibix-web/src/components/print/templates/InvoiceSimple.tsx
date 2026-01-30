import type { PrintDocumentData } from "@/lib/print/types";
import { QRCodeSVG } from "qrcode.react";

export function InvoiceSimple({ data }: { data: PrintDocumentData }) {
    const { header, meta, customer, items, totals, footer, qrCode, config } = data;

    return (
        <div className="w-[210mm] min-h-[297mm] mx-auto bg-white p-6 text-black font-sans text-xs">
            {/* Main Border Container */}
            <div className="border-2 border-black h-full flex flex-col">

                {/* Header Section */}
                <div className="border-b border-black flex">
                    <div className="w-1/2 p-2 border-r border-black">
                         <div className="mb-4">
                            <h2 className="font-bold text-sm">GSTIN: {header.gstNumber}</h2>
                         </div>
                         <div>
                            <h1 className="font-bold text-lg uppercase">{header.shopName}</h1>
                            {header.addressLines.map((l, i) => <p key={i}>{l}</p>)}
                            <div className="mt-1">
                                {header.contactInfo.map((c, i) => <p key={i}>{c}</p>)}
                            </div>
                         </div>
                    </div>
                    <div className="w-1/2 flex flex-col">
                        <div className="bg-slate-100 border-b border-black text-center font-bold py-1 uppercase text-sm">
                            Tax Invoice
                        </div>
                        <div className="flex-1 p-2 grid grid-cols-2 gap-x-2 gap-y-1">
                             <div className="font-bold">Invoice No:</div>
                             <div>{meta["Invoice No"]}</div>
                             
                             <div className="font-bold">Date:</div>
                             <div>{meta["Date"]}</div>
                             
                             <div className="font-bold">Original:</div>
                             <div>Recipient</div>
                        </div>
                        {qrCode && (
                            <div className="border-t border-black p-2 flex justify-center">
                                <QRCodeSVG value={verifyUrl(qrCode)} size={60} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Customer Details */}
                <div className="border-b border-black flex">
                    <div className="w-1/2 p-2 border-r border-black">
                        <div className="font-bold underline mb-1">Details of Receiver (Billed To)</div>
                        <div className="font-bold">{customer.name}</div>
                        <div className="whitespace-pre-wrap">{customer.address}</div>
                        <div className="mt-1">
                             <span className="font-bold">GSTIN:</span> {customer.gstin || '-'}
                        </div>
                        <div>
                             <span className="font-bold">State:</span> {customer.state}
                        </div>
                    </div>
                    <div className="w-1/2 p-2">
                        <div className="font-bold underline mb-1">Details of Consignee (Shipped To)</div>
                        <div className="font-bold">{customer.name}</div>
                         <div className="whitespace-pre-wrap">{customer.address}</div>
                    </div>
                </div>

                {/* Items Table Header */}
                <div className="border-b border-black bg-slate-100 flex font-bold text-center">
                    <div className="w-10 border-r border-black py-1">Sr.</div>
                    <div className="flex-1 border-r border-black py-1">Item Description</div>
                    <div className="w-20 border-r border-black py-1">HSN</div>
                    <div className="w-16 border-r border-black py-1">Qty</div>
                    <div className="w-20 border-r border-black py-1">Rate</div>
                    <div className="w-16 border-r border-black py-1">Disc</div>
                    <div className="w-20 border-r border-black py-1">Taxable</div>
                    <div className="w-12 border-r border-black py-1">Tax%</div>
                    <div className="w-24 py-1">Total</div>
                </div>

                {/* Items Body */}
                <div className="flex-1 flex flex-col">
                    {items?.map((item, i) => (
                        <div key={i} className="flex border-b border-slate-300 last:border-b-0">
                            <div className="w-10 border-r border-black py-1 text-center">{i + 1}</div>
                            <div className="flex-1 border-r border-black py-1 px-1">{item.name}</div>
                            <div className="w-20 border-r border-black py-1 text-center">{item.hsn || '-'}</div>
                            <div className="w-16 border-r border-black py-1 text-center">{item.qty}</div>
                            <div className="w-20 border-r border-black py-1 text-center">{item.rate.toFixed(2)}</div>
                            <div className="w-16 border-r border-black py-1 text-center">{(item as any).discount || '-'}</div>
                            <div className="w-20 border-r border-black py-1 text-right px-1">{(item.total * 0.82).toFixed(2)}</div> {/* Approx taxable simulation if simplified */}
                            <div className="w-12 border-r border-black py-1 text-center">{item.taxRate}%</div>
                            <div className="w-24 py-1 text-right px-1 font-bold">{item.total.toFixed(2)}</div>
                        </div>
                    ))}
                    {/* Fill empty space logic could go here */}
                </div>

                {/* Totals Section */}
                <div className="border-t border-black flex">
                    <div className="w-[60%] border-r border-black p-2">
                        <div className="mb-2">
                            <span className="font-bold">Total Amount in Words:</span>
                            <div className="capitalize italic">{totals?.amountInWords}</div>
                        </div>
                        <div className="text-[10px] mt-4">
                             <div className="font-bold underline">Bank Details</div>
                             <div>Bank Name: {(config as any)?.bankName || 'HDFC Bank'}</div>
                             <div>A/c No: {(config as any)?.accountNumber || '1234567890'}</div>
                             <div>IFSC: {(config as any)?.ifscCode || 'HDFC0001234'}</div>
                        </div>
                    </div>
                    <div className="w-[40%] text-sm">
                        <div className="flex justify-between border-b border-black p-1 px-2">
                            <span>Sub Total</span>
                            <span className="font-bold">{totals?.subTotal?.toFixed(2)}</span>
                        </div>
                        {totals?.taxLines?.map((t, i) => (
                             <div key={i} className="flex justify-between border-b border-black p-1 px-2">
                                <span>{t.label}</span>
                                <span>{t.amount.toFixed(2)}</span>
                            </div>
                        ))}
                         <div className="flex justify-between p-2 font-bold bg-slate-200">
                            <span>Grand Total</span>
                            <span>₹{totals?.grandTotal?.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                 {/* Footer Sign */}
                 <div className="border-t border-black flex min-h-[50px]">
                     <div className="w-1/2 border-r border-black p-2">
                         <div className="font-bold underline mb-1">Terms & Conditions</div>
                         <ul className="list-disc list-inside text-[10px]">
                             {footer?.terms?.slice(0,3).map((t, i) => <li key={i}>{t}</li>)}
                         </ul>
                     </div>
                     <div className="w-1/2 p-2 text-center flex flex-col justify-end">
                         <div className="text-[10px] mb-4">For {header.shopName}</div>
                         <div className="font-bold">Authorized Signatory</div>
                     </div>
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
