export class UpdateJobCardDto {
  customerId?: string;

  customerName?: string;
  customerPhone?: string;
  customerAltPhone?: string;

  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceSerial?: string;

  customerComplaint?: string;
  physicalCondition?: string;

  estimatedCost?: number;
  advancePaid?: number;
  estimatedDelivery?: Date;
}
