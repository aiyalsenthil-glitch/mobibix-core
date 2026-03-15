import type { PrintDocumentData } from "@/lib/print/types";
import { formatCurrency } from "@/lib/gst.utils";

/**
 * InvoiceProfessional — Indian ERP-style A4 GST Tax Invoice
 * 
 * Layout exactly matches "Aiyal Technologies" invoice format:
 * ┌─────────────────────────────────────────────────────┐
 * │ [LOGO]  SHOP NAME (center, bold)    Cell: xxxxxxx   │
 * │         Address lines               Email: xxx@xxx  │
 * ├─────────────────────────────────────────────────────┤
 * │    Multi Brand Mobiles & Accessories tagline strip  │
 * ├─────────────────────────────────────────────────────┤
 * │ GSTIN: xxxxxxx   TAX INVOICE   ORIGINAL FOR RECIPIENT
 * │ Customer Detail  │ Invoice No. / Invoice Date        │
 * │ Name / Address   │                                   │
 * ├────────┬────────────────────────┬────────────────────┤
 * │ Sr.No  │ Name of Product/Service│ HSN │ Qty │ Rate .. │
 * │ items..                                              │
 * ├─────────────────────────────────────────────────────┤
 * │ Total in words    │ Taxable Amount │ xxxxxx          │
 * │ TWO THOUSAND ..   │ CGST           │ xxxxxx          │
 * │ Bank Details      │ SGST           │ xxxxxx          │
 * │ Terms & Conditions│ Total After Tax│ ₹xxxxx          │
 * │                   │ For Shop Name (signature)       │
 * └─────────────────────────────────────────────────────┘
 */

