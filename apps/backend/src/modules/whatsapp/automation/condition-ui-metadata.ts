import { EVENT_FIELD_MATRIX } from './condition-fields.registry';

// For use by UI and backend for allowed operators per field type
export const FIELD_TYPE_OPERATORS: Record<string, string[]> = {
  number: ['>', '<', '=', '>=', '<='],
  boolean: ['='],
  date: ['DAYS_BEFORE', 'DAYS_AFTER'],
  enum: ['='],
  string: ['='],
};

// For use by UI to show warning for sensitive fields
export const SENSITIVE_FIELDS = ['hasCoaching', 'dietPlan'];

export { EVENT_FIELD_MATRIX };
