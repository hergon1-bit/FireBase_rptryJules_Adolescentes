import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calcularProximoCumpleanos } from './helpers';

describe('calcularProximoCumpleanos', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Set "today" to May 15, 2024
        vi.setSystemTime(new Date(2024, 4, 15)); // Month is 0-indexed, so 4 is May
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return current date for empty input', () => {
        const result = calcularProximoCumpleanos('');
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(4);
        expect(result.getDate()).toBe(15);
    });

    it('should handle YYYY-MM-DD format (upcoming birthday)', () => {
        const result = calcularProximoCumpleanos('1990-08-20');
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(7); // August
        expect(result.getDate()).toBe(20);
    });

    it('should handle YYYY-MM-DD format (past birthday)', () => {
        const result = calcularProximoCumpleanos('1990-03-10');
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(2); // March
        expect(result.getDate()).toBe(10);
    });

    it('should handle YYYY-MM-DD format with time (upcoming birthday)', () => {
        const result = calcularProximoCumpleanos('1990-08-20T10:00:00Z');
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(7); // August
        expect(result.getDate()).toBe(20);
    });

    it('should handle DD/MM/YYYY format', () => {
        const result = calcularProximoCumpleanos('25/12/1995');
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(11); // December
        expect(result.getDate()).toBe(25);
    });

    it('should handle YYYY/MM/DD format', () => {
        const result = calcularProximoCumpleanos('1995/12/25');
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(11); // December
        expect(result.getDate()).toBe(25);
    });

    it('should handle birthday exactly today', () => {
        const result = calcularProximoCumpleanos('1990-05-15');
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(4); // May
        expect(result.getDate()).toBe(15);
    });

    it('should handle fallback native Date parsing (valid date string)', () => {
        const result = calcularProximoCumpleanos('October 10, 1990');
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(9); // October
        expect(result.getDate()).toBe(10);
    });

    it('should return Invalid Date for fallback native Date parsing (invalid date string)', () => {
        const result = calcularProximoCumpleanos('not-a-date');
        expect(isNaN(result.getTime())).toBe(true);
    });
});
