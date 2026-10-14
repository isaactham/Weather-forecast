import { WeatherIcon } from './WeatherIcon.jsx';
import { formatDayLabel, formatWithUnit } from '../utils/format.js';

export function ForecastList({ days, onSelectDay, selectedDayIndex = -1 }) {
  const temperatures = days.flatMap((day) => [day.tempMin, day.tempMax]).filter(Number.isFinite);
  const minimum = temperatures.length ? Math.min(...temperatures) : 0;
  const span = temperatures.length ? Math.max(...temperatures) - minimum || 1 : 1;

  return (
    <section className="card forecast-card" aria-labelledby="forecast-title">
      <h2 className="section-title forecast-title" id="forecast-title">7-day forecast</h2>
      {days.map((day, index) => {
        const left = Number.isFinite(day.tempMin) ? ((day.tempMin - minimum) / span) * 100 : 0;
        const width = Number.isFinite(day.tempMax) && Number.isFinite(day.tempMin)
          ? ((day.tempMax - day.tempMin) / span) * 100
          : 0;
        const weekday = formatDayLabel(day.date, index);

        return (
          <button
            className="forecast-row"
            key={day.date}
            type="button"
            aria-pressed={index === selectedDayIndex}
            aria-label={`${weekday}: ${day.summary ?? '–'}, ${formatWithUnit(day.precipChance, '%')} chance of rain, low ${formatWithUnit(day.tempMin, '°')}, high ${formatWithUnit(day.tempMax, '°')}`}
            onClick={() => onSelectDay(index)}
          >
            <span className="day-name">{weekday}</span>
            <span className="forecast-weather"><WeatherIcon code={day.code} size={22} /></span>
            <span className="rain-prob">{formatWithUnit(day.precipChance, '%')}</span>
            <span className="low-temp">{formatWithUnit(day.tempMin, '°')}</span>
            <span className="range-track" aria-hidden="true">
              <i className="range-fill" style={{ left: `${left}%`, width: `${width}%` }} />
            </span>
            <span className="high-temp">{formatWithUnit(day.tempMax, '°')}</span>
            <span className="row-chevron" aria-hidden="true">›</span>
          </button>
        );
      })}
      <p className="forecast-footnote">Tap a day for full details · Data from Open-Meteo</p>
    </section>
  );
}
