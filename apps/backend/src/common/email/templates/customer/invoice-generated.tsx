import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface InvoiceGeneratedEmailProps {
  module: ModuleType;
  customerName: string;
  invoiceNumber: string;
  amount: string;
  storeName: string;
  invoiceDate: string;
  viewLink: string;
}

export const InvoiceGeneratedEmail = ({
  module,
  customerName,
  invoiceNumber,
  amount,
  storeName,
  invoiceDate,
  viewLink,
}: InvoiceGeneratedEmailProps) => {
    // Guard: Only for MOBILE_SHOP
    if (module !== 'MOBILE_SHOP') return null;

  return (
    <EmailLayout module={module} preview={`Invoice ${invoiceNumber} from ${storeName}`}>
      <EmailSection>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
          Invoice {invoiceNumber} from {storeName}
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {customerName},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Thank you for choosing <strong>{storeName}</strong>.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Your invoice details:
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          <strong>Invoice:</strong> {invoiceNumber}<br />
          <strong>Amount:</strong> ₹{amount}<br />
          <strong>Date:</strong> {invoiceDate}
        </Text>
        
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
           A PDF copy is attached for your records.
        </Text>

        <EmailButton module={module} href={viewLink} fullWidth>
          View Invoice Online
        </EmailButton>

        <Text style={{ color: '#4b5563', lineHeight: '24px', marginTop: '24px' }}>
          If you have any questions, just reply to this email.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          We appreciate your business.
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default InvoiceGeneratedEmail;
