import { GRNStatus } from '@prisma/client';

export class GRNItemResponseDto {
  id: string;
  poItemId: string;
  shopProductId: string;
  receivedQuantity: number;
  confirmedPrice?: number;
  uom?: string;
}

export class GRNResponseDto {
  id: string;
  tenantId: string;
  shopId: string;
  poId: string;
  grnNumber: string;
  receivedDate: Date;
  status: GRNStatus;
  isVarianceOverridden: boolean;
  overrideNote?: string;
  overriddenBy?: string;
  createdAt: Date;
  updatedAt: Date;
  items: GRNItemResponseDto[];
}
