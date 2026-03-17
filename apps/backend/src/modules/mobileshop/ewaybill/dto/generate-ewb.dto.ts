import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateEWayBillDto {
  /** ROAD | RAIL | AIR | SHIP — defaults to ROAD in service */
  @IsIn(['ROAD', 'RAIL', 'AIR', 'SHIP'])
  @IsOptional()
  transMode?: string;

  /** Required when transMode=ROAD — enforced in service */
  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  @IsString()
  @IsOptional()
  transporterId?: string;

  @IsString()
  @IsOptional()
  transporterName?: string;

  /** Distance in km. NIC valid range: 1–3000 */
  @IsInt()
  @Min(1)
  @Max(3000)
  distance: number;
}
