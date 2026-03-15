export class SupplierResponseDto {
  id: string;
  tenantId: string;
  name: string;
  gstin?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  contactPerson?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  status: string;
  tags?: string[];
  paymentTerms?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // SupplierProfile fields
  category?: string;
  riskFlag?: boolean;
  rating?: number;
  paymentDueDays?: number;
  creditLimit?: number;
  preferredCurrency?: string;
  outstandingBalance?: number;
}
