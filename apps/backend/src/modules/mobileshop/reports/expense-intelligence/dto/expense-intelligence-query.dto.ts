import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExpenseIntelligenceQueryDto {
  @ApiProperty({ description: 'Shop ID' })
  @IsString()
  shopId: string;

  @ApiProperty({ description: 'Start Date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End Date', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
