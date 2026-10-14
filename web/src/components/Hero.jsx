import { WeatherBackground } from './WeatherBackground.jsx';
import { WeatherIcon } from './WeatherIcon.jsx';
import { formatWithUnit } from '../utils/format.js';

export function Hero({ current, today, condition, isDark }) {
  return (
    <section className="hero" aria-label="Current weather">
      <WeatherBackground condition={condition} isDark={isDark} />
      <div className="hero-temperature">
        {formatWithUnit(current.temperature, '°')}
        <WeatherIcon code={current.code} size={39} />
      </div>
      <p className="hero-description">{current.summary ?? '–'}</p>
      <p className="hero-range">H {formatWithUnit(today.tempMax, '°')} · L {formatWithUnit(today.tempMin, '°')}</p>
    </section>
  );
}
