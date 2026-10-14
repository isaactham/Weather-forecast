import { ThemeToggle } from './ThemeToggle.jsx';

export function LocationHeader({
  location,
  date,
  isDark,
  onToggleTheme,
  isCurrentLocation = false,
  canSave = false,
  isSaved = false,
  onToggleSaved
}) {
  return (
    <section className="location-block" aria-label="Current location">
      <div className="location-top">
        <div className="location-top-left">
          {canSave && (
            <button
              className={`save-place-button${isSaved ? ' saved' : ''}`}
              type="button"
              aria-pressed={isSaved}
              onClick={onToggleSaved}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.75L6 21z" />
              </svg>
              {isSaved ? 'Saved' : 'Save'}
            </button>
          )}
          {isCurrentLocation && <div className="location-tag">⌖ Current location</div>}
        </div>
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>
      <h1 className="city-name">{location.city}</h1>
      {location.region && <p className="suburb">{location.region}</p>}
      <p className="coordinates">
        {location.coordinates}{date ? ` · ${date}` : ''}
      </p>
    </section>
  );
}
