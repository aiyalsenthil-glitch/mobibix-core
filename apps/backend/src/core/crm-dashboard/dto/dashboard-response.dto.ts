/**
 * CRM Dashboard Response Structure
 * Designed for frontend charts and metric cards
 */

export interface CustomerMetrics {
  total: number;
  active: number;
  inactive: number;
  newCustomers: {
    last7Days: number;
    last30Days: number;
  };
  repeatCustomers: number; // Customers with >1 invoice
  repeatRate: number; // Percentage (0-100)
}

export interface FollowUpMetrics {
  dueToday: number;
  overdue: number;
  pending: number;
  completedThisWeek: number;
}

export interface FinancialMetrics {
  totalOutstanding: number; // Sum of unpaid invoices
  highValueCustomers: HighValueCustomer[]; // Top 10 by total spend
}

export interface HighValueCustomer {
  customerId: string;
  customerName: string;
  totalSpent: number;
  invoiceCount: number;
  lastInvoiceDate: Date;
}

export interface LoyaltyMetrics {
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  netPointsBalance: number;
  activeCustomersWithPoints: number;
}

export interface WhatsAppMetrics {
  totalSent: number;
  successful: number;
  failed: number;
  successRate: number; // Percentage (0-100)
  last7Days: {
    date: string; // YYYY-MM-DD
    sent: number;
    successful: number;
  }[];
}

export interface CrmDashboardResponse {
  customers: CustomerMetrics;
  followUps: FollowUpMetrics;
  financials: FinancialMetrics;
  loyalty: LoyaltyMetrics;
  whatsapp: WhatsAppMetrics;
  dateRange: {
    startDate: Date;
    endDate: Date;
    preset?: string;
  };
  generatedAt: Date;
}
