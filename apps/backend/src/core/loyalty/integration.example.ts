// This file is intentionally non-executable to avoid build-time errors.
// It preserves integration examples in a raw string for reference.
// See also docs/loyalty/LOYALTY_SYSTEM_SPEC.md for context.

export const integrationExample = String.raw`
Integration Guide: Hooking Loyalty into Invoice Payment Flow

This example shows HOW to integrate the LoyaltyService into existing payment logic.
Do not copy-paste blindly - adapt to your actual service structure.

INTEGRATION POINT 1: Invoice Payment Recording
Location: src/modules/mobileshop/services/invoice-payment.service.ts

// Add loyalty earning when invoice becomes PAID
// - calculate new status
// - update invoice
// - award points on PAID

INTEGRATION POINT 2: Razorpay Webhook Handler
Location: src/core/billing/payments/payments.webhook.controller.ts

// Award points after payment confirmed

INTEGRATION POINT 3: Invoice Voiding/Cancellation
Location: src/modules/mobileshop/services/invoice.service.ts

// Reverse loyalty points on void

INTEGRATION POINT 4: Invoice Creation with Loyalty Redemption
Location: src/core/sales/billing.service.ts

// Validate redemption, add negative line item, then create redemption transaction

MODULE REGISTRATION
Add LoyaltyModule to app.module.ts imports.
`;
