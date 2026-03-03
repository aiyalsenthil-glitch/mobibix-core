import type { PrintDocumentData } from "@/lib/print/types";
import { QRCodeSVG } from "qrcode.react";
import { formatCurrency } from "@/lib/gst.utils";

export function InvoiceProfessional({ data }: { data: PrintDocumentData }) {
  const { header, meta, customer, items, totals, footer, config, headerConfig } = data;
  const isGST = config.isIndianGSTInvoice;
  const accentColor = config.accentColor || headerConfig?.accentColor || '#475569';
  
  return (
    <div className="w-[210mm] min-h-[297mm] print:min-h-0 print:w-full mx-auto bg-white p-[8mm] text-black font-sans box-border" style={{ fontSize: '11px' }}>
      {/* 1. HEADER LOGO & SHOP DETAILS (Outside the main border box) */}
      <div className="flex justify-between items-start mb-1 h-20">
         {/* Logo Block */}
         <div className="w-1/4 h-full flex items-center justify-start">
            {header.logoUrl ? (
               // eslint-disable-next-line @next/next/no-img-element
               <img src={header.logoUrl} alt="Logo" className="max-h-full max-w-[12rem] object-contain" />
            ) : (
               <div className="flex flex-col items-center justify-center h-16 w-24 bg-gray-50 border border-gray-200 text-gray-400">
                  LOGO
               </div>
            )}
         </div>
         
         {/* Shop Details */}
         <div className="w-2/4 text-center px-2 flex flex-col justify-center h-full">
             <h1 className="text-[20px] font-bold uppercase leading-none mb-1 text-slate-700" style={{ color: accentColor }}>
                {header.shopName}
             </h1>
             <p className="text-[12px] font-medium text-slate-800 leading-tight">
                {header.addressLines?.[0]}<br/>
                {header.addressLines?.[1]}
             </p>
         </div>

         {/* Contact Details */}
         <div className="w-1/4 text-right self-end pb-1 pr-1 flex flex-col justify-end h-full">
             <p className="text-[11px] text-slate-800">
                {header.contactInfo?.[0] ? header.contactInfo[0].replace(/^(Ph:|Phone:)\s*/i, 'Cell:') : ''}
             </p>
             <p className="text-[11px] text-slate-800">
                {header.contactInfo?.[1] ? header.contactInfo[1] : ''}
             </p>
         </div>
      </div>
      
      {/* Tagline Strip (Below Header, but above main box) */}
      {header.tagline && (
          <div className="mb-1 w-full text-center">
              <div className="border-t-[1px] border-black mt-1 mb-0.5 w-full"></div>
              <p className="text-[10px] font-bold text-slate-700 uppercase">{header.tagline}</p>
          </div>
      )}

      {/* --- MAIN OUTER WRAPPER --- */}
      <div className="border-[1.5px] border-black flex flex-col w-full text-[10px]">
          
          {/* Row 1: GSTIN & TAX INVOICE */}
          <div className="flex border-b-[1.5px] border-black">
              <div className="w-[45%] border-r-[1.5px] border-black px-2 py-1 flex items-center">
                 <span className="font-bold text-[12px] uppercase">GSTIN : {header.gstNumber || "-"}</span>
              </div>
              <div className="w-[55%] flex items-center px-4 relative justify-center bg-gray-50/20">
                 <h2 className="text-[18px] font-bold tracking-wide">TAX INVOICE</h2>
                 <div className="absolute right-2 top-1 text-[8px] font-bold">
                     ORIGINAL FOR RECIPIENT
                 </div>
              </div>
          </div>

          {/* Row 2: Customer Detail Header & Invoice Info */}
          <div className="flex border-b-[1.5px] border-black">
              {/* Customer Left Side */}
              <div className="w-[45%] border-r-[1.5px] border-black flex flex-col bg-white">
                  <div className="border-b-[1px] border-black text-center py-0.5">
                      <span className="text-[9px] font-bold">Customer Detail</span>
                  </div>
                  <div className="px-2 py-1 flex-1">
                      <table className="w-full text-left align-top leading-tight">
                        <tbody>
                          <tr>
                            <td className="w-16 font-bold align-top pb-[1px]">M/S</td>
                            <td className="uppercase align-top pb-[1px]">{customer.name}</td>
                          </tr>
                          <tr>
                            <td className="font-bold align-top pb-[1px]">Address</td>
                            <td className="align-top pb-[1px]">{customer.address}</td>
                          </tr>
                          <tr>
                            <td className="font-bold align-top pb-[1px]">Phone</td>
                            <td className="align-top pb-[1px]">{customer.phone || "-"}</td>
                          </tr>
                          {customer.gstin && (
                          <tr>
                            <td className="font-bold align-top pb-[1px]">GSTIN</td>
                            <td className="align-top pb-[1px] uppercase">{customer.gstin}</td>
                          </tr>
                          )}
                          <tr>
                            <td className="font-bold align-top whitespace-nowrap leading-[10px] pr-2">Place of<br/>Supply</td>
                            <td className="align-middle">{customer.state || "-"}</td>
                          </tr>
                        </tbody>
                      </table>
                  </div>
              </div>

              {/* Invoice Info Right Side */}
              <div className="w-[55%] bg-white p-2">
                 <table className="w-full text-left align-top leading-tight">
                    <tbody>
                       <tr>
                         <td className="w-20 pb-1">Invoice No.</td>
                         <td className="font-bold text-[11px] pb-1 w-28 uppercase">{meta["Invoice No"]}</td>
                         <td className="w-20 pb-1 text-right pr-2">Invoice Date</td>
                         <td className="pb-1 text-right">{meta["Date"]}</td>
                       </tr>
                    </tbody>
                 </table>
              </div>
          </div>

          {/* --- ITEMS TABLE --- */}
          <div className="flex flex-col min-h-[350px]">
            <table className="w-full border-collapse table-fixed h-full bg-white">
              <thead>
                <tr>
                  <th className="border-r-[1px] border-b-[1.5px] border-black py-1 w-[4%] font-bold align-middle" rowSpan={2}>Sr.<br/>No.</th>
                  <th className="border-r-[1px] border-b-[1.5px] border-black py-1 w-[26%] font-bold align-middle" rowSpan={2}>Name of Product / Service</th>
                  <th className="border-r-[1px] border-b-[1.5px] border-black py-1 w-[9%] font-bold align-middle" rowSpan={2}>HSN / SAC</th>
                  <th className="border-r-[1px] border-b-[1.5px] border-black py-1 w-[5%] font-bold align-middle" rowSpan={2}>Qty</th>
                  <th className="border-r-[1px] border-b-[1.5px] border-black py-1 w-[8%] font-bold align-middle" rowSpan={2}>Rate</th>
                  <th className="border-r-[1px] border-b-[1.5px] border-black p-0 w-[5%] font-bold align-top" rowSpan={2}>
                      <div className="flex flex-col h-[32px]">
                         <span className="flex-1 flex items-center justify-center border-b-[1px] border-black">Disc.</span>
                         <span className="flex-1 flex items-center justify-center text-[9px]">(%)</span>
                      </div>
                  </th>
                  <th className="border-r-[1px] border-b-[1.5px] border-black py-1 w-[10%] font-bold align-middle" rowSpan={2}>Taxable<br/>Value</th>
                  
                  {isGST ? (
                      <>
                          <th className="border-r-[1px] border-black border-b-[1px] border-black py-0.5 font-bold align-middle text-center w-[12%]" colSpan={2}>CGST</th>
                          <th className="border-r-[1px] border-black border-b-[1px] border-black py-0.5 font-bold align-middle text-center w-[12%]" colSpan={2}>SGST</th>
                      </>
                  ) : (
                      <th className="border-r-[1px] border-b-[1.5px] border-black py-1 w-[14%] font-bold align-middle" rowSpan={2}>Tax Amt</th>
                  )}

                  <th className="border-b-[1.5px] border-black py-1 w-[10%] font-bold align-middle" rowSpan={2}>Total</th>
                </tr>
                {isGST && (
                    <tr>
                      <th className="border-r-[1px] border-b-[1.5px] border-black py-0.5 text-[8px] font-bold align-middle text-center w-[4%]">%</th>
                      <th className="border-r-[1px] border-b-[1.5px] border-black py-0.5 text-[8px] font-bold align-middle text-center w-[8%]">Amount</th>
                      <th className="border-r-[1px] border-b-[1.5px] border-black py-0.5 text-[8px] font-bold align-middle text-center w-[4%]">%</th>
                      <th className="border-r-[1px] border-b-[1.5px] border-black py-0.5 text-[8px] font-bold align-middle text-center w-[8%]">Amount</th>
                    </tr>
                )}
              </thead>
              <tbody className="align-top flex-1">
                {items && items.length > 0 && items.map((item, i) => {
                  const taxableValue = config.pricesInclusive 
                       ? (item.rate * item.qty) / (1 + (item.taxRate || 0) / 100)
                       : (item.rate * item.qty);
                  const cgstRate = (item.taxRate || 0) / 2;
                  const cgstAmt = (taxableValue * cgstRate) / 100;
                  
                  return (
                  <tr key={item.id} className="">
                    <td className="border-r-[1px] border-black p-1 text-center h-[28px]">{i + 1}</td>
                    <td className="border-r-[1px] border-black p-1 font-bold">
                      {item.name}
                      {item.description && <div className="text-[8px] italic font-normal text-gray-700">{item.description}</div>}
                    </td>
                    <td className="border-r-[1px] border-black p-1 text-center">{item.hsn || ""}</td>
                    <td className="border-r-[1px] border-black p-1 text-center">{item.qty.toFixed(2)}</td>
                    <td className="border-r-[1px] border-black p-1 text-right">{formatCurrency(item.rate)}</td>
                    <td className="border-r-[1px] border-black p-1 text-center">0</td>
                    <td className="border-r-[1px] border-black p-1 text-right">{formatCurrency(taxableValue)}</td>
                    
                    {isGST ? (
                      <>
                      <td className="border-r-[1px] border-black p-1 text-center">{cgstRate.toFixed(2)}</td>
                      <td className="border-r-[1px] border-black p-1 text-right">{formatCurrency(cgstAmt)}</td>
                      <td className="border-r-[1px] border-black p-1 text-center">{cgstRate.toFixed(2)}</td>
                      <td className="border-r-[1px] border-black p-1 text-right">{formatCurrency(cgstAmt)}</td>
                      </>
                    ) : (
                      <td className="border-r-[1px] border-black p-1 text-right">
                          {formatCurrency(item.total - taxableValue)}
                      </td>
                    )}
                    <td className="p-1 text-right font-bold">{formatCurrency(item.total)}</td>
                  </tr>
                )})}
                
                {/* Filler block to stretch borders down */}
                <tr className="h-full">
                    <td className="border-r-[1px] border-black"></td>
                    <td className="border-r-[1px] border-black"></td>
                    <td className="border-r-[1px] border-black"></td>
                    <td className="border-r-[1px] border-black"></td>
                    <td className="border-r-[1px] border-black"></td>
                    <td className="border-r-[1px] border-black"></td>
                    <td className="border-r-[1px] border-black"></td>
                    {isGST && (
                        <><td className="border-r-[1px] border-black"></td><td className="border-r-[1px] border-black"></td>
                        <td className="border-r-[1px] border-black"></td><td className="border-r-[1px] border-black"></td></>
                    )}
                    {!isGST && <td className="border-r-[1px] border-black"></td>}
                    <td></td>
                </tr>
              </tbody>
              
              {/* Total Row (Part of Items table, not footer) */}
              <tfoot className="border-t-[1.5px] border-black border-b-[1.5px] border-black">
                  <tr className="font-bold">
                      <td colSpan={3} className="border-r-[1px] border-black py-1 px-2 text-right text-[11px]">Total</td>
                      <td className="border-r-[1px] border-black py-1 text-center">{items?.reduce((s, i) => s + i.qty, 0).toFixed(2)}</td>
                      <td className="border-r-[1px] border-black py-1"></td>
                      <td className="border-r-[1px] border-black py-1 text-center text-[9px]">0.00</td>
                      
                      {(() => {
                          const tv = items?.reduce((s, i) => s + (config.pricesInclusive ? (i.rate * i.qty) / (1 + (i.taxRate || 0)/100) : (i.rate * i.qty)), 0) || 0;
                          return <td className="border-r-[1px] border-black py-1 pr-1 text-right font-bold">{formatCurrency(tv)}</td>
                      })()}

                      {isGST ? (
                          (() => {
                              const totalTaxAmt = (totals?.totalTax || 0) / 2;
                              return (
                                  <>
                                  <td className="border-r-[1px] border-black py-1"></td>
                                  <td className="border-r-[1px] border-black py-1 pr-1 text-right font-bold">{formatCurrency(totalTaxAmt)}</td>
                                  <td className="border-r-[1px] border-black py-1"></td>
                                  <td className="border-r-[1px] border-black py-1 pr-1 text-right font-bold">{formatCurrency(totalTaxAmt)}</td>
                                  </>
                              )
                          })()
                      ) : (
                          <td className="border-r-[1px] border-black py-1 pr-1 text-right font-bold">{formatCurrency(totals?.totalTax || 0)}</td>
                      )}

                      <td className="py-1 pr-1 text-right font-bold text-[11px]">{formatCurrency(totals?.grandTotal || 0)}</td>
                  </tr>
              </tfoot>
            </table>
          </div>

          {/* --- FOOTER BLOCKS --- */}
          <div className="flex bg-white">
              
              {/* Left Block (Words, Bank, Terms) */}
              <div className="w-[60%] border-r-[1.5px] border-black flex flex-col">
                  {/* Total in words block */}
                  <div className="border-b-[1px] border-black text-center font-bold py-1">
                      Total in words
                  </div>
                  <div className="border-b-[1.5px] border-black px-2 py-1.5 uppercase font-bold text-[11px]">
                      {totals?.amountInWords}
                  </div>

                  {/* Bank Details block */}
                  <div className="border-b-[1px] border-black text-center font-bold py-1">
                      Bank Details
                  </div>
                  <div className="border-b-[1.5px] border-black px-2 py-1 flex">
                     <table className="w-full text-left align-top leading-tight text-[11px]">
                        <tbody>
                          <tr>
                            <td className="w-24 pb-[2px]">Name</td>
                            <td className="font-bold pb-[2px] uppercase">{config.bankName || meta["Bank Name"] || "-"}</td>
                          </tr>
                          <tr>
                            <td className="pb-[2px]">Branch</td>
                            <td className="font-bold pb-[2px] uppercase">{meta["Branch"] || "-"}</td>
                          </tr>
                          <tr>
                            <td className="pb-[2px]">Acc. Number</td>
                            <td className="font-bold pb-[2px] font-mono">{config.accountNumber || meta["A/c No"] || "-"}</td>
                          </tr>
                          <tr>
                            <td className="">IFSC</td>
                            <td className="font-bold font-mono">{config.ifscCode || meta["IFSC"] || "-"}</td>
                          </tr>
                        </tbody>
                      </table>
                  </div>

                  {/* Terms block */}
                  <div className="flex flex-col flex-1">
                      <div className="border-b-[1px] border-black text-center font-bold py-1">
                          Terms and Conditions
                      </div>
                      <div className="p-2 flex-1 text-[9px] leading-tight">
                          {footer?.terms && footer.terms.length > 0 ? (
                             <div className="space-y-0.5">
                                {footer.terms.map((t, i) => <p key={i}>{t}</p>)}
                             </div>
                          ) : (
                             <div className="space-y-0.5">
                                <p>Subject to {customer.state ? customer.state : header.shopName} Jurisdiction.</p>
                                <p>Our Responsibility Ceases as soon as goods leaves our Premises.</p>
                                <p>Goods once sold will not taken back.</p>
                                <p>Delivery Ex-Premises.</p>
                             </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Right Block (Calculations & Signature) */}
              <div className="w-[40%] flex flex-col font-bold">
                  {/* Calculations Block */}
                  <div className="flex flex-col border-b-[1.5px] border-black">
                      <div className="flex justify-between border-b-[1px] border-black p-1 px-2">
                          <span>Taxable Amount</span>
                          <span>
                              {(() => {
                                const tv = items?.reduce((s, i) => s + (config.pricesInclusive ? (i.rate * i.qty) / (1 + (i.taxRate || 0)/100) : (i.rate * i.qty)), 0) || 0;
                                return formatCurrency(tv);
                              })()}
                          </span>
                      </div>
                      {isGST ? (
                          <>
                          <div className="flex justify-between border-b-[1px] border-black p-1 px-2">
                              <span>Add : CGST</span><span>{formatCurrency((totals?.totalTax || 0) / 2)}</span>
                          </div>
                          <div className="flex justify-between border-b-[1px] border-black p-1 px-2">
                              <span>Add : SGST</span><span>{formatCurrency((totals?.totalTax || 0) / 2)}</span>
                          </div>
                          </>
                      ) : (
                          <div className="flex justify-between border-b-[1px] border-black p-1 px-2">
                              <span>Total Tax</span><span>{formatCurrency(totals?.totalTax || 0)}</span>
                          </div>
                      )}

                      <div className="flex justify-between border-b-[1px] border-black p-1.5 px-2 text-[12px] bg-slate-50 relative">
                          <span>Total Amount After Tax</span>
                          <span>{formatCurrency(totals?.grandTotal || 0)}</span>
                      </div>
                      <div className="text-right text-[8px] p-0.5 px-2 font-bold mb-0.5">
                          (E & O.E.)
                      </div>
                  </div>

                  {/* Signature Box */}
                  <div className="flex flex-col flex-1 pb-1">
                      <div className="text-center text-[7.5px] font-bold border-b-[1px] border-black py-1">
                          Certified that the particulars given above are true and correct.
                      </div>
                      <div className="text-center font-bold text-[12px] pt-1">
                          For {header.shopName}
                      </div>
                      {/* Spacer to push signature line down */}
                      <div className="flex-1 min-h-[50px]"></div> 
                      <div className="text-center text-[8px] w-full mt-auto">
                          Authorised Signatory
                      </div>
                  </div>
              </div>
          </div>
      </div>
      
      <div className="text-right text-[11px] font-bold mt-1 pr-1">
          Page 1 of 1
      </div>

    </div>
  );
}
