import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartType } from '@prisma/client';

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
