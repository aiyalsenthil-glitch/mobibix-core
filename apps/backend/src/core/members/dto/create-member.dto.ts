import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateMemberDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
