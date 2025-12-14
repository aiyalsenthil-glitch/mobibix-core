// src/auth/dto/exchange.dto.ts
export class ExchangeDto {
  idToken!: string; // Firebase ID token
  tenantCode?: string; // Optional: owner-provided tenant code
}
