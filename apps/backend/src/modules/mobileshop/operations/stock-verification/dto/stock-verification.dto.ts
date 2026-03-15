import {
  IsString,
  IsDateString,
  IsInt,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdjustmentReason } from '@prisma/client';

export class CreateVerificationDto {
  @IsString()
  shopId: string;

  @IsDateString()
  sessionDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class VerificationItemDto {
  @IsString()
  shopProductId: string;

  @IsInt()
  @Min(0)
  physicalQty: number;

  @IsOptional()
  @IsEnum(AdjustmentReason)
  reason?: AdjustmentReason;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerificationItemDto)
  items: VerificationItemDto[];
}

export class ConfirmVerificationDto {
  @IsString()
  shopId: string;
}
