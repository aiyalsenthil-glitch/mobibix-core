import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface PaymentReceiptEmailProps {
  module: ModuleType;
  customerName: string;
  receiptNumber: string;
  amount: string;
  date: string;
  storeName: string;
  viewLink: string;
}

export const PaymentReceiptEmail = ({
  module,
  customerName,
  receiptNumber,
  amount,
  date,
  storeName,
  viewLink,
}: PaymentReceiptEmailProps) => {
    // Guard: Only for MOBILE_SHOP
    if (module !== 'MOBILE_SHOP') return null;

  return (
    <EmailLayout module={module} preview={`Receipt ${receiptNumber} from ${storeName}`}>
      <EmailSection>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
          Payment Received ✅
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {customerName},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          This is a receipt for your payment of <strong>{amount}</strong> to <strong>{storeName}</strong> on {date}.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Reference: {receiptNumber}
        </Text>
        
        <EmailButton module={module} href={viewLink} fullWidth variant="secondary">
          View Receipt
        </EmailButton>
      </EmailSection>
    </EmailLayout>
  );
};

export default PaymentReceiptEmail;
