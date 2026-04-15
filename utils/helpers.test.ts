import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { calcularEdad } from './helpers';

describe('calcularEdad', () => {
    // We can mock the Date object to have a consistent "current year" for testing, or just calculate the expected based on the real current Date.
    // Let's use the real current date and calculate dynamically to avoid issues with other tests,
    // or we can use vi.useFakeTimers.

    beforeAll(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2024, 5, 15)) // June 15, 2024
    })

    afterAll(() => {
        vi.useRealTimers()
    })

    it('returns 0 for empty string', () => {
        expect(calcularEdad('')).toBe(0);
    });

    it('calculates age correctly for YYYY-MM-DD format (birthday already passed)', () => {
        // Date: 2000-05-10
        // Current: 2024-06-15
        // Expected: 24
        expect(calcularEdad('2000-05-10')).toBe(24);
    });

    it('calculates age correctly for YYYY-MM-DD format (birthday not passed yet)', () => {
        // Date: 2000-07-20
        // Current: 2024-06-15
        // Expected: 23
        expect(calcularEdad('2000-07-20')).toBe(23);
    });

    it('calculates age correctly for YYYY/MM/DD format', () => {
        // Date: 2000/05/10
        expect(calcularEdad('2000/05/10')).toBe(24);
    });

    it('calculates age correctly for DD/MM/YYYY format', () => {
        // Date: 10/05/2000
        expect(calcularEdad('10/05/2000')).toBe(24);
    });

    it('calculates age correctly for ISO string format', () => {
        // Date: 2000-05-10T10:00:00.000Z
        expect(calcularEdad('2000-05-10T10:00:00.000Z')).toBe(24);
    });

    it('returns 0 for invalid string format that cannot be parsed as date', () => {
        expect(calcularEdad('not-a-date')).toBe(0);
    });

    it('handles age correctly when birthday is today', () => {
        // Current: 2024-06-15
        expect(calcularEdad('2000-06-15')).toBe(24);
    });

    it('returns 0 if birth date is in the future', () => {
        // Current: 2024-06-15
        expect(calcularEdad('2025-06-15')).toBe(0);
    });

    it('uses fallback Date constructor if format is unusual but valid for Date', () => {
        // 'June 10, 2000' is not YYYY-MM-DD nor DD/MM/YYYY but can be parsed by new Date()
        expect(calcularEdad('June 10, 2000')).toBe(24);
    });
});
