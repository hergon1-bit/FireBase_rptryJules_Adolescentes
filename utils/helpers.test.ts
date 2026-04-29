import { test } from 'node:test';
import assert from 'node:assert';
import { formatDate, formatDateShort } from './helpers.ts';

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
