import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface PaymentSuccessEmailProps {
  module: ModuleType;
  name: string;
  amount: string;
  date: string;
  invoiceLink: string;
}

export const PaymentSuccessEmail = ({
  module,
  name,
  amount,
  date,
  invoiceLink,
}: PaymentSuccessEmailProps) => {
  return (
    <EmailLayout module={module}>
      <EmailSection>
        <Text
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}
        >
          Payment Received 🧾
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>Hi {name},</Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          We received a payment of <strong>{amount}</strong> on {date}. Thank
          you for your continued business.
        </Text>
        <EmailButton
          module={module}
          href={invoiceLink}
          fullWidth
          variant="secondary"
        >
          Download Invoice
        </EmailButton>
      </EmailSection>
    </EmailLayout>
  );
};

export default PaymentSuccessEmail;
