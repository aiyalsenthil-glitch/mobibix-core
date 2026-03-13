import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class CashLeakageAnalysisDto {
  @IsNotEmpty()
  @IsString()
  shopId: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;
}

export type Severity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface CashLeakageResponse {
  difference: number;
  severity: Severity;
  suggestions: string[];
}
