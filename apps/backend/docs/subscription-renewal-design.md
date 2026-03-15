# Subscription System & Razorpay AutoPay Implementation

This document covers the unified architecture for handling subscription renewals, specifically focusing on the integration between local cron jobs and the Razorpay Recurring Payments (AutoPay) engine.

## 1. Core Objectives
*   **Prevent Double Deductions**: Ensure the system doesn't charge a user twice for the same billing cycle.
*   **Maintain Audit History**: Keep a row-level record of every subscription cycle (Active, Expired, Cancelled).
*   **Global Scalability**: Support multi-currency (USD, INR) and timezone-aligned billing cycles.
*   **Reliable Reconciliation**: Use Webhooks as the primary signal for AutoPay success.

---

## 2. Architectural Decision Record (ADR)

### Two-Track Renewal System

| Track | Type | Trigger | Logic |
| :--- | :--- | :--- | :--- |
| **Track A: Manual/One-Time** | `MANUAL`, `TRIAL` | **Backend Cron** | Cron finds expired subscriptions, validates eligibility, and creates a new cycle. |
| **Track B: AutoPay** | `AUTOPAY` | **Razorpay Webhook** | Razorpay's engine charges the customer. Our `subscription.charged` webhook listener creates the new cycle. |

> [!IMPORTANT]
> The **Backend Cron** has been updated to explicitly ignore `AUTOPAY` subscriptions. This removes the risk of the server attempting to "renew" a record while Razorpay is simultaneously processing a payment.

---

## 3. Database Schema Changes

### Unique Constraint Refinement
*   **Old Constraint**: `@@unique([tenantId, module, status])`
*   **New Constraint**: `@@unique([tenantId, module, endDate])`

**Why?** 
The previous constraint prevented having more than one `EXPIRED` row for the same module. The new constraint allows for an unlimited history of past cycles (since each renewal has a unique `endDate`) while still preventing duplicate active cycles.

---

## 4. Implementation Details

### A. Auto-Renewal Cron (`AutoRenewCronService`)
The cron job runs periodically (standard: 1 AM) to catch manual and trial subscriptions.
*   **Filter**: `billingType: { not: BillingType.AUTOPAY }`.
*   **Action**: Gracefully expires the current row and creates a new one.

### B. Razorpay Webhook Processor (`RazorpayWebhookProcessor`)
Handles the `subscription.charged` event from Razorpay.
*   **Cycle Management**: When a charge succeeds, the handler atomically expires the old subscription and creates a new `ACTIVE` row.
*   **Source of Truth**: It uses Razorpay's `current_start` and `current_end` Unix timestamps to set the database dates, ensuring 100% synchronization with the payment gateway.
*   **Resurrection Guard**: If a webhook arrives after the cron has already marked a sub as expired (due to network delay), the processor can "resurrect" the access if the charge is legitimate.

---

## 5. Global SaaS Solution Plan

### Multi-Currency Pricing
The system uses a **Regional Pricing Schema** for global scaling:
*   **Schema**: The `PlanPrice` model includes a `currency` field.
*   **Unique Constraint**: `@@unique([planId, billingCycle, currency])`.
*   **Decoupling**: Each `PlanPrice` record links a product + billing cycle + currency to its corresponding **Razorpay Plan ID**.

### International Payment Routing
1.  **Supported AutoPay Regions**: For **India, Malaysia, Singapore, and USA**, the system uses Razorpay's native Subscription API for automated recurring charges.
2.  **Global Fallback**: For other countries, the system generates **International Payment Links**. This allows customers to pay with global credit cards while the backend treats the renewal as a semi-automated track.
3.  **Automatic Currency Mapping**: During checkout, the system detects the `Tenant.currency` and fetches the matching `PlanPrice` record automatically.

### Timezone Synchronization (Technical Implementation)
Using the parameters from the Razorpay Subscription API:
*   **`start_at`**: We use this Unix timestamp when creating the subscription to control exactly when the first charge happens (aligned to User's local timezone).
*   **Response `current_start`/`current_end`**: Our webhook handler extracts these from the response payload to ensure our database reflects the exact period charged by Razorpay, regardless of server lag.

---

## 6. Testing & Troubleshooting

### Debugging Tools
*   `setup-autopay-test.ts`: Creates a mock tenant with an expired AutoPay subscription.
*   `trigger-cron.ts`: Manually triggers the renewal cycle for logs.
*   `simulate-autopay-webhook.ts`: Mocks a Razorpay success signal to verify cycle creation.

### Common Errors
*   **Metric Label Error**: Ensure the `planId` label is declared in `SubscriptionsModule` for Prometheus counters.
*   **Constraint Violations**: If a renewal fails with `P2002`, verify that the `endDate` for the new cycle isn't identical to an existing one.
