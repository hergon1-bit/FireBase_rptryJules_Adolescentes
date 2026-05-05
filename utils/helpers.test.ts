import { test, mock } from 'node:test';
import assert from 'node:assert';
import { formatDate, formatDateShort, calcularEdad } from './helpers.ts';

test('formatDate', async (t) => {
  await t.test('returns "N/A" for null date', () => {
    assert.strictEqual(formatDate(null as any), 'N/A');
  });

  await t.test('returns "N/A" for undefined date', () => {
    assert.strictEqual(formatDate(undefined as any), 'N/A');
  });

  await t.test('returns "N/A" for empty string', () => {
    assert.strictEqual(formatDate(''), 'N/A');
  });

  await t.test('formats ISO date string (YYYY-MM-DD) to DD/MM/YYYY', () => {
    assert.strictEqual(formatDate('2023-10-27'), '27/10/2023');
  });

  await t.test('formats ISO date string with time (YYYY-MM-DDTHH:mm:ss) to DD/MM/YYYY', () => {
    assert.strictEqual(formatDate('2023-10-27T10:00:00'), '27/10/2023');
  });

  await t.test('converts DD-MM-YYYY input string to DD/MM/YYYY', () => {
    assert.strictEqual(formatDate('27-10-2023'), '27/10/2023');
  });

  await t.test('handles DD/MM/YYYY input string', () => {
    assert.strictEqual(formatDate('27/10/2023'), '27/10/2023');
  });

  await t.test('formats Date object to DD/MM/YYYY', () => {
    const date = new Date(2023, 9, 27); // Month is 0-indexed, so 9 is October
    assert.strictEqual(formatDate(date), '27/10/2023');
  });

  await t.test('returns "Fecha inválida" for invalid date string', () => {
    assert.strictEqual(formatDate('invalid-date'), 'Fecha inválida');
  });

  await t.test('pads single digit day and month', () => {
    assert.strictEqual(formatDate('2023-01-05'), '05/01/2023');
  });
});

test('formatDateShort', () => {
  assert.strictEqual(formatDateShort('2023-10-27'), '27/10/2023');
});

test('calcularEdad', async (t) => {
  // Set current date to 2024-05-15
  const now = new Date('2024-05-15T12:00:00Z');
  mock.timers.enable({ apis: ['Date'], now });

  t.after(() => {
    mock.timers.reset();
  });

  await t.test('returns 0 for empty string', () => {
    assert.strictEqual(calcularEdad(''), 0);
  });

  await t.test('returns 0 for null or undefined', () => {
    assert.strictEqual(calcularEdad(null as any), 0);
    assert.strictEqual(calcularEdad(undefined as any), 0);
  });

  await t.test('returns 0 for invalid date string', () => {
    assert.strictEqual(calcularEdad('not-a-date'), 0);
  });

  await t.test('calculates age correctly for ISO format (YYYY-MM-DD)', () => {
    assert.strictEqual(calcularEdad('2000-05-15'), 24);
    assert.strictEqual(calcularEdad('2000-05-16'), 23);
  });

  await t.test('calculates age correctly for YYYY/MM/DD format', () => {
    assert.strictEqual(calcularEdad('2000/05/15'), 24);
    assert.strictEqual(calcularEdad('2000/05/16'), 23);
  });

  await t.test('calculates age correctly for DD/MM/YYYY format', () => {
    assert.strictEqual(calcularEdad('15/05/2000'), 24);
    assert.strictEqual(calcularEdad('16/05/2000'), 23);
  });

  await t.test('handles birthday today', () => {
    // Current date is 2024-05-15
    assert.strictEqual(calcularEdad('2000-05-15'), 24);
  });

  await t.test('handles birthday yesterday', () => {
    assert.strictEqual(calcularEdad('2000-05-14'), 24);
  });

  await t.test('handles birthday tomorrow', () => {
    assert.strictEqual(calcularEdad('2000-05-16'), 23);
  });

  await t.test('handles leap year birthday on non-leap year', () => {
    // Mock date to 2023-03-01 (non-leap year)
    mock.timers.reset();
    const marchFirst2023 = new Date('2023-03-01T12:00:00Z');
    mock.timers.enable({ apis: ['Date'], now: marchFirst2023 });

    assert.strictEqual(calcularEdad('2000-02-29'), 23);

    // Feb 28 2023
    mock.timers.reset();
    const feb282023 = new Date('2023-02-28T12:00:00Z');
    mock.timers.enable({ apis: ['Date'], now: feb282023 });
    assert.strictEqual(calcularEdad('2000-02-29'), 22);
  });
});
