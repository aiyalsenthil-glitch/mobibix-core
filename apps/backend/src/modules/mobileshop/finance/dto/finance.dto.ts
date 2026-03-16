import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EmiStatus, SlotStatus } from '@prisma/client';

// ─── EMI Application DTOs ─────────────────────────────────────────────────────

export class CreateEmiApplicationDto {
  @IsString() shopId: string;
  @IsString() invoiceId: string;
  @IsString() @IsOptional() customerId?: string;
  @IsString() financeProvider: string; // e.g. "Bajaj Finserv", "Home Credit"
  @IsString() @IsOptional() applicationRef?: string;
  @IsNumber() @Min(0) loanAmount: number; // rupees
  @IsNumber() @Min(0) @IsOptional() downPayment?: number;
  @IsInt() @Min(1) tenureMonths: number;
  @IsNumber() @Min(0) monthlyEmi: number; // rupees
  @IsNumber() @Min(0) @IsOptional() interestRate?: number; // percent
  @IsNumber() @Min(0) @IsOptional() subventionAmount?: number; // rupees
  @IsString() @IsOptional() notes?: string;
}

export class UpdateEmiStatusDto {
  @IsEnum(EmiStatus) status: EmiStatus;
  @IsString() @IsOptional() applicationRef?: string;
  @IsNumber() @Min(0) @IsOptional() settlementAmount?: number; // rupees
  @IsString() @IsOptional() rejectedReason?: string;
}

// ─── Installment Plan DTOs ────────────────────────────────────────────────────

export class CreateInstallmentPlanDto {
  @IsString() shopId: string;
  @IsString() invoiceId: string;
  @IsString() customerId: string;
  @IsNumber() @Min(0) totalAmount: number; // rupees
  @IsNumber() @Min(0) @IsOptional() downPayment?: number;
  @IsInt() @Min(1) tenureMonths: number;
  @IsString() @IsOptional() startDate?: string; // ISO date, defaults to now
  @IsString() @IsOptional() notes?: string;
}

export class RecordSlotPaymentDto {
  @IsNumber() @Min(0) paidAmount: number; // rupees
  @IsString() @IsOptional() receiptId?: string;
  @IsEnum(SlotStatus) @IsOptional() status?: SlotStatus;
}
