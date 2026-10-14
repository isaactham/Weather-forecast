import { WeatherIcon } from './WeatherIcon.jsx';

export function ForecastList({ days, onSelectDay, selectedDayIndex = -1 }) {
  const temperatures = days.flatMap((day) => [day.tempMin, day.tempMax]);
  const minimum = Math.min(...temperatures);
  const span = Math.max(...temperatures) - minimum || 1;

  return (
    <section className="card forecast-card" aria-labelledby="forecast-title">
      <h2 className="section-title forecast-title" id="forecast-title">7-day forecast</h2>
      {days.map((day, index) => {
        const left = ((day.tempMin - minimum) / span) * 100;
        const width = ((day.tempMax - day.tempMin) / span) * 100;
        const weekday = index === 0
          ? 'Today'
          : new Date(`${day.date}T00:00:00`).toLocaleDateString('en-NZ', { weekday: 'short' });

        return (
          <button
            className="forecast-row"
            key={day.date}
            type="button"
            aria-pressed={index === selectedDayIndex}
            aria-label={`${weekday}: ${day.summary}, ${day.precipChance}% chance of rain, low ${day.tempMin} degrees, high ${day.tempMax} degrees`}
            onClick={() => onSelectDay(index)}
          >
            <span className="day-name">{weekday}</span>
            <span className="forecast-weather"><WeatherIcon code={day.code} size={22} /></span>
            <span className="rain-prob">{day.precipChance}%</span>
            <span className="low-temp">{day.tempMin}°</span>
            <span className="range-track" aria-hidden="true">
              <i className="range-fill" style={{ left: `${left}%`, width: `${width}%` }} />
            </span>
            <span className="high-temp">{day.tempMax}°</span>
            <span className="row-chevron" aria-hidden="true">›</span>
          </button>
        );
      })}
      <p className="forecast-footnote">Tap a day for full details · Data from Open-Meteo</p>
    </section>
  );
}
