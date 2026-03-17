import { IsIn, IsOptional, IsString } from 'class-validator';

export class CancelEWayBillDto {
  /** 1=Duplicate, 2=OrderCancelled, 3=DataEntryMistake */
  @IsIn([1, 2, 3])
  cancelRsnCode: number;

  @IsString()
  @IsOptional()
  cancelRmrk?: string;
}
