import {
  IsNotEmpty,
  IsString,
  IsPhoneNumber,
  IsOptional,
} from 'class-validator';

export class CreateLedgerCustomerDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsPhoneNumber('IN')
  phone: string;

  @IsOptional()
  @IsString()
  address?: string;
}
