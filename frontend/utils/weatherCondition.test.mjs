import assert from 'node:assert/strict';
import test from 'node:test';
import { conditionFromCode, conditionFromWeatherData } from './weatherCondition.js';

test('maps clear codes and their boundaries', () => {
  assert.equal(conditionFromCode(0), 'clear');
  assert.equal(conditionFromCode(1), 'clear');
});

test('maps the listed cloudy codes', () => {
  for (const code of [2, 3, 45, 48]) {
    assert.equal(conditionFromCode(code), 'cloudy');
  }
});

test('maps both rain ranges including their boundaries', () => {
  for (const code of [51, 67, 80, 82]) {
    assert.equal(conditionFromCode(code), 'rain');
  }
});

test('maps both snow ranges including their boundaries', () => {
  for (const code of [71, 77, 85, 86]) {
    assert.equal(conditionFromCode(code), 'snow');
  }
});

test('maps storm range boundaries', () => {
  assert.equal(conditionFromCode(95), 'storm');
  assert.equal(conditionFromCode(99), 'storm');
});

test('defaults unknown and missing codes to clear', () => {
  for (const code of [49, 68, 70, 78, 84, 87, 94, 100, null, undefined]) {
    assert.equal(conditionFromCode(code), 'clear');
  }
});

test('uses the current WMO code and supports a valid demo override', () => {
  const response = { current: { code: 63 } };

  assert.equal(conditionFromWeatherData(response), 'rain');
  assert.equal(conditionFromWeatherData(response, 'snow'), 'snow');
  assert.equal(conditionFromWeatherData(response, 'invalid'), 'rain');
  assert.equal(conditionFromWeatherData(null), 'clear');
});

test('accepts the backend daily-code response shape', () => {
  assert.equal(conditionFromWeatherData({ days: [{ code: 71 }] }), 'snow');
});
