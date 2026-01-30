// Central registry for allowed fields per event for WhatsApp Automation conditions
// This is the single source of truth for condition safety and UI field filtering

export type EventFieldType = 'number' | 'date' | 'boolean' | 'enum' | 'string';

export const EVENT_FIELD_MATRIX: {
  [event: string]: {
    fields: {
      [field: string]: EventFieldType;
    };
  };
} = {
  PAYMENT_DUE: {
    fields: {
      pendingAmount: 'number',
      dueDate: 'date',
    },
  },
  MEMBERSHIP_EXPIRY: {
    fields: {
      expiryDate: 'date',
      daysToExpiry: 'number',
    },
  },
  MEMBER_CREATED: {
    fields: {
      joinDate: 'date',
    },
  },
  TRAINER_ASSIGNED: {
    fields: {
      hasCoaching: 'boolean',
      trainerId: 'string',
    },
  },
  JOB_CREATED: {
    fields: {
      jobStatus: 'enum',
    },
  },
  JOB_COMPLETED: {
    fields: {
      jobStatus: 'enum',
    },
  },
};
