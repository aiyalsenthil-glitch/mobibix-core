import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
} from 'class-validator';

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
  campaignId?: string;
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
}
