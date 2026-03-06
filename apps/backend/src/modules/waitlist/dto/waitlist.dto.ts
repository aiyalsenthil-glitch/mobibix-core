import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WaitlistSource } from '@prisma/client';

export class JoinWaitlistDto {
  @ApiProperty({ example: '+919876543210' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'test@REMOVED_DOMAIN', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: WaitlistSource, required: false })
  @IsOptional()
  @IsEnum(WaitlistSource)
  source?: WaitlistSource;
}
