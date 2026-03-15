import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SendWhatsAppMessageDto {
  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsArray()
  parameters?: string[];

  @IsOptional()
  @IsString()
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  whatsAppNumberId?: string;
}

export class CreateWhatsAppCampaignDto {
  @IsString()
  name!: string;

  @IsString()
  templateId!: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class ScheduleWhatsAppCampaignDto {
  @IsDateString()
  scheduledAt!: string;
}

export class WhatsAppLogsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsIn(['QUEUED', 'PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED'])
  status?: string;

  @IsOptional()
  @IsString()
  whatsAppNumberId?: string;

  // 🔥 Pagination fields
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 50;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
