import { IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartType, FeedbackType, FeedbackStatus } from '@prisma/client';

export class CreateCompatibilityGroupDto {
  @ApiProperty({ description: 'Name of the compatibility group', example: 'TG-SAM-A50' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Type of part for this group', enum: PartType })
  @IsEnum(PartType)
  partType: PartType;
}

export class AddPhoneToGroupDto {
  @ApiProperty({ description: 'ID of the phone model to add' })
  @IsString()
  @IsNotEmpty()
  phoneModelId: string;
}

export class LinkPartToGroupDto {
  @ApiProperty({ description: 'ID of the part to link' })
  @IsString()
  @IsNotEmpty()
  partId: string;
}
export class CreatePhoneModelDto {
  @ApiProperty({ description: 'Name of the brand', example: 'Samsung' })
  @IsString()
  @IsNotEmpty()
  brandName: string;

  @ApiProperty({ description: 'Name of the model', example: 'Galaxy A54' })
  @IsString()
  @IsNotEmpty()
  modelName: string;
}

export class SmartLinkModelsDto {
  @ApiProperty({ description: 'First phone model ID' })
  @IsString()
  @IsNotEmpty()
  modelAId: string;

  @ApiProperty({ description: 'Second phone model ID' })
  @IsString()
  @IsNotEmpty()
  modelBId: string;

  @ApiProperty({ description: 'List of categories to link', enum: PartType, isArray: true })
  @IsEnum(PartType, { each: true })
  categories: PartType[];
}

export class CreateFeedbackDto {
  @ApiProperty({ enum: FeedbackType })
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phoneModelId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  targetModelId?: string;

  @ApiProperty({ enum: PartType })
  @IsEnum(PartType)
  partType: PartType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  details?: string;
}

export class UnlinkModelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phoneModelId: string;

  @ApiProperty({ enum: PartType })
  @IsEnum(PartType)
  partType: PartType;
}
