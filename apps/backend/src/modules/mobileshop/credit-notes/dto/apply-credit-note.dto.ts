import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class ApplyCreditNoteDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsString()
  @IsOptional()
  purchaseId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
