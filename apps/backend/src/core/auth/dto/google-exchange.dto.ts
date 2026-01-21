import { IsString, IsOptional } from 'class-validator';

export class GoogleExchangeDto {
  @IsString()
  idToken: string;

  @IsOptional()
  @IsString()
  tenantCode?: string;
}
