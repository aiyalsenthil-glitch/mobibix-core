import { IsString, IsOptional } from 'class-validator';

export class LinkGlobalSupplierDto {
  @IsOptional()
  @IsString()
  localName?: string;

  @IsOptional()
  @IsString()
  localPhone?: string;

  @IsOptional()
  @IsString()
  localNotes?: string;
}
