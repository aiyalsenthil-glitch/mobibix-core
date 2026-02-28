import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ArrayNotEmpty,
  IsBoolean,
} from 'class-validator';

export class SalesInvoiceItemDto {
  @IsString()
  shopProductId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  rate: number; // selling price per unit

  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate: number; // GST rate percentage (frontend-calculated)

  @IsOptional()
  @IsNumber()
  @Min(0)
  // Frontend preview value — backend IGNORES this and recalculates via calculateInvoiceTotals().
  // Kept optional for backward compatibility with existing clients.
  gstAmount?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  imeis?: string[]; // IMEI list for MOBILE products

  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyDays?: number;

  @IsOptional()
  @IsArray()
  serialNumbers?: string[]; // Non-IMEI serial numbers
}

export class PaymentMethodDto {
  @IsString()
  mode: 'CASH' | 'CARD' | 'UPI' | 'BANK' | 'CREDIT';

  @IsNumber()
  @Min(0)
  amount: number;
}

export class SalesInvoiceDto {
  @IsString()
  shopId: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  invoiceDate?: string; // ISO date string

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerState?: string;

  @IsOptional()
  @IsString()
  customerGstin?: string;

  @IsArray()
  items: SalesInvoiceItemDto[];

  @IsOptional()
  @IsString()
  paymentMode?: 'CASH' | 'CARD' | 'UPI' | 'BANK' | 'CREDIT'; // Deprecated: use paymentMethods

  @IsOptional()
  @IsArray()
  paymentMethods?: PaymentMethodDto[]; // Mixed payment support

  @IsOptional()
  @IsBoolean()
  pricesIncludeTax?: boolean; // Whether displayed prices include GST

  @IsOptional()
  @IsInt()
  @Min(0)
  loyaltyPointsRedeemed?: number;
}
