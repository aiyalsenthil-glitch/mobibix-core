import * as React from 'react';
import { Html } from '@react-email/html';
import { Head } from '@react-email/head';
import { Preview } from '@react-email/preview';
import { Body } from '@react-email/body';
import { Container } from '@react-email/container';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import { ModuleType } from '@prisma/client';
import { EmailHeader } from './header';

interface EmailLayoutProps {
  module: ModuleType;
  preview?: string;
  showDashboardButton?: boolean;
  children: React.ReactNode;
}

export const EmailLayout = ({
  module,
  preview,
  showDashboardButton,
  children,
}: EmailLayoutProps) => {
  const brandName = module === 'MOBILE_SHOP' ? 'MobiBix' : 'GymPilot';

  return (
    <Html>
      <Head />
      <Preview>{preview ?? ''}</Preview>
      <Body
        style={{
          backgroundColor: '#f6f9fc',
          fontFamily:
            '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            margin: '40px auto',
            padding: '0',
            borderRadius: '8px',
            overflow: 'hidden',
            maxWidth: '600px',
          }}
        >
          <EmailHeader
            module={module}
            showDashboardButton={showDashboardButton}
          />

          <Section style={{ padding: '40px 48px' }}>{children}</Section>

          <Section
            style={{
              padding: '24px 48px',
              backgroundColor: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <Text
              style={{
                color: '#6B7280',
                fontSize: '12px',
                lineHeight: '18px',
                margin: '0',
              }}
            >
              © {new Date().getFullYear()} {brandName}. All rights reserved.
            </Text>
            <Text
              style={{
                color: '#9CA3AF',
                fontSize: '11px',
                lineHeight: '16px',
                marginTop: '8px',
              }}
            >
              This is a transactional email related to your account at{' '}
              {brandName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
