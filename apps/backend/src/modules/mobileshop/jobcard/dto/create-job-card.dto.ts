export class CreateJobCardDto {
  customerName: string;
  customerPhone: string;
  deviceBrand: string;
  deviceModel: string;
  imei?: string;
  problem: string;
  estimatedCost?: number;
}
