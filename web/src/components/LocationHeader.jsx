import { ThemeToggle } from './ThemeToggle.jsx';

export function LocationHeader({ location, date, isDark, onToggleTheme, isCurrentLocation = false }) {
  return (
    <section className="location-block" aria-label="Current location">
      <div className="location-top">
        {isCurrentLocation && <div className="location-tag">⌖ Current location</div>}
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>
      <h1 className="city-name">{location.city}</h1>
      <p className="suburb">{location.region}</p>
      <p className="coordinates">
        {location.coordinates} · {date}
      </p>
    </section>
  );
}
