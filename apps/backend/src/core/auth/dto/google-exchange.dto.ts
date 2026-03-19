import { IsString, IsOptional } from 'class-validator';

export class GoogleExchangeDto {
  @IsString()
  idToken: string;

  @IsOptional()
  @IsString()
  tenantCode?: string;

  /** Preferred tenant type (e.g. 'MOBILE_SHOP', 'GYM', 'DIGITAL_LEDGER').
   *  When a user belongs to multiple tenants, the one matching this type is resolved first. */
  @IsOptional()
  @IsString()
  preferredTenantType?: string;
}
