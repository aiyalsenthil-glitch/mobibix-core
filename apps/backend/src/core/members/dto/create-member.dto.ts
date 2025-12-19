import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateMemberDto {
  name: string;
  phone: string; // ✅ REQUIRED
  email?: string;
}
