import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUrl,
  IsInt,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RepairKnowledgeStatus, RepairKnowledgeSource } from '@prisma/client';

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

  @ApiProperty({ example: 'Clean charging port with a brush' })
  @IsString()
  @IsNotEmpty()
  stepText: string;
}

export class CreateFaultDiagnosisDto {
  @ApiProperty({ example: 'fault-type-cuid' })
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
  @ApiProperty({ example: 'phone-model-cuid', required: false })
  @IsString()
  @IsOptional()
  phoneModelId?: string;

  @ApiProperty({ example: 'fault-type-cuid' })
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

  @ApiProperty({ enum: RepairKnowledgeSource, default: RepairKnowledgeSource.COMMUNITY })
  @IsEnum(RepairKnowledgeSource)
  @IsOptional()
  source?: RepairKnowledgeSource;
}

export class VoteRepairKnowledgeDto {
  @ApiProperty({ enum: ['helpful', 'notHelpful'] })
  @IsEnum(['helpful', 'notHelpful'])
  vote: 'helpful' | 'notHelpful';
}

export class ModerateRepairKnowledgeDto {
  @ApiProperty({ enum: RepairKnowledgeStatus })
  @IsEnum(RepairKnowledgeStatus)
  status: RepairKnowledgeStatus;
}
