import { Injectable } from '@nestjs/common';

/**
 * Base class for response mapping and sensitive data stripping.
 * Used to ensure multi-tenant data doesn't leak protected fields.
 */
@Injectable()
export abstract class BaseResponseMapper<T, R> {
  abstract map(data: T): R;

  mapMany(data: T[]): R[] {
    return data.map((item) => this.map(item));
  }

  /**
   * Utility to strip fields from an object
   */
  protected strip<O extends object, K extends keyof O>(obj: O, keys: K[]): Omit<O, K> {
    const clone = { ...obj };
    keys.forEach((key) => delete clone[key]);
    return clone;
  }
}

/**
 * Strips sensitive financial or internal tracking data from Sales responses
 */
@Injectable()
export class SalesResponseMapper extends BaseResponseMapper<any, any> {
  map(data: any): any {
    if (!data) return data;
    // Example: Strip internal cost prices or margin calculations if not authorized
    return this.strip(data, ['costPrice', 'margin', 'internalNotes']);
  }
}

/**
 * Strips private member data from Gym responses
 */
@Injectable()
export class GymResponseMapper extends BaseResponseMapper<any, any> {
  map(data: any): any {
    if (!data) return data;
    // Example: Strip private contact info or medical notes for general staff view
    return this.strip(data, ['emergencyContact', 'medicalNotes', 'privateComment']);
  }
}
