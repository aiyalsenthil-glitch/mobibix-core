import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsEnum,
} from 'class-validator';

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
  @IsEnum(['WITH_GST', 'WITHOUT_GST'])
  /**
   * @deprecated Compliance Violation. Do not use.
   * System now strictly respects Shop.gstEnabled status.
   */
  billType?: 'WITH_GST' | 'WITHOUT_GST';

  @IsOptional()
  @IsDateString()
  estimatedDelivery?: Date;
}
