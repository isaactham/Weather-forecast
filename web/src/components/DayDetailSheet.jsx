import { WeatherIcon } from './WeatherIcon.jsx';
import {
  formatDayOfMonth,
  formatFullDate,
  formatInteger,
  formatLongWeekday,
  formatShortWeekday,
  formatWithUnit
} from '../utils/format.js';

export function DayDetailSheet({ days, selectedDayIndex, locationName, isOpen, onSelectDay, onClose }) {
  const day = days[selectedDayIndex];
  if (!day || !isOpen) return null;

  const weekday = formatLongWeekday(day.date);
  const fullDate = formatFullDate(day.date);
  const stats = [
    ['Chance of rain', formatWithUnit(day.precipChance, '%'), true],
    ['Rainfall', formatWithUnit(day.precipMm, ' mm', 1)],
    ['Max wind', formatWithUnit(day.windMax, ' km/h')],
    ['UV index', formatInteger(day.uvMax)]
  ];

  return (
    <>
      <button
        className="overlay open"
        type="button"
        aria-label="Close day details"
        onClick={onClose}
      />
      <section
        className="detail-sheet open"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header">
          <div>
            <h2 className="sheet-title" id="sheet-title">{weekday}</h2>
            <p className="sheet-date">{fullDate} · {locationName}</p>
          </div>
          <button className="close-button" type="button" aria-label="Close day details" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="summary-row">
          <span className="summary-icon"><WeatherIcon code={day.code} size={39} /></span>
          <div>
            <h3 className="summary-title">{day.summary ?? '–'}</h3>
            <p className="summary-range">High {formatWithUnit(day.tempMax, '°')} · Low {formatWithUnit(day.tempMin, '°')}</p>
          </div>
        </div>
        <nav className="day-picker" aria-label="Choose forecast day">
          {days.map((item, index) => (
            <button
              className="day-pill"
              key={item.date}
              type="button"
              aria-pressed={index === selectedDayIndex}
              onClick={() => onSelectDay(index)}
            >
              <span className="day-pill-name">{index === 0 ? 'Today' : formatShortWeekday(item.date)}</span>
              <span className="day-pill-date">{formatDayOfMonth(item.date)}</span>
            </button>
          ))}
        </nav>
        <section className="detail-grid" aria-label="Day weather details">
          {stats.map(([label, value, accent]) => (
            <article className="detail-tile" key={label}>
              <span className="tile-label">{label}</span>
              <strong className={`tile-value${accent ? ' rain' : ''}`}>{value}</strong>
            </article>
          ))}
        </section>
      </section>
    </>
  );
}
