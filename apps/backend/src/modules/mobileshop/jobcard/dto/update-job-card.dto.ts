import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class UpdateJobCardDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAltPhone?: string;

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @IsString()
  deviceBrand?: string;

  @IsOptional()
  @IsString()
  deviceModel?: string;

  @IsOptional()
  @IsString()
  deviceSerial?: string;

  @IsOptional()
  @IsString()
  devicePassword?: string;

  @IsOptional()
  @IsString()
  customerComplaint?: string;

  @IsOptional()
  @IsString()
  physicalCondition?: string;

  @IsOptional()
  @IsNumber()
  estimatedCost?: number;

  @IsOptional()
  @IsNumber()
  diagnosticCharge?: number;

  @IsOptional()
  @IsNumber()
  advancePaid?: number;

  @IsOptional()
  @IsString()
  billType?: string;

  @IsOptional()
  @IsDateString()
  estimatedDelivery?: Date;
}

