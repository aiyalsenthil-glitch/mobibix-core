import { IsString, IsArray, ArrayMinSize, IsNotEmpty } from 'class-validator';

export class CopyFromShopDto {
  @IsString()
  @IsNotEmpty()
  sourceShopId: string;

  @IsString()
  @IsNotEmpty()
  targetShopId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds: string[];
}
