import { IsString, IsOptional, IsNotEmpty, MinLength } from 'class-validator';

// src/auth/dto/exchange.dto.ts
export class ExchangeDto {
  @IsString()
  @IsNotEmpty({ message: 'Firebase ID token is required' })
  @MinLength(10, { message: 'Invalid Firebase ID token format' })
  idToken!: string; // Firebase ID token

  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Tenant code must be at least 3 characters' })
  tenantCode?: string; // Optional: owner-provided tenant code
}
