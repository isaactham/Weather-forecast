export function conditionFromCode(code) {
  if (!Number.isInteger(code)) return 'clear';
  if (code >= 0 && code <= 1) return 'clear';
  if ([2, 3, 45, 48].includes(code)) return 'cloudy';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  if (code >= 95 && code <= 99) return 'storm';
  return 'clear';
}
