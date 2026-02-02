import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class CreateJobCardDto {
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

  @IsString()
  deviceType: string;

  @IsString()
  deviceBrand: string;

  @IsString()
  deviceModel: string;

  @IsOptional()
  @IsString()
  deviceSerial?: string;

  @IsOptional()
  @IsString()
  devicePassword?: string;

  @IsString()
  customerComplaint: string;

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