export function InvoiceProfessional({ data }: { data: PrintDocumentData }) {
  const { header, meta, customer, items, totals, footer, config, headerConfig } = data;
  const isGST = config.isIndianGSTInvoice;
  const accentColor = config.accentColor || headerConfig?.accentColor || '#000000';

  // Professional header config with sensible Indian ERP defaults
  const ph = headerConfig?.professionalHeader ?? {
    logoPosition: 'LEFT' as const,
    contactDisplay: 'RIGHT' as const,
    showCell: true,
    showEmail: true,
    showTaglineBanner: true,
    customTagline: undefined,
  };

  // Parse contact info strings like "Ph: 8838822461" and "Email: abc@gmail.com"
  // Use strict prefix matching to avoid false positives (e.g. "mob" in "REMOVED_DOMAIN")
  const rawPhone = header.contactInfo?.find(c => /^(ph|phone|cell|mobile|mob\.)\s*:/i.test(c.trim()));
  const rawEmail = header.contactInfo?.find(c => /^(email|e-mail|mail)\s*:/i.test(c.trim()));
  const cellNum = rawPhone ? rawPhone.replace(/^[^:]+:\s*/i, '').trim() : '';
  const emailAddr = rawEmail ? rawEmail.replace(/^[^:]+:\s*/i, '').trim() : '';


  // Taxable value per row
  const calcTaxable = (rate: number, qty: number, taxRate: number) =>
    config.pricesInclusive
      ? (rate * qty) / (1 + (taxRate || 0) / 100)
      : (rate * qty);

  const totalTaxableValue = items?.reduce((s, i) => s + calcTaxable(i.rate, i.qty, i.taxRate || 0), 0) ?? 0;
  const totalQty = items?.reduce((s, i) => s + i.qty, 0) ?? 0;
  const totalTax = totals?.totalTax ?? 0;
  const cgst = totalTax / 2;
  const sgst = totalTax / 2;
  const grandTotal = totals?.grandTotal ?? 0;
  const roundOff = grandTotal - (totalTaxableValue + totalTax);
  const taglineText = ph.customTagline || header.tagline;

  // --- SUB-COMPONENTS ---

  const LogoBlock = () => {
    if (ph.logoPosition === 'NONE') return null;
    return (
      <div className={`h-full flex items-center ${ph.logoPosition === 'CENTER' ? 'justify-center' : 'justify-start'}`}
           style={{ width: ph.logoPosition === 'CENTER' ? '100%' : '22%' }}>
        {header.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={header.logoUrl} alt={`${header.shopName} Logo`} className="max-h-[72px] max-w-[120px] object-contain" />
        ) : (
          <div className="flex flex-col items-center justify-center h-16 w-24 bg-gray-50 border border-gray-200 text-gray-400 text-[9px]">
            LOGO
          </div>
        )}
      </div>
    );
  };

  const ContactBlock = () => {
    if (ph.contactDisplay === 'NONE') return null;
    const hasCell = ph.showCell && cellNum;
    const hasEmail = ph.showEmail && emailAddr;
    if (!hasCell && !hasEmail) return null;

    return (
      <div className="text-right self-end pb-1 flex flex-col justify-end h-full" style={{ width: '25%' }}>
        {hasCell && (
          <p className="text-[10.5px] text-slate-800">Cell:{cellNum}</p>
        )}
        {hasEmail && (
          <p className="text-[10.5px] text-slate-800">Email: {emailAddr}</p>
        )}
      </div>
    );
  };

  return (
    <div
      className="w-[210mm] min-h-[297mm] print:min-h-0 print:w-full mx-auto bg-white p-[8mm] text-black font-sans box-border"
      style={{ fontSize: '10.5px' }}
    >
      {/* ═══ SECTION 1: HEADER ═══ */}
      <div className="flex justify-between items-start mb-1" style={{ height: '76px' }}>
        {/* Logo */}
        {ph.logoPosition === 'LEFT' && <LogoBlock />}

        {/* Shop Name + Address (Center) */}
        <div
          className="text-center px-2 flex flex-col justify-center h-full"
          style={{ flex: 1 }}
        >
          <h1
            className="font-bold uppercase leading-none mb-1"
            style={{ fontSize: '22px', color: accentColor }}
          >
            {header.shopName}
          </h1>
          {header.addressLines?.map((line, i) => (
            <p key={i} className="text-[11px] text-slate-800 leading-snug">
              {line}
            </p>
          ))}
        </div>

        {/* Contact — Right side */}
        {ph.contactDisplay === 'RIGHT' && <ContactBlock />}
      </div>

      {/* ═══ SECTION 2: TAGLINE BANNER ═══ */}
      {ph.showTaglineBanner && taglineText && (
        <div className="mb-1 w-full text-center">
          <div className="border-t-[1px] border-black mt-0.5 mb-0.5 w-full"></div>
          <p className="text-[10px] font-bold text-slate-700">{taglineText}</p>
        </div>
      )}

      {/* ═══ SECTION 3: MAIN BOX ═══ */}
      <div className="border-[1.5px] border-black flex flex-col w-full text-[10px]">

        {/* Row A: GSTIN | TAX INVOICE | ORIGINAL FOR RECIPIENT */}
        <div className="flex border-b-[1.5px] border-black">
          <div className="border-r-[1.5px] border-black px-2 py-1 flex items-center" style={{ width: '45%' }}>
            <span className="font-bold text-[12px] uppercase">GSTIN : {header.gstNumber || "–"}</span>
          </div>
          <div className="flex items-center px-4 relative justify-center bg-gray-50/10" style={{ width: '55%' }}>
            <h2 className="text-[18px] font-bold tracking-wide">TAX INVOICE</h2>
            <div className="absolute right-2 top-1 text-[8px] font-bold">
              ORIGINAL FOR RECIPIENT
            </div>
          </div>
        </div>

        {/* Row B: Customer Detail (Left) | Invoice No + Date (Right) */}
        <div className="flex border-b-[1.5px] border-black">
          {/* Customer left */}
          <div className="border-r-[1.5px] border-black flex flex-col bg-white" style={{ width: '45%' }}>
            <div className="border-b-[1px] border-black text-center py-0.5">
              <span className="text-[9px] font-bold">Customer Detail</span>
            </div>
            <div className="px-2 py-1 flex-1">
              <table className="w-full text-left align-top leading-snug">
                <tbody>
                  <tr>
                    <td className="font-bold align-top pb-[2px]" style={{ width: '64px' }}>Name</td>
                    <td className="uppercase align-top pb-[2px]">{customer.name}</td>
                  </tr>
                  <tr>
                    <td className="font-bold align-top pb-[2px]">Address</td>
                    <td className="align-top pb-[2px]">{customer.address || '–'}</td>
                  </tr>
                  <tr>
                    <td className="font-bold align-top pb-[2px]">Phone</td>
                    <td className="align-top pb-[2px]">{customer.phone || '–'}</td>
                  </tr>
                  <tr>
                    <td className="font-bold align-top pb-[2px]">GSTIN</td>
                    <td className="align-top pb-[2px] uppercase">{customer.gstin || '–'}</td>
                  </tr>
                  <tr>
                    <td className="font-bold align-top leading-[10px] pr-2 whitespace-nowrap">
                      Place of<br />Supply
                    </td>
                    <td className="align-middle">{customer.state || '–'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice info right */}
          <div className="p-2 bg-white" style={{ width: '55%' }}>
            <table className="w-full text-left align-top leading-snug">
              <tbody>
                <tr>
                  <td className="pb-1" style={{ width: '72px' }}>Invoice No.</td>
                  <td className="font-bold text-[11px] pb-1 uppercase" style={{ width: '110px' }}>{meta["Invoice No"]}</td>
                  <td className="pb-1 text-right pr-2">Invoice Date</td>
                  <td className="pb-1 text-right">{meta["Date"]}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══ ROW C: ITEMS TABLE ═══ */}
        <div className="flex flex-col" style={{ minHeight: '300px' }}>
          <table className="w-full border-collapse table-fixed h-full bg-white">
            <thead>
              <tr className="text-center">
                <th className="border-r-[1px] border-b-[1.5px] border-black py-1 font-bold align-middle text-center" rowSpan={2} style={{ width: '4%' }}>
                  Sr.<br />No.
                </th>
                <th className="border-r-[1px] border-b-[1.5px] border-black py-1 font-bold align-middle text-left pl-1" rowSpan={2} style={{ width: '26%' }}>
                  Name of Product / Service
                </th>
                <th className="border-r-[1px] border-b-[1.5px] border-black py-1 font-bold align-middle" rowSpan={2} style={{ width: '9%' }}>
                  HSN / SAC
                </th>
                <th className="border-r-[1px] border-b-[1.5px] border-black py-1 font-bold align-middle" rowSpan={2} style={{ width: '6%' }}>
                  Qty
                </th>
                <th className="border-r-[1px] border-b-[1.5px] border-black py-1 font-bold align-middle" rowSpan={2} style={{ width: '8%' }}>
                  Rate
                </th>
                {/* Disc. column */}
                <th className="border-r-[1px] border-b-[1.5px] border-black p-0 font-bold align-top" rowSpan={2} style={{ width: '5%' }}>
                  <div className="flex flex-col" style={{ height: '32px' }}>
                    <span className="flex-1 flex items-center justify-center border-b-[1px] border-black leading-none">Disc.</span>
                    <span className="flex-1 flex items-center justify-center text-[8.5px]">(%)</span>
                  </div>
                </th>
                <th className="border-r-[1px] border-b-[1.5px] border-black py-1 font-bold align-middle" rowSpan={2} style={{ width: '10%' }}>
                  Taxable<br />Value
                </th>

                {isGST ? (
                  <>
                    <th className="border-r-[1px] border-b-[1px] border-black py-0.5 font-bold align-middle text-center" colSpan={2} style={{ width: '12%' }}>CGST</th>
                    <th className="border-r-[1px] border-b-[1px] border-black py-0.5 font-bold align-middle text-center" colSpan={2} style={{ width: '12%' }}>SGST</th>
                  </>
                ) : (
                  <th className="border-r-[1px] border-b-[1.5px] border-black py-1 font-bold align-middle" rowSpan={2} style={{ width: '14%' }}>
                    Tax Amt
                  </th>
                )}

                <th className="border-b-[1.5px] border-black py-1 font-bold align-middle text-right pr-1" rowSpan={2} style={{ width: '8%' }}>
                  Total
                </th>
              </tr>

              {isGST && (
                <tr>
                  <th className="border-r-[1px] border-b-[1.5px] border-black py-0.5 text-[8px] font-bold align-middle text-center">%</th>
                  <th className="border-r-[1px] border-b-[1.5px] border-black py-0.5 text-[8px] font-bold align-middle text-center">Amount</th>
                  <th className="border-r-[1px] border-b-[1.5px] border-black py-0.5 text-[8px] font-bold align-middle text-center">%</th>
                  <th className="border-r-[1px] border-b-[1.5px] border-black py-0.5 text-[8px] font-bold align-middle text-center">Amount</th>
                </tr>
              )}
            </thead>

            <tbody className="align-top">
              {items && items.length > 0 && items.map((item, idx) => {
                const tv = calcTaxable(item.rate, item.qty, item.taxRate || 0);
                const cgstRate = (item.taxRate || 0) / 2;
                const cgstItemAmt = (tv * cgstRate) / 100;

                return (
                  <tr key={item.id}>
                    <td className="border-r-[1px] border-black p-1 text-center" style={{ height: '26px' }}>{idx + 1}</td>
                    <td className="border-r-[1px] border-black p-1 font-bold text-left">
                      {item.name}
                      {item.description && (
                        <div className="text-[8px] italic font-normal text-gray-600">{item.description}</div>
                      )}
                    </td>
                    <td className="border-r-[1px] border-black p-1 text-center">{item.hsn || ''}</td>
                    <td className="border-r-[1px] border-black p-1 text-center">
                      {Number.isInteger(item.qty) ? item.qty : item.qty.toFixed(2)}
                      {item.unit ? ` ${item.unit}` : ''}
                    </td>
                    <td className="border-r-[1px] border-black p-1 text-right">{formatCurrency(item.rate)}</td>
                    <td className="border-r-[1px] border-black p-1 text-center">{item.discount ?? 0}</td>
                    <td className="border-r-[1px] border-black p-1 text-right">{formatCurrency(tv)}</td>

                    {isGST ? (
                      <>
                        <td className="border-r-[1px] border-black p-1 text-center">{cgstRate % 1 === 0 ? cgstRate : cgstRate.toFixed(2)}</td>
                        <td className="border-r-[1px] border-black p-1 text-right">{formatCurrency(cgstItemAmt)}</td>
                        <td className="border-r-[1px] border-black p-1 text-center">{cgstRate % 1 === 0 ? cgstRate : cgstRate.toFixed(2)}</td>
                        <td className="border-r-[1px] border-black p-1 text-right">{formatCurrency(cgstItemAmt)}</td>
                      </>
                    ) : (
                      <td className="border-r-[1px] border-black p-1 text-right">
                        {formatCurrency(item.total - tv)}
                      </td>
                    )}

                    <td className="p-1 text-right font-bold">{formatCurrency(item.total)}</td>
                  </tr>
                );
              })}

              {/* Filler rows to stretch column borders */}
              <tr className="h-full">
                <td className="border-r-[1px] border-black"></td>
                <td className="border-r-[1px] border-black"></td>
                <td className="border-r-[1px] border-black"></td>
                <td className="border-r-[1px] border-black"></td>
                <td className="border-r-[1px] border-black"></td>
                <td className="border-r-[1px] border-black"></td>
                <td className="border-r-[1px] border-black"></td>
                {isGST ? (
                  <>
                    <td className="border-r-[1px] border-black"></td>
                    <td className="border-r-[1px] border-black"></td>
                    <td className="border-r-[1px] border-black"></td>
                    <td className="border-r-[1px] border-black"></td>
                  </>
                ) : (
                  <td className="border-r-[1px] border-black"></td>
                )}
                <td></td>
              </tr>
            </tbody>

            {/* Totals Row */}
            <tfoot className="border-t-[1.5px] border-black border-b-[1.5px] border-black">
              <tr className="font-bold">
                <td colSpan={3} className="border-r-[1px] border-black py-1 px-2 text-right text-[11px]">Total</td>
                <td className="border-r-[1px] border-black py-1 text-center">
                  {Number.isInteger(totalQty) ? totalQty : totalQty.toFixed(2)}
                </td>
                <td className="border-r-[1px] border-black py-1"></td>
                <td className="border-r-[1px] border-black py-1 text-center text-[9px]">0.00</td>
                <td className="border-r-[1px] border-black py-1 pr-1 text-right">{formatCurrency(totalTaxableValue)}</td>

                {isGST ? (
                  <>
                    <td className="border-r-[1px] border-black py-1"></td>
                    <td className="border-r-[1px] border-black py-1 pr-1 text-right">{formatCurrency(cgst)}</td>
                    <td className="border-r-[1px] border-black py-1"></td>
                    <td className="border-r-[1px] border-black py-1 pr-1 text-right">{formatCurrency(sgst)}</td>
                  </>
                ) : (
                  <td className="border-r-[1px] border-black py-1 pr-1 text-right">{formatCurrency(totalTax)}</td>
                )}

                <td className="py-1 pr-1 text-right text-[11px]">{formatCurrency(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ═══ SECTION 4: FOOTER ═══ */}
        <div className="flex bg-white">

          {/* Left block: Words + Bank + Terms */}
          <div className="border-r-[1.5px] border-black flex flex-col" style={{ width: '60%' }}>

            {/* Amount in words */}
            <div className="border-b-[1px] border-black text-center font-bold py-1">
              Total in words
            </div>
            <div className="border-b-[1.5px] border-black px-2 py-1.5 font-bold text-[10.5px] uppercase">
              {totals?.amountInWords || '—'}
            </div>

            {/* Bank Details */}
            <div className="border-b-[1px] border-black text-center font-bold py-1">
              Bank Details
            </div>
            <div className="border-b-[1.5px] border-black px-2 py-1">
              <table className="w-full text-left align-top leading-snug text-[10.5px]">
                <tbody>
                  <tr>
                    <td className="pb-[2px]" style={{ width: '90px' }}>Name</td>
                    <td className="font-bold pb-[2px] uppercase">{config.bankName || meta["Bank Name"] || '–'}</td>
                  </tr>
                  <tr>
                    <td className="pb-[2px]">Branch</td>
                    <td className="font-bold pb-[2px] uppercase">{meta["Branch"] || '–'}</td>
                  </tr>
                  <tr>
                    <td className="pb-[2px]">Acc. Number</td>
                    <td className="font-bold pb-[2px] font-mono">{config.accountNumber || meta["A/c No"] || '–'}</td>
                  </tr>
                  <tr>
                    <td>IFSC</td>
                    <td className="font-bold font-mono">{config.ifscCode || meta["IFSC"] || '–'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Terms & Conditions */}
            <div className="flex flex-col flex-1">
              <div className="border-b-[1px] border-black text-center font-bold py-1">
                Terms and Conditions
              </div>
              <div className="p-2 flex-1 text-[9px] leading-snug">
                {footer?.terms && footer.terms.length > 0 ? (
                  <div className="space-y-0.5">
                    {footer.terms.map((t, i) => <p key={i}>{t}</p>)}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p>Subject to {header.shopName} Jurisdiction.</p>
                    <p>Our Responsibility Ceases as soon as goods leaves our Premises.</p>
                    <p>Goods once sold will not taken back.</p>
                    <p>Delivery Ex-Premises.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right block: Tax breakdown + Signature */}
          <div className="flex flex-col font-bold" style={{ width: '40%' }}>

            {/* Taxable + CGST / SGST rows */}
            <div className="flex flex-col border-b-[1.5px] border-black">
              <div className="flex justify-between border-b-[1px] border-black p-1 px-2">
                <span>Taxable Amount</span>
                <span>{formatCurrency(totalTaxableValue)}</span>
              </div>

              {isGST ? (
                <>
                  <div className="flex justify-between border-b-[1px] border-black p-1 px-2">
                    <span>Add : CGST</span>
                    <span>{formatCurrency(cgst)}</span>
                  </div>
                  <div className="flex justify-between border-b-[1px] border-black p-1 px-2">
                    <span>Add : SGST</span>
                    <span>{formatCurrency(sgst)}</span>
                  </div>
                  <div className="flex justify-between border-b-[1px] border-black p-1 px-2">
                    <span>Total Tax</span>
                    <span>{formatCurrency(totalTax)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between border-b-[1px] border-black p-1 px-2">
                  <span>Total Tax</span>
                  <span>{formatCurrency(totalTax)}</span>
                </div>
              )}

              {/* Round off (show only if non-zero) */}
              {Math.abs(roundOff) > 0.005 && (
                <div className="flex justify-between border-b-[1px] border-black p-1 px-2 font-normal">
                  <span>Round off Amount</span>
                  <span>{roundOff > 0 ? '+' : ''}{formatCurrency(roundOff)}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between p-1.5 px-2 text-[12px] bg-slate-50">
                <span>Total Amount After Tax</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
              <div className="text-right text-[8px] p-0.5 px-2 font-bold mb-0.5">
                (E &amp; O.E.)
              </div>
            </div>

            {/* Signature block */}
            <div className="flex flex-col flex-1 pb-1">
              <div className="text-center text-[7.5px] font-bold border-b-[1px] border-black py-1">
                Certified that the particulars given above are true and correct.
              </div>
              <div className="text-center font-bold text-[12px] pt-1">
                For {header.shopName}
              </div>
              {/* Spacer */}
              <div className="flex-1" style={{ minHeight: '44px' }}></div>
              <div className="text-center text-[8px] w-full mt-auto">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-right text-[10px] font-bold mt-1 pr-1">Page 1 of 1</div>
    </div>
  );
}
