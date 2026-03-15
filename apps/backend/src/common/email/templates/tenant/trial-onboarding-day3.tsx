import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import { ModuleType } from '@prisma/client';
import { EmailTemplateProps } from '../../email-template-types';

type Props = EmailTemplateProps['TRIAL_ONBOARDING_DAY3'] & {
  module: ModuleType;
};

export const TrialOnboardingDay3Email = ({
  name,
  productName,
}: Props) => {
  return (
    <Html>
      <Head />
      <Preview>See how others are saving 10 hours/week with {productName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Automate to Elevate 📈</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            One of our customers recently told us they were spending over 10 hours a week manually chasing down payments and texting customers. That's more than an entire workday lost every week!
          </Text>
          <Text style={text}>
            With {productName}, they completely automated those tasks. Here is a quick tip to help you do the same:
          </Text>
          
          <Text style={text}>
            <strong>Tip:</strong> Don't overlook the WhatsApp notification settings. If you enable the automated reminders, the system will do the chasing for you — completely hands-free.
          </Text>

          <Text style={text}>
            Try exploring your Settings panel today and map out how much time {productName} can save you.
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
