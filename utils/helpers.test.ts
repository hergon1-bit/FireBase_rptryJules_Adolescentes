import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calcularEdad } from './helpers';

describe('calcularEdad', () => {
  beforeEach(() => {
    // Set system time to 2024-05-20
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 4, 20)); // Month is 0-indexed, so 4 is May
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 0 for empty string', () => {
    expect(calcularEdad('')).toBe(0);
  });

  describe('ISO format (YYYY-MM-DD)', () => {
    it('should calculate age correctly when birthday has passed this year', () => {
      // Born 1990-01-15, today 2024-05-20 -> 34 years
      expect(calcularEdad('1990-01-15')).toBe(34);
    });

    it('should calculate age correctly when birthday is today', () => {
      // Born 1990-05-20, today 2024-05-20 -> 34 years
      expect(calcularEdad('1990-05-20')).toBe(34);
    });

    it('should calculate age correctly when birthday has not yet happened this year', () => {
      // Born 1990-12-31, today 2024-05-20 -> 33 years
      expect(calcularEdad('1990-12-31')).toBe(33);
    });

    it('should handle ISO strings with time part', () => {
      expect(calcularEdad('1990-01-15T10:00:00Z')).toBe(34);
    });
  });

  describe('Slash format', () => {
    it('should calculate age correctly for YYYY/MM/DD', () => {
      expect(calcularEdad('1990/01/15')).toBe(34);
    });

    it('should calculate age correctly for DD/MM/YYYY', () => {
      expect(calcularEdad('15/01/1990')).toBe(34);
    });

    it('should handle birthday not yet happened for DD/MM/YYYY', () => {
      expect(calcularEdad('20/12/1990')).toBe(33);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should return 0 for invalid date strings', () => {
      expect(calcularEdad('not-a-date')).toBe(0);
      expect(calcularEdad('99/99/9999')).toBe(0);
    });

    it('should return 0 for future dates', () => {
      expect(calcularEdad('2025-01-01')).toBe(0);
    });

    it('should handle leap year birthdays (Feb 29)', () => {
      // Born 2000-02-29, today 2024-05-20 -> 24 years
      expect(calcularEdad('2000-02-29')).toBe(24);

      // Born 2000-02-29, today 2024-02-28 -> 23 years
      vi.setSystemTime(new Date(2024, 1, 28));
      expect(calcularEdad('2000-02-29')).toBe(23);

      // Born 2000-02-29, today 2024-02-29 -> 24 years
      vi.setSystemTime(new Date(2024, 1, 29));
      expect(calcularEdad('2000-02-29')).toBe(24);
    });

    it('should handle very recent birthdays (age 0)', () => {
      vi.setSystemTime(new Date(2024, 4, 20));
      expect(calcularEdad('2024-01-01')).toBe(0);
    });
  });

  describe('Fallback parsing', () => {
    it('should work with Date-parsable strings that are not ISO or slash-format', () => {
      // 'Jan 15, 1990'
      expect(calcularEdad('Jan 15, 1990')).toBe(34);
    });
  });
});
