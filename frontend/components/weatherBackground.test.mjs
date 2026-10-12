import assert from 'node:assert/strict';
import test from 'node:test';
import { WeatherBackground } from './weatherBackground.js';

function countClass(markup, className) {
  return [...markup.matchAll(/class="([^"]+)"/g)]
    .filter(([, classes]) => classes.split(/\s+/).includes(className)).length;
}

test('rain renders drops without flakes', () => {
  const markup = WeatherBackground({ condition: 'rain', isDark: false });

  assert.equal(countClass(markup, 'wb-drop'), 38);
  assert.equal(countClass(markup, 'wb-flake'), 0);
});

test('snow renders flakes without drops', () => {
  const markup = WeatherBackground({ condition: 'snow', isDark: false });

  assert.equal(countClass(markup, 'wb-flake'), 30);
  assert.equal(countClass(markup, 'wb-drop'), 0);
});

test('storm renders drops and a lightning flash', () => {
  const markup = WeatherBackground({ condition: 'storm', isDark: true });

  assert.equal(countClass(markup, 'wb-drop'), 38);
  assert.equal(countClass(markup, 'wb-flash'), 1);
});

test('clear renders stars only at night', () => {
  assert.equal(countClass(WeatherBackground({ condition: 'clear', isDark: true }), 'wb-star'), 24);
  assert.equal(countClass(WeatherBackground({ condition: 'clear', isDark: false }), 'wb-star'), 0);
});

test('background root is hidden from assistive technology', () => {
  const markup = WeatherBackground({ condition: 'cloudy', isDark: false });

  assert.match(markup, /^<div class="weather-background"[^>]*aria-hidden="true">/);
});