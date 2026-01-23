import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SalesInvoiceItemDto {
  @IsString()
  shopProductId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  rate: number; // selling price per unit
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
