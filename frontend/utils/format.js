function toUtcDate(date) {
  return new Date(`${date}T00:00:00Z`);
}

export function formatCoordinate(value) {
  const sign = value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(2)}°`;
}

export function formatLocationDate(date) {
  return new Intl.DateTimeFormat('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  }).format(toUtcDate(date)).replace(',', '');
}

export function formatDayOfMonth(date) {
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    timeZone: 'UTC'
  }).format(toUtcDate(date));
}

export function formatFullDate(date) {
  return new Intl.DateTimeFormat('en-NZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  }).format(toUtcDate(date)).replace(',', '');
}