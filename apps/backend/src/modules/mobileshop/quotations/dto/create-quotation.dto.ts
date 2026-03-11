import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuotationItemDto {
  @IsString()
  @IsOptional()
  shopProductId?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @IsOptional()
  gstRate?: number;
}

export class CreateQuotationDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  quotationDate?: string;

  @IsInt()
  @IsOptional()
  validityDays?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items: CreateQuotationItemDto[];
}
