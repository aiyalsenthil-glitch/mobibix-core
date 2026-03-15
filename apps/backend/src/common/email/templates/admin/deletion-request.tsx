import { Text, Section, Container, Heading } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';

interface DeletionRequestAdminEmailProps {
  module: ModuleType;
  tenantName: string;
  tenantId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  requestedAt: string;
  reason: string;
}

export const DeletionRequestAdminEmail = ({
  module,
  tenantName,
  tenantId,
  ownerName,
  ownerEmail,
  ownerPhone,
  requestedAt,
  reason,
}: DeletionRequestAdminEmailProps) => {
  return (
    <EmailLayout
      module={module}
      preview={`[Deletion Request] ${tenantName}`}
      showDashboardButton={false}
    >
      <Container>
        <Heading style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
          Account Deletion Request 🔴
        </Heading>
        <Section style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <Text style={{ margin: '0 0 10px 0', color: '#374151' }}>
            <strong>Tenant:</strong> {tenantName}
          </Text>
          <Text style={{ margin: '0 0 10px 0', color: '#374151' }}>
            <strong>Tenant ID:</strong> {tenantId}
          </Text>
          <Text style={{ margin: '0 0 10px 0', color: '#374151' }}>
            <strong>Owner:</strong> {ownerName}
          </Text>
          <Text style={{ margin: '0 0 10px 0', color: '#374151' }}>
            <strong>Email:</strong> {ownerEmail}
          </Text>
          <Text style={{ margin: '0 0 10px 0', color: '#374151' }}>
            <strong>Phone:</strong> {ownerPhone}
          </Text>
          <Text style={{ margin: '0 0 10px 0', color: '#374151' }}>
            <strong>Requested At (UTC):</strong> {requestedAt}
          </Text>
          <Text style={{ margin: '20px 0 10px 0', color: '#374151' }}>
            <strong>Reason for Deletion:</strong>
          </Text>
          <Text style={{ padding: '12px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '4px', fontStyle: 'italic', color: '#4b5563' }}>
            {reason || 'No reason provided'}
          </Text>
        </Section>
        <Text style={{ marginTop: '24px', color: '#6b7280', fontSize: '13px' }}>
          This request requires manual review and execution. Please verify data retention policies before proceeding.
        </Text>
      </Container>
    </EmailLayout>
  );
};

export default DeletionRequestAdminEmail;
