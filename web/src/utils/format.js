function parseLocalDate(date) {
  return new Date(`${date}T00:00:00`);
}

function formatNumber(value, fractionDigits = 0) {
  if (value == null || !Number.isFinite(value)) return '–';
  return Number(value).toFixed(fractionDigits);
}

export function formatInteger(value) {
  return formatNumber(value);
}

export function formatDecimal(value, fractionDigits = 1) {
  return formatNumber(value, fractionDigits);
}

export function formatWithUnit(value, unit, fractionDigits = 0) {
  const formatted = formatNumber(value, fractionDigits);
  return formatted === '–' ? formatted : `${formatted}${unit}`;
}

export function formatCoordinate(value) {
  if (value == null || !Number.isFinite(value)) return '–';
  const sign = value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(2)}°`;
}

export function formatCoordinates(location) {
  return `${formatCoordinate(location.lat)}, ${formatCoordinate(location.lng)}`;
}

export function formatLocation(location) {
  const name = location.name.trim();
  const isCoordinates = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(name);
  const [city = '', ...regionParts] = name.split(',');
  return {
    city: isCoordinates ? 'Your location' : city.trim(),
    region: isCoordinates ? '' : regionParts.join(',').trim(),
    coordinates: formatCoordinates(location)
  };
}

export function formatLocationDate(date) {
  return new Intl.DateTimeFormat('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(parseLocalDate(date)).replace(',', '');
}

export function formatFullDate(date) {
  return new Intl.DateTimeFormat('en-NZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(parseLocalDate(date)).replace(',', '');
}

export function formatShortWeekday(date) {
  return new Intl.DateTimeFormat('en-NZ', { weekday: 'short' }).format(parseLocalDate(date));
}

export function formatLongWeekday(date) {
  return new Intl.DateTimeFormat('en-NZ', { weekday: 'long' }).format(parseLocalDate(date));
}

export function formatDayOfMonth(date) {
  return new Intl.DateTimeFormat('en-NZ', { day: 'numeric' }).format(parseLocalDate(date));
}

export function formatDayLabel(date, index) {
  return index === 0 ? 'Today' : formatShortWeekday(date);
}
