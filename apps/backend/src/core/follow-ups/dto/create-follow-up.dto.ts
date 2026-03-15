import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { FollowUpType } from '@prisma/client';

export class CreateFollowUpDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsEnum(FollowUpType as object)
  type: FollowUpType;

  @IsString()
  @IsNotEmpty()
  purpose: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsDateString()
  followUpAt: string; // ISO string

  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  @IsOptional()
  @IsBoolean()
  notifyOnDue?: boolean;
}
