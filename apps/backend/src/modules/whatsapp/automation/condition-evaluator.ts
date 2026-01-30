import {
  EVENT_FIELD_MATRIX,
  EventFieldType,
} from './condition-fields.registry';

export type Condition = {
  field: string;
  operator: string;
  value: any;
};

export type EntityContext = Record<string, any>;

const NUMERIC_OPS = ['>', '<', '=', '>=', '<='];
const BOOLEAN_OPS = ['='];
const DATE_OPS = ['DAYS_BEFORE', 'DAYS_AFTER'];
const ENUM_OPS = ['='];

function differenceInDays(dateA: Date, dateB: Date): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function evaluateConditions(
  event: string,
  conditions: Condition[],
  context: EntityContext,
): boolean {
  const matrix = EVENT_FIELD_MATRIX[event];
  if (!matrix) {
    console.warn(`[ConditionEval] Unknown event: ${event}`);
    return false;
  }
  for (const cond of conditions) {
    const fieldType: EventFieldType | undefined = matrix.fields[cond.field];
    if (!fieldType) {
      console.warn(`[ConditionEval] Field not allowed: ${cond.field}`);
      return false;
    }
    const value = context[cond.field];
    if (value === undefined || value === null) {
      console.warn(`[ConditionEval] Field missing in context: ${cond.field}`);
      return false;
    }
    // Validate operator
    let validOps: string[] = [];
    switch (fieldType) {
      case 'number':
        validOps = NUMERIC_OPS;
        break;
      case 'boolean':
        validOps = BOOLEAN_OPS;
        break;
      case 'date':
        validOps = DATE_OPS;
        break;
      case 'enum':
        validOps = ENUM_OPS;
        break;
      case 'string':
        validOps = ['='];
        break;
    }
    if (!validOps.includes(cond.operator)) {
      console.warn(`[ConditionEval] Invalid operator for field: ${cond.field}`);
      return false;
    }
    // Type check value
    switch (fieldType) {
      case 'number':
        if (typeof cond.value !== 'number') {
          console.warn(
            `[ConditionEval] Invalid value type for number: ${cond.field}`,
          );
          return false;
        }
        switch (cond.operator) {
          case '>':
            if (!(value > cond.value)) return false;
            break;
          case '<':
            if (!(value < cond.value)) return false;
            break;
          case '=':
            if (!(value === cond.value)) return false;
            break;
          case '>=':
            if (!(value >= cond.value)) return false;
            break;
          case '<=':
            if (!(value <= cond.value)) return false;
            break;
        }
        break;
      case 'boolean':
        if (typeof cond.value !== 'boolean') {
          console.warn(
            `[ConditionEval] Invalid value type for boolean: ${cond.field}`,
          );
          return false;
        }
        if (cond.operator === '=' && value !== cond.value) return false;
        break;
      case 'date':
        if (typeof cond.value !== 'number') {
          console.warn(
            `[ConditionEval] Invalid value type for date op: ${cond.field}`,
          );
          return false;
        }
        const today = new Date();
        const targetDate = new Date(value);
        if (cond.operator === 'DAYS_BEFORE') {
          if (differenceInDays(targetDate, today) !== cond.value) return false;
        } else if (cond.operator === 'DAYS_AFTER') {
          if (differenceInDays(today, targetDate) !== cond.value) return false;
        }
        break;
      case 'enum':
      case 'string':
        if (cond.operator === '=' && value !== cond.value) return false;
        break;
      default:
        console.warn(`[ConditionEval] Unsupported field type: ${fieldType}`);
        return false;
    }
  }
  return true;
}
