import { describe, it, expect } from 'vitest';
import { formatDate } from './helpers';

describe('formatDate', () => {
  it('should return "N/A" for falsy values', () => {
    expect(formatDate('')).toBe('N/A');
    expect(formatDate(null as any)).toBe('N/A');
    expect(formatDate(undefined as any)).toBe('N/A');
  });

  it('should format YYYY-MM-DD strings correctly', () => {
    expect(formatDate('2023-05-20')).toBe('20/05/2023');
    expect(formatDate('1990-01-01')).toBe('01/01/1990');
  });

  it('should format ISO strings with time correctly', () => {
    expect(formatDate('2023-05-20T15:30:00Z')).toBe('20/05/2023');
  });

  it('should format Date objects correctly', () => {
    const date = new Date(2023, 4, 20); // May 20, 2023
    expect(formatDate(date)).toBe('20/05/2023');
  });

  it('should return "Fecha inválida" for invalid date strings', () => {
    expect(formatDate('not-a-date')).toBe('Fecha inválida');
    expect(formatDate('2023-13-45')).toBe('Fecha inválida');
  });

  it('should return "Fecha inválida" for invalid Date objects', () => {
    expect(formatDate(new Date('invalid'))).toBe('Fecha inválida');
  });
});
