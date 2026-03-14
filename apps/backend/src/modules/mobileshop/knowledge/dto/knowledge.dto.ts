import { IsString, IsNotEmpty, IsOptional, IsArray, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFaultDiagnosisDto {
  @ApiProperty({ example: 'Not Charging' })
  @IsString()
  @IsNotEmpty()
  faultType: string;

  @ApiProperty({ example: ['Clean charging port', 'Test cable'] })
  @IsArray()
  @IsString({ each: true })
  steps: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateRepairNoteDto {
  @ApiProperty({ example: 'Xiaomi' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({ example: 'Redmi Note 10' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 'Not Charging' })
  @IsString()
  @IsNotEmpty()
  faultType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  videoUrl?: string;
}
