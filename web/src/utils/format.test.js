import { describe, expect, it } from 'vitest';
import {
  formatDayLabel,
  formatDecimal,
  formatFullDate,
  formatInteger,
  formatLocation,
  formatLocationDate,
  formatWithUnit
} from './format.js';

describe('weather formatting', () => {
  it('formats location names and coordinate-only responses', () => {
    expect(formatLocation({
      name: 'Hamilton, Waikato, New Zealand',
      lat: -37.7855,
      lng: 175.3012
    })).toEqual({
      city: 'Hamilton',
      region: 'Waikato, New Zealand',
      coordinates: '−37.79°, 175.30°'
    });

    expect(formatLocation({
      name: '-37.78, 175.28',
      lat: -37.78,
      lng: 175.28
    })).toEqual({
      city: 'Your location',
      region: '',
      coordinates: '−37.78°, 175.28°'
    });
  });

  it('rounds values and shows an en dash for null data', () => {
    expect(formatInteger(15.8)).toBe('16');
    expect(formatDecimal(3.24)).toBe('3.2');
    expect(formatWithUnit(21.7, ' km/h')).toBe('22 km/h');
    expect(formatWithUnit(null, '%')).toBe('–');
  });

  it('formats local calendar dates without UTC conversion', () => {
    expect(formatLocationDate('2026-10-12')).toContain('12 Oct');
    expect(formatFullDate('2026-10-12')).toContain('12 October');
    expect(formatDayLabel('2026-10-12', 0)).toBe('Today');
    expect(formatDayLabel('2026-10-13', 1)).toBe('Tue');
  });
});
