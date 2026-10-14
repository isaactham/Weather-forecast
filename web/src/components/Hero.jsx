import { WeatherBackground } from './WeatherBackground.jsx';
import { WeatherIcon } from './WeatherIcon.jsx';

export function Hero({ current, today, condition, isDark }) {
  return (
    <section className="hero" aria-label="Current weather">
      <WeatherBackground condition={condition} isDark={isDark} />
      <div className="hero-temperature">
        {current.temperature}°
        <WeatherIcon code={current.code} size={39} />
      </div>
      <p className="hero-description">{current.summary}</p>
      <p className="hero-range">H {today.tempMax}° · L {today.tempMin}°</p>
    </section>
  );
}
