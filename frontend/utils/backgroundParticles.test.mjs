import assert from 'node:assert/strict';
import test from 'node:test';
import { makeClouds, makeDrops, makeFlakes, makeStars } from './backgroundParticles.js';

const generators = [
  ['drops', makeDrops, 38, 0, 125],
  ['flakes', makeFlakes, 30, 0, 100],
  ['stars', makeStars, 24, 0, 100],
  ['clouds', makeClouds, 3, -70, 150]
];

for (const [name, make, expectedCount, minimumLeft, maximumLeft] of generators) {
  test(`${name} are deterministic with bounded numeric positions`, () => {
    const first = make();
    const second = make();

    assert.equal(first.length, expectedCount);
    assert.deepEqual(first, second);
    for (const particle of first) {
      assert.equal(typeof particle.left, 'number');
      const withinMaximum = name === 'clouds' ? particle.left <= maximumLeft : particle.left < maximumLeft;
      assert.ok(particle.left >= minimumLeft && withinMaximum);
    }
  });
}