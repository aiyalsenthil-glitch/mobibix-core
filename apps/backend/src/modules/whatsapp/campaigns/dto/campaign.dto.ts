import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsDateString,
  IsInt,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MinLength(2)
  name: string;

  /** Authkey numeric wid — required for Authkey provider */
  @IsString()
  wid: string;

  /** Optional: link to a WhatsAppTemplate record */
  @IsOptional()
  @IsString()
  templateId?: string;

  /** Display-only template name */
  @IsOptional()
  @IsString()
  templateName?: string;

  /** Phone numbers to send to (E.164 without +, e.g. "919876543210") */
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  /** Static variable values: { "1": "Hello", "2": "World" } */
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  /** Country code prefix (default "91") */
  @IsOptional()
  @IsString()
  countryCode?: string;

  /** Which WhatsAppNumber to use (defaults to tenant's default) */
  @IsOptional()
  @IsString()
  whatsAppNumberId?: string;

  /** ISO 8601 datetime for scheduled send; omit for immediate */
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  /** Recipients per Authkey API call (max 200) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  batchSize?: number;

  /** Milliseconds to wait between batches */
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(10000)
  batchDelayMs?: number;
}
