import { useEffect, useState } from 'react';
import { conditionFromCode } from '../utils/weatherCondition.js';
import { formatCoordinate, isCoordinates } from '../utils/format.js';

function formatTemperature(value) {
  if (!Number.isFinite(value)) return '–';
  const rounded = Math.round(value);
  return `${rounded < 0 ? '−' : ''}${Math.abs(rounded)}°`;
}

function locationParts(name) {
  const [city = '', ...region] = name.split(',');
  return {
    city: isCoordinates(name) ? 'Current location' : city.trim(),
    region: isCoordinates(name) ? '' : region.join(',').trim()
  };
}

function PlaceCard({
  place,
  weather,
  isLoading,
  isMyLocation = false,
  editMode = false,
  onOpen,
  onRemove,
  onLocate
}) {
  const { city, region } = locationParts(place.name || 'My location');
  const condition = conditionFromCode(weather?.code);
  const coordinates = `${formatCoordinate(place.lat)}, ${formatCoordinate(place.lng)}`;

  if (isMyLocation && place.status !== 'ready' && place.status !== 'loading') {
    return (
      <button className="my-location-off" type="button" onClick={onLocate}>
        <span className="my-location-label">⌖ My location</span>
        <span className="location-off-message">Location off · Tap to turn on</span>
        <span className="location-off-hint">Allow location in your browser settings</span>
      </button>
    );
  }

  return (
    <article className={`saved-place-card${isMyLocation ? ' my-location-card' : ''}`} data-condition={condition}>
      <button
        className="saved-place-open"
        type="button"
        aria-label={`${city}${weather?.temperature != null ? `, ${formatTemperature(weather.temperature).replace('°', '')} degrees` : ''}${weather?.summary ? `, ${weather.summary}` : ''}. Open forecast.`}
        onClick={onOpen}
        disabled={editMode}
      >
        <span className="saved-place-top">
          <span className="saved-place-name">
            {isMyLocation && <span className="my-location-label">⌖ My location</span>}
            <span className="saved-place-city">{city}</span>
            {region && <span className="saved-place-region">{region}</span>}
          </span>
          {isLoading || (isMyLocation && place.status === 'loading') ? (
            <span className="weather-skeleton temperature-skeleton" aria-label="Loading temperature" />
          ) : (
            <span className="saved-place-temperature">{formatTemperature(weather?.temperature)}</span>
          )}
        </span>
        <span className="saved-place-bottom">
          <span className="saved-place-summary">
            {isLoading || (isMyLocation && place.status === 'loading')
              ? <span className="weather-skeleton summary-skeleton" aria-label="Loading weather" />
              : weather?.summary ?? '–'}
          </span>
          <span className="saved-place-weather-details">
            {isLoading ? (
              <span className="weather-skeleton range-skeleton" aria-label="Loading highs and lows" />
            ) : (
              <span>H {formatTemperature(weather?.tempMax)} · L {formatTemperature(weather?.tempMin)}</span>
            )}
            <span className="saved-place-coordinates">{coordinates}</span>
          </span>
        </span>
      </button>
      {editMode && !isMyLocation && (
        <button
          className="saved-place-remove"
          type="button"
          aria-label={`Remove ${city}`}
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </article>
  );
}

export function SavedPlaces({
  places,
  myLocation,
  weatherById,
  isLoading,
  isWakingUp,
  updateError,
  updatedAt,
  editMode,
  onToggleEdit,
  onRemove,
  onOpenPlace,
  onRetry,
  onLocate,
  onOpenMyLocation,
  onSearch
}) {
  const [minutesAgo, setMinutesAgo] = useState(0);

  useEffect(() => {
    if (!updatedAt) return undefined;
    const timer = window.setInterval(() => {
      setMinutesAgo(Math.floor((Date.now() - updatedAt) / 60000));
    }, 60000);
    return () => window.clearInterval(timer);
  }, [updatedAt]);

  const updatedLabel = updatedAt
    ? (minutesAgo === 0 ? 'Updated just now' : `Updated ${minutesAgo} min ago`)
    : 'Weather updates when this page is shown';

  return (
    <section className="pager-page saved-page" id="saved" aria-label="Saved places">
      <div className="saved-page-content">
        <header className="saved-page-header">
          <h1 className="saved-page-title">Saved places</h1>
          {places.length > 0 && (
            <button className="saved-edit-button" type="button" onClick={onToggleEdit}>
              {editMode ? 'Done' : 'Edit'}
            </button>
          )}
        </header>
        <p className="saved-page-subtitle">{updatedLabel} · {places.length} {places.length === 1 ? 'place' : 'places'}</p>
        {isWakingUp && (
          <p role="status" aria-live="polite">
            Waking up the server, this can take up to a minute on the free plan…
          </p>
        )}
        {updateError && (
          <div className="saved-update-error" role="status">
            <span>Couldn't update. Showing last known weather.</span>
            <button type="button" onClick={onRetry}>Retry</button>
          </div>
        )}
        <div className="saved-place-list">
          <PlaceCard
            place={myLocation}
            weather={weatherById.myLocation}
            isLoading={isLoading}
            isMyLocation
            onLocate={onLocate}
            onOpen={onOpenMyLocation}
          />
          {places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              weather={weatherById[place.id]}
              isLoading={isLoading}
              editMode={editMode}
              onOpen={() => onOpenPlace(place)}
              onRemove={() => onRemove(place)}
            />
          ))}
        </div>
        {places.length === 0 && (
          <div className="saved-empty-state">
            <div className="saved-empty-icon" aria-hidden="true">▱</div>
            <h2>No saved places yet</h2>
            <p>Search for a place and tap Save to add it here.</p>
            <button className="saved-search-button" type="button" onClick={onSearch}>
              Search for a place
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
