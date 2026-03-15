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

type Props = EmailTemplateProps['TRIAL_ONBOARDING_DAY10'] & {
  module: ModuleType;
};

export const TrialOnboardingDay10Email = ({
  name,
  upgradeLink,
  productName,
}: Props) => {
  return (
    <Html>
      <Head />
      <Preview>Only 4 days left — let's make sure you're getting value</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your trial is ending soon ⏳</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            You have only 4 days left on your {productName} free trial! We hope you've been able to experience firsthand how our software can lighten your workload.
          </Text>
          <Text style={text}>
            To ensure you don't lose access to your data or experience any interruption in service, we highly recommend upgrading to a paid plan now.
          </Text>

          <Section style={buttonContainer}>
            <Link href={upgradeLink} style={button}>
              Upgrade Your Account
            </Link>
          </Section>

          <Text style={text}>
            If you need an extension or have any last-minute questions, please reach out to our support team.
          </Text>

          <Text style={text}>
            Best,
            <br />
            The {productName} Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
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
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
  backgroundColor: '#db2777',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 24px',
  display: 'inline-block',
};
