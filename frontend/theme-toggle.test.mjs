import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToggleIcon } from './theme-toggle.mjs';

test('theme toggle renders only the icon for the active mode', () => {
  const knob = { innerHTML: '' };

  knob.innerHTML = renderToggleIcon(false);
  assert.equal((knob.innerHTML.match(/<svg\b/g) || []).length, 1);
  assert.match(knob.innerHTML, /data-testid="sun-icon"/);
  assert.doesNotMatch(knob.innerHTML, /moon-icon/);

  knob.innerHTML = renderToggleIcon(true);
  assert.equal((knob.innerHTML.match(/<svg\b/g) || []).length, 1);
  assert.match(knob.innerHTML, /data-testid="moon-icon"/);
  assert.doesNotMatch(knob.innerHTML, /sun-icon/);
});