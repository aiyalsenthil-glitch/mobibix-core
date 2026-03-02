import { Injectable, BadRequestException } from '@nestjs/common';
import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

@Injectable()
export class PhoneService {
  /**
   * Normalizes a phone number to E.164 format.
   * @param phone The raw phone number string.
   * @param country The ISO country code (default: 'IN').
   * @returns The normalized E.164 phone string.
   * @throws BadRequestException if the phone number is invalid for the given country.
   */
  normalize(phone: string, country: string = 'IN'): string | null {
    if (!phone) return null;

    // Remove whitespace and common delimiters for a cleaner parse attempt
    const cleanPhone = phone.trim();

    try {
      if (!isValidPhoneNumber(cleanPhone, country as CountryCode)) {
        throw new BadRequestException(
          `Invalid phone number format for country: ${country}`
        );
      }

      const phoneNumber = parsePhoneNumber(cleanPhone, country as CountryCode);
      return phoneNumber.format('E.164');
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        error.message || 'Failed to normalize phone number'
      );
    }
  }

  /**
   * Extracts the country calling code from a normalized E.164 number.
   */
  getCountryCode(normalizedPhone: string): string {
    try {
      const phoneNumber = parsePhoneNumber(normalizedPhone);
      return phoneNumber.country || 'IN';
    } catch {
      return 'IN';
    }
  }
}
