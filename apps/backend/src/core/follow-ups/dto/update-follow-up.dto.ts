import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { FollowUpPurpose, FollowUpStatus, FollowUpType } from '@prisma/client';

export class UpdateFollowUpDto {
  @IsOptional()
  @IsEnum(FollowUpType as object)
  type?: FollowUpType;

  @IsOptional()
  @IsEnum(FollowUpPurpose as object)
  purpose?: FollowUpPurpose;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  followUpAt?: string; // ISO string

  @IsOptional()
  @IsString()
  assignedToUserId?: string | null;

  @IsOptional()
  @IsEnum(FollowUpStatus)
  status?: FollowUpStatus;

  @IsOptional()
  @IsString()
  shopId?: string | null;
}
