import { IsString, IsNotEmpty, IsOptional, IsArray, IsUrl, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFaultTypeDto {
  @ApiProperty({ example: 'Not Charging' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class FaultDiagnosisStepDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  order: number;

  @ApiProperty({ example: 'Clean charging port' })
  @IsString()
  @IsNotEmpty()
  stepText: string;
}

export class CreateFaultDiagnosisDto {
  @ApiProperty({ example: 'fault-type-uuid' })
  @IsString()
  @IsNotEmpty()
  faultTypeId: string;

  @ApiProperty({ type: [FaultDiagnosisStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaultDiagnosisStepDto)
  steps: FaultDiagnosisStepDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateRepairKnowledgeDto {
  @ApiProperty({ example: 'phone-model-uuid', required: false })
  @IsString()
  @IsOptional()
  phoneModelId?: string;

  @ApiProperty({ example: 'fault-type-uuid' })
  @IsString()
  @IsNotEmpty()
  faultTypeId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  videoUrl?: string;
}
