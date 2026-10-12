export function renderToggleIcon(isDark) {
  // Keep the inactive mode icon out of the DOM so the glyphs cannot overlap.
  if (isDark) {
    return '<svg data-testid="moon-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5 8.7 8.7 0 1 0 20.5 14.2Z"/></svg>';
  }

  return '<svg data-testid="sun-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>';
}