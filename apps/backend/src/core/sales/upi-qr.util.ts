/**
 * Builds a UPI deep link URI for payment.
 * The frontend renders this as a QR code via QRCodeSVG.
 * @param upiId  Shop's UPI VPA e.g. "shopname@ybl"
 * @param amountPaisa  Invoice total in paisa (integer)
 * @param invoiceNumber  e.g. "MBX-S-202526-0001"
 */
export function buildUpiUri(
  upiId: string,
  amountPaisa: number,
  invoiceNumber: string,
): string {
  const amount = (amountPaisa / 100).toFixed(2);
  const tn = encodeURIComponent(`Invoice ${invoiceNumber}`);
  return `upi://pay?pa=${upiId}&am=${amount}&cu=INR&tn=${tn}`;
}
