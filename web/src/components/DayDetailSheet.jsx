import { WeatherIcon } from './WeatherIcon.jsx';

function display(value, suffix = '') {
  return value == null ? '–' : `${value}${suffix}`;
}

export function DayDetailSheet({ days, selectedDayIndex, locationName, isOpen, onSelectDay, onClose }) {
  const day = days[selectedDayIndex];
  if (!day || !isOpen) return null;

  const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-NZ', { weekday: 'long' });
  const fullDate = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-NZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  const stats = [
    ['Chance of rain', display(day.precipChance, '%'), true],
    ['Rainfall', display(day.precipMm, ' mm')],
    ['Max wind', display(day.windMax, ' km/h')],
    ['UV index', display(day.uvMax)]
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
            <h3 className="summary-title">{day.summary}</h3>
            <p className="summary-range">High {display(day.tempMax, '°')} · Low {display(day.tempMin, '°')}</p>
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
              <span className="day-pill-name">{index === 0 ? 'Today' : new Date(`${item.date}T00:00:00`).toLocaleDateString('en-NZ', { weekday: 'short' })}</span>
              <span className="day-pill-date">{new Date(`${item.date}T00:00:00`).getDate()}</span>
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
