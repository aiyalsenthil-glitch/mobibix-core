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

type Props = EmailTemplateProps['TRIAL_ONBOARDING_DAY1'] & {
  module: ModuleType;
};

export const TrialOnboardingDay1Email = ({
  name,
  dashboardLink,
  productName,
}: Props) => {
  return (
    <Html>
      <Head />
      <Preview>Have you added your first record yet?</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Day 1 is in the books! 🚀</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Welcome to day 1 of your {productName} trial! We noticed you signed up but might need a little nudge to get fully set up.
          </Text>
          <Text style={text}>
            The single most important step you can take today is to add your very first{' '}
            {productName === 'GymPilot' ? 'gym member' : 'job card'}.
          </Text>

          <Section style={buttonContainer}>
            <Link href={dashboardLink} style={button}>
              {productName === 'GymPilot' ? 'Add Member' : 'Create Job Card'}
            </Link>
          </Section>

          <Text style={text}>
            It takes just 3 minutes and will give you a feel for how {productName} will save you hours of work each week.
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
