import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestDeletionDto {
  @IsBoolean()
  @IsNotEmpty()
  acknowledged: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
