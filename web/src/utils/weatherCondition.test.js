import { describe, expect, it } from 'vitest';
import { conditionFromCode, conditionFromWeatherData } from './weatherCondition.js';

describe('weather condition mapping', () => {
  it('maps WMO weather codes to background conditions', () => {
    expect(conditionFromCode(0)).toBe('clear');
    expect(conditionFromCode(3)).toBe('cloudy');
    expect(conditionFromCode(61)).toBe('rain');
    expect(conditionFromCode(71)).toBe('snow');
    expect(conditionFromCode(95)).toBe('storm');
  });

  it('uses the current code unless a supported URL override is given', () => {
    expect(conditionFromWeatherData({ current: { code: 61 } })).toBe('rain');
    expect(conditionFromWeatherData({ current: { code: 61 } }, 'snow')).toBe('snow');
    expect(conditionFromWeatherData({ current: { code: 61 } }, 'not-a-condition')).toBe('rain');
  });
});
