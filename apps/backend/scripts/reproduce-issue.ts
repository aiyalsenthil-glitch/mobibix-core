
import { PaymentMode, InvoiceStatus } from '@prisma/client';

// Mocking the helper functions from SalesService
function toPaisa(amount: number): number {
  return Math.round(amount * 100);
}

function fromPaisa(amount: number): number {
  return amount / 100;
}

// Mocking the scenario
async function testMixedPayment() {
    console.log("--- Starting Mixed Payment Test ---");

    // Scenario: Invoice for 1000 Rupees
    // Subtotal: 1000, GST: 0
    const calc = {
        subTotal: 1000,
        gstAmount: 0
    };

    const totalAmountPaisa = toPaisa(calc.subTotal + calc.gstAmount);
    console.log(`Invoice Total (Paisa): ${totalAmountPaisa}`);

    // Payment: 500 Cash + 500 UPI
    const paymentMethods = [
        { mode: 'CASH', amount: 500 },
        { mode: 'UPI', amount: 500 }
    ];

    let totalPaidPaisa = 0;
    
    // Simulate SalesService logic
    for (const pm of paymentMethods) {
        if (pm.mode !== 'CREDIT') {
            const amountPaisa = toPaisa(pm.amount);
            totalPaidPaisa += amountPaisa;
            console.log(`Payment: ${pm.mode}, Amount: ${pm.amount}, Paisa: ${amountPaisa}`);
        }
    }

    console.log(`Total Paid (Paisa): ${totalPaidPaisa}`);
    console.log(`Diff: ${totalAmountPaisa - totalPaidPaisa}`);

    const invoiceStatus =
        totalPaidPaisa >= totalAmountPaisa - 100
          ? 'PAID'
          : 'PARTIALLY_PAID';
    
    console.log(`Result Status: ${invoiceStatus}`);

    if (invoiceStatus !== 'PAID') {
        console.error("❌ FAILED: Should be PAID but is " + invoiceStatus);
    } else {
        console.log("✅ PASSED: Correctly identified as PAID");
    }

     // Scenario 2: With decimals
    console.log("\n--- Scenario 2: Decimals ---");
    const calc2 = { subTotal: 100.45, gstAmount: 18.08 }; // Total 118.53
    const totalAmountPaisa2 = toPaisa(calc2.subTotal + calc2.gstAmount);
    console.log(`Invoice Total 2 (Paisa): ${totalAmountPaisa2} (Expecting 11853)`);

    const paymentMethods2 = [
        { mode: 'CASH', amount: 50.53 },
        { mode: 'UPI', amount: 68.00 }
    ]; // Total 118.53

    let totalPaidPaisa2 = 0;
    for (const pm of paymentMethods2) {
        if (pm.mode !== 'CREDIT') {
            const amountPaisa = toPaisa(pm.amount);
            totalPaidPaisa2 += amountPaisa;
             console.log(`Payment: ${pm.mode}, Amount: ${pm.amount}, Paisa: ${amountPaisa}`);
        }
    }
    
    console.log(`Total Paid 2 (Paisa): ${totalPaidPaisa2}`);
    console.log(`Diff 2: ${totalAmountPaisa2 - totalPaidPaisa2}`);
    
    const invoiceStatus2 =
        totalPaidPaisa2 >= totalAmountPaisa2 - 100
          ? 'PAID'
          : 'PARTIALLY_PAID';
    console.log(`Result Status 2: ${invoiceStatus2}`);
}

testMixedPayment();
