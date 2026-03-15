import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGRNItemDto {
  @IsString()
  poItemId: string;

  @IsString()
  shopProductId: string;

  @IsInt()
  receivedQuantity: number;

  @IsOptional()
  @IsInt()
  confirmedPrice?: number;

  @IsOptional()
  @IsString()
  uom?: string;
}

export class CreateGRNDto {
  @IsString()
  shopId: string;

  @IsString()
  poId: string;

  @IsString()
  grnNumber: string;

  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @IsOptional()
  @IsBoolean()
  isVarianceOverridden?: boolean;

  @IsOptional()
  @IsString()
  overrideNote?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGRNItemDto)
  items: CreateGRNItemDto[];
}
