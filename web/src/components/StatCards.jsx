import { formatWithUnit } from '../utils/format.js';

function RainIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.2S5.5 10.5 5.5 15a6.5 6.5 0 0 0 13 0c0-4.5-6.5-11.8-6.5-11.8Z" />
      <path d="M9.5 16a2.7 2.7 0 0 0 2.7 2.7" />
    </svg>
  );
}

function WindIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 9.5h10.5a2.5 2.5 0 1 0-2.3-3.5M2 13h15a2.5 2.5 0 1 1-2.3 3.5M4 16.5h5" />
    </svg>
  );
}

function RainfallIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.5 17.5h-12a4.5 4.5 0 1 1 .7-8.9 6 6 0 0 1 11.3 1.5 3.8 3.8 0 0 1 0 7.4Z" />
      <path d="m9 20-1 2m6-2-1 2m6-2-1 2" />
    </svg>
  );
}

export function StatCards({ day }) {
  const stats = [
    { label: 'Rain chance', value: formatWithUnit(day.precipChance, '%'), icon: <RainIcon />, accent: true },
    { label: 'Max wind', value: formatWithUnit(day.windMax, ' km/h'), icon: <WindIcon /> },
    { label: 'Rainfall', value: formatWithUnit(day.precipMm, ' mm', 1), icon: <RainfallIcon /> }
  ];

  return (
    <section className="stats" aria-label="Today's weather details">
      {stats.map((stat) => (
        <article className="stat-card" key={stat.label}>
          <span className={`stat-icon${stat.accent ? ' rain' : ''}`}>{stat.icon}</span>
          <span className="stat-label">{stat.label}</span>
          <strong className="stat-value">{stat.value}</strong>
        </article>
      ))}
    </section>
  );
}
