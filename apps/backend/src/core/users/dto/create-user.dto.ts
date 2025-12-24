import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { UserRole as Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  fullName?: string;
}
