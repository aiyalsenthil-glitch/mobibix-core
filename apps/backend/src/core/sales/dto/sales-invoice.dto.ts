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

  @IsNumber()
  @Min(0)
  gstAmount: number; // GST amount (frontend-calculated)

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  imeis?: string[]; // IMEI list for MOBILE products
}

export class SalesInvoiceDto {
  @IsString()
  shopId: string;

  @IsString()
  invoiceNumber: string;

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

  @IsString()
  paymentMode: 'CASH' | 'CARD' | 'UPI' | 'BANK';

  @IsOptional()
  @IsBoolean()
  pricesIncludeTax?: boolean; // Whether displayed prices include GST
}
