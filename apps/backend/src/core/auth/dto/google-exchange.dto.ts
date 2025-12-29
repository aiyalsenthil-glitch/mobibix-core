import { IsString } from 'class-validator';

export class GoogleExchangeDto {
  @IsString()
  idToken: string;
}
