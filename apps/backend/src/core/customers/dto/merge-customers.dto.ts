import { IsNotEmpty, IsString } from 'class-validator';

export class MergeCustomersDto {
  @IsNotEmpty()
  @IsString()
  sourceId: string;

  @IsNotEmpty()
  @IsString()
  targetId: string;
}
