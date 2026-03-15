import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface PaymentFailedEmailProps {
  module: ModuleType;
  tenantName: string;
  planName: string;
  retryCount: number;
  payLink: string;
}

export const PaymentFailedEmail = ({
  module,
  tenantName,
  planName,
  retryCount,
  payLink,
}: PaymentFailedEmailProps) => {
  const isFinalWarning = retryCount >= 3;

  const subject = isFinalWarning
    ? 'Final notice — service suspension risk'
    : 'We couldn’t process your payment';

  const title = isFinalWarning
    ? 'Final notice — service suspension risk'
    : 'We couldn’t process your payment';

  const buttonText = isFinalWarning
    ? 'Resolve Payment Now'
    : 'Update Payment Details';

  return (
    <EmailLayout module={module} preview={subject}>
      <EmailSection>
        <Text
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#DC2626' }}
        >
          {title}
        </Text>
        <Text
          style={{ fontSize: '16px', color: '#4b5563', lineHeight: '24px' }}
        >
          Hi {tenantName},
        </Text>

        {!isFinalWarning ? (
          <>
            <Text
              style={{ fontSize: '16px', color: '#4b5563', lineHeight: '24px' }}
            >
              We attempted to process your recent payment for{' '}
              <strong>{planName}</strong>, but it didn’t go through.
            </Text>
            <Text
              style={{ fontSize: '16px', color: '#4b5563', lineHeight: '24px' }}
            >
              This usually happens due to:
              <br />
              • Bank authorization issue
              <br />
              • Insufficient balance
              <br />• Expired card
            </Text>
            <Text
              style={{ fontSize: '16px', color: '#4b5563', lineHeight: '24px' }}
            >
              To avoid service interruption, please update your payment method.
            </Text>
          </>
        ) : (
          <>
            <Text
              style={{ fontSize: '16px', color: '#4b5563', lineHeight: '24px' }}
            >
              We’ve attempted multiple times to process your payment, but it’s
              still pending.
            </Text>
            <Text
              style={{ fontSize: '16px', color: '#4b5563', lineHeight: '24px' }}
            >
              To prevent temporary suspension of your account, please update
              your payment details immediately.
            </Text>
          </>
        )}

        <EmailButton module={module} href={payLink} fullWidth>
          {buttonText}
        </EmailButton>

        {!isFinalWarning ? (
          <Text
            style={{
              fontSize: '16px',
              color: '#4b5563',
              lineHeight: '24px',
              marginTop: '24px',
            }}
          >
            Your access remains active for now — but we recommend resolving this
            today.
            <br />
            <br />
            We’re here if you need help.
          </Text>
        ) : (
          <Text
            style={{
              fontSize: '16px',
              color: '#4b5563',
              lineHeight: '24px',
              marginTop: '24px',
            }}
          >
            We’d hate to interrupt your workflow — let’s fix this quickly.
          </Text>
        )}
      </EmailSection>
    </EmailLayout>
  );
};

export default PaymentFailedEmail;
