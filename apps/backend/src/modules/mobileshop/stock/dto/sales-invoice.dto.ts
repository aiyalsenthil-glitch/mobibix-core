import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
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

  @IsNumber()
  @Min(0)
  gstAmount: number; // GST amount (frontend-calculated)
}

export class SalesInvoiceDto {
  @IsString()
  shopId: string;

  @IsString()
  invoiceNumber: string;

  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsArray()
  items: SalesInvoiceItemDto[];

  @IsString()
  paymentMode: 'CASH' | 'CARD' | 'UPI' | 'BANK';
}
