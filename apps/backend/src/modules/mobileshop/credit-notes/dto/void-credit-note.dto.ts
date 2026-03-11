import { IsString, IsNotEmpty } from 'class-validator';

export class VoidCreditNoteDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
