
export class InvoiceCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly shopId: string,
    public readonly invoiceId: string,
    public readonly customerId: string | null,
    public readonly amount: number,
    public readonly invoiceNumber: string,
  ) {}
}

export class InvoicePaidEvent {
  constructor(
    public readonly tenantId: string,
    public readonly shopId: string,
    public readonly invoiceId: string,
    public readonly customerId: string | null,
    public readonly paidAmount: number,
    public readonly paymentMode: string,
    public readonly isFullPayment: boolean,
  ) {}
}

export class JobStatusChangedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly shopId: string,
    public readonly jobId: string,
    public readonly customerId: string | null,
    public readonly status: string,
    public readonly customerPhone: string | null,
    public readonly deviceModel: string | null,
  ) {}
}
