export type EmailTemplateType =
  | 'TENANT_WELCOME'
  | 'TRIAL_STARTED'
  | 'TRIAL_EXPIRING'
  | 'TRIAL_EXPIRED'
  | 'PLAN_UPGRADED'
  | 'PLAN_DOWNGRADED'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_HALTED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'TRIAL_ONBOARDING_DAY1'
  | 'TRIAL_ONBOARDING_DAY3'
  | 'TRIAL_ONBOARDING_DAY5'
  | 'TRIAL_ONBOARDING_DAY7'
  | 'TRIAL_ONBOARDING_DAY10'
  | 'STAFF_INVITED'
  | 'MEMBER_EXPIRING'
  | 'MEMBERSHIP_EXPIRED'
  | 'MEMBERSHIP_RENEWAL_SUCCESS'
  | 'INVOICE_GENERATED'
  | 'PAYMENT_RECEIPT'
  | 'JOBCARD_CREATED'
  | 'JOBCARD_STATUS_UPDATED'
  | 'JOBCARD_COMPLETED'
  | 'EMAIL_VERIFICATION'
  | 'DELETION_REQUEST';

export interface EmailTemplateProps {
  // Tenant
  TENANT_WELCOME: { tenantName: string; link: string };
  TRIAL_STARTED: {
    name: string;
    planName: string;
    trialEndDate: string;
    dashboardLink: string;
  };
  TRIAL_EXPIRING: { name: string; trialEndDate: string; upgradeLink: string };
  TRIAL_EXPIRED: { name: string; planName: string; upgradeLink: string };
  PLAN_UPGRADED: {
    name: string;
    newPlanName: string;
    effectiveDate: string;
    dashboardLink: string;
  };
  PLAN_DOWNGRADED: {
    name: string;
    newPlanName: string;
    effectiveDate: string;
    dashboardLink: string;
  };
  SUBSCRIPTION_ACTIVATED: {
    name: string;
    planName: string;
    nextBillingDate: string;
    dashboardLink: string;
  };
  SUBSCRIPTION_HALTED: { name: string; billingLink: string };
  PAYMENT_SUCCESS: {
    name: string;
    amount: string;
    date: string;
    invoiceLink: string;
  };
  PAYMENT_FAILED: {
    tenantName: string;
    planName: string;
    retryCount: number;
    payLink: string;
  };

  // Trial Onboarding Nudges
  TRIAL_ONBOARDING_DAY1: { name: string; dashboardLink: string; productName: string };
  TRIAL_ONBOARDING_DAY3: { name: string; productName: string };
  TRIAL_ONBOARDING_DAY5: { name: string; dashboardLink: string; productName: string };
  TRIAL_ONBOARDING_DAY7: { name: string; statsLink: string; productName: string };
  TRIAL_ONBOARDING_DAY10: { name: string; upgradeLink: string; productName: string };


  // Staff
  STAFF_INVITED: {
    staffName: string;
    inviterName: string;
    role: string;
    inviteLink: string;
  };

  // Member
  MEMBER_EXPIRING: {
    name: string;
    gymName: string;
    expiryDate: string;
    renewLink: string;
  };
  MEMBERSHIP_EXPIRED: {
    memberName: string;
    gymName: string;
    renewalLink: string;
  };
  MEMBERSHIP_RENEWAL_SUCCESS: {
    memberName: string;
    gymName: string;
    expiryDate: string;
    renewalLink: string;
  };

  // Customer
  INVOICE_GENERATED: {
    customerName: string;
    invoiceNumber: string;
    amount: string;
    storeName: string;
    invoiceDate: string;
    viewLink: string;
  };
  PAYMENT_RECEIPT: {
    customerName: string;
    receiptNumber: string;
    amount: string;
    date: string;
    storeName: string;
    viewLink: string;
  };
  JOBCARD_CREATED: {
    customerName: string;
    jobcardNumber: string;
    storeName: string;
    trackingLink: string;
  };
  JOBCARD_STATUS_UPDATED: {
    customerName: string;
    jobcardNumber: string;
    newStatus: string;
    storeName: string;
    trackingLink: string;
  };
  JOBCARD_COMPLETED: {
    customerName: string;
    jobcardNumber: string;
    deviceName: string;
    cost: string;
    storeName: string;
    trackingLink: string;
  };

  // System Auth
  EMAIL_VERIFICATION: { name: string; verificationLink: string };
  // Admin
  DELETION_REQUEST: {
    tenantName: string;
    tenantId: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    requestedAt: string;
    reason: string;
  };
}
