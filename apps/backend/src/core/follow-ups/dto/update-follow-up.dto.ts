import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FollowUpStatus, FollowUpType } from '@prisma/client';

export class UpdateFollowUpDto {
  @IsOptional()
  @IsEnum(FollowUpType as object)
  type?: FollowUpType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  purpose?: string;

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
