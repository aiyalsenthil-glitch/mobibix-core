import {
  Tenant,
  User,
  Party,
  Member,
  Invoice,
  Payment,
  StaffInvite,
  Plan,
  TenantSubscription,
} from '@prisma/client';

export type ModuleType = 'GYM' | 'MOBILE_SHOP';

export interface BaseEmailEvent {
  tenantId: string;
  module: ModuleType;
  timestamp: Date;
}

// ──────────────────────────────
// TENANT EVENTS
// ──────────────────────────────
export class TenantWelcomeEvent implements BaseEmailEvent {
  constructor(
    public tenantId: string,
    public module: ModuleType,
    public timestamp: Date,
    public user: User,
    public tenant: Tenant,
  ) {}
}

export class SubscriptionTrialStartedEvent implements BaseEmailEvent {
  constructor(
    public tenantId: string,
    public module: ModuleType,
    public timestamp: Date,
    public subscription: TenantSubscription,
  ) {}
}

export class SubscriptionTrialExpiringEvent implements BaseEmailEvent {
  constructor(
    public tenantId: string,
    public module: ModuleType,
    public timestamp: Date,
    public subscription: TenantSubscription,
    public daysLeft: number,
  ) {}
}

export class SubscriptionTrialExpiredEvent implements BaseEmailEvent {
  constructor(
    public tenantId: string,
    public module: ModuleType,
    public timestamp: Date,
    public subscription: TenantSubscription,
  ) {}
}

export class SubscriptionUpgradedEvent implements BaseEmailEvent {
  constructor(
    public tenantId: string,
    public module: ModuleType,
    public timestamp: Date,
    public oldPlan: Plan,
    public newPlan: Plan,
  ) {}
}

export class PaymentSuccessEvent implements BaseEmailEvent {
  constructor(
    public tenantId: string,
    public module: ModuleType,
    public timestamp: Date,
    public payment: Payment,
    public billingType: string, // 'MANUAL' | 'AUTOPAY'
  ) {}
}

export class PaymentFailedEvent implements BaseEmailEvent {
  constructor(
    public tenantId: string,
    public module: ModuleType,
    public timestamp: Date,
    public payment: Payment,
    public retryCount: number,
    public nextRetry: Date | null,
  ) {}
}

// ──────────────────────────────
// STAFF EVENTS
// ──────────────────────────────
export class StaffInvitedEvent implements BaseEmailEvent {
  constructor(
    public tenantId: string,
    public module: ModuleType,
    public timestamp: Date,
    public invite: StaffInvite,
    public token: string,
  ) {}
}

// ──────────────────────────────
// CUSTOMER EVENTS
// ──────────────────────────────
export class CustomerInvoiceGeneratedEvent implements BaseEmailEvent {
  constructor(
    public tenantId: string,
    public module: ModuleType,
    public timestamp: Date,
    public invoice: Invoice, // Using existing Invoice model, assume mapped later
    public customer: Party,
    public pdfUrl?: string,
  ) {}
}

export class MemberExpiringEvent implements BaseEmailEvent {
  constructor(
    public tenantId: string,
    public module: ModuleType,
    public timestamp: Date,
    public member: Member,
    public expiryDate: Date,
  ) {}
}
