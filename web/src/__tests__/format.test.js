import { describe, expect, it } from 'vitest';
import { isCoordinates } from '../utils/format.js';

describe('isCoordinates', () => {
  it.each([
    '-37.78, 175.28',
    '-37.78,175.28',
    '-37.78 175.28'
  ])('recognizes %s', (value) => {
    expect(isCoordinates(value)).toBe(true);
  });

  it.each(['Hamilton', '3204'])('rejects %s', (value) => {
    expect(isCoordinates(value)).toBe(false);
  });
});
