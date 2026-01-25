export class CreateJobCardDto {
  customerId?: string;

  customerName?: string;
  customerPhone?: string;
  customerAltPhone?: string;

  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  deviceSerial?: string;
  devicePassword?: string;

  customerComplaint: string;
  physicalCondition?: string;

  estimatedCost?: number;
  diagnosticCharge?: number;
  advancePaid?: number;
  billType?: string;
  estimatedDelivery?: Date;
}
