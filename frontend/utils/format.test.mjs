import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCoordinate, formatDayOfMonth, formatFullDate, formatLocationDate } from './format.js';

test('formats coordinates with two decimals and a real minus sign', () => {
  assert.equal(formatCoordinate(-37.79), '−37.79°');
  assert.equal(formatCoordinate(175.28), '175.28°');
});

test('formats location and detail dates without timezone drift', () => {
  assert.equal(formatLocationDate('2026-10-12'), 'Mon 12 Oct');
  assert.equal(formatDayOfMonth('2026-10-13'), '13');
  assert.equal(formatFullDate('2026-10-13'), 'Tuesday 13 October');
});