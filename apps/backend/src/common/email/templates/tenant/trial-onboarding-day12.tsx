import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { ModuleType } from '@prisma/client';
import { EmailTemplateProps } from '../../email-template-types';

type Props = EmailTemplateProps['TRIAL_ONBOARDING_DAY12'] & {
  module: ModuleType;
};

export const TrialOnboardingDay12Email = ({
  name,
  upgradeLink,
  productName,
}: Props) => {
  return (
    <Html>
      <Head />
      <Preview>2 days left — your shop data is waiting for you</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>⚡ 2 Days Left on Your Trial</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Your {productName} free trial ends in <strong>2 days</strong>. Everything you've set up — your job cards, invoices, inventory, and customer records — will be preserved when you upgrade.
          </Text>
          <Text style={text}>
            Don't start from scratch with another tool. You're already set up and running — just continue without interruption.
          </Text>

          <Section style={buttonContainer}>
            <Link href={upgradeLink} style={button}>
              Keep My Shop Running →
            </Link>
          </Section>

          <Text style={text}>
            Questions? Reply to this email — our team is here 7 days a week.
          </Text>

          <Text style={text}>
            — The {productName} Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  maxWidth: '600px',
};

const h1 = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: 'bold',
  marginTop: '0',
  marginBottom: '24px',
};

const text = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#0f172a',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 24px',
  display: 'inline-block',
};
