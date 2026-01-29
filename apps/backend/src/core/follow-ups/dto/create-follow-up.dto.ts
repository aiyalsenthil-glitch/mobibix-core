import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { FollowUpPurpose, FollowUpType } from '@prisma/client';

export class CreateFollowUpDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsEnum(FollowUpType as object)
  type: FollowUpType;

  @IsEnum(FollowUpPurpose as object)
  purpose: FollowUpPurpose;

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
