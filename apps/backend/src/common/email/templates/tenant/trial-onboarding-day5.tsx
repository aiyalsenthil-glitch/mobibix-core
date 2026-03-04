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

type Props = EmailTemplateProps['TRIAL_ONBOARDING_DAY5'] & {
  module: ModuleType;
};

export const TrialOnboardingDay5Email = ({
  name,
  dashboardLink,
  productName,
}: Props) => {
  return (
    <Html>
      <Head />
      <Preview>Your WhatsApp reminders are not set up yet 👀</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Unlock the true power of {productName}</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            A lot of {productName} users sign up specifically for our intelligent WhatsApp automation. But we noticed you haven't fully utilized this feature yet!
          </Text>
          <Text style={text}>
            Setting up WhatsApp automation takes less than a minute and ensures that your customers get timely updates, receipts, and payment reminders, right to their phones.
          </Text>

          <Section style={buttonContainer}>
            <Link href={`${dashboardLink}/settings`} style={button}>
              Configure WhatsApp Now
            </Link>
          </Section>

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
