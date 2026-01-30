import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FollowUpStatus } from '@prisma/client';

export enum FollowUpBucket {
  TODAY = 'today',
  OVERDUE = 'overdue',
  UPCOMING = 'upcoming',
}

export class FollowUpQueryDto {
  @IsOptional()
  @IsEnum(FollowUpBucket)
  bucket?: FollowUpBucket;

  @IsOptional()
  @IsEnum(FollowUpStatus)
  status?: FollowUpStatus;

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsString()
  assignedToUserId?: string;
}
