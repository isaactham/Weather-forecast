import { formatCoordinate } from '../utils/format.js';

export function LocationDropdown({ query, locations, activeIndex, onChoose }) {
  if (locations.length < 2) return null;

  return (
    <div className="location-dropdown">
      <p className="location-dropdown-heading">Which {query}?</p>
      <div id="location-options" role="listbox" aria-label={`Places matching ${query}`}>
        {locations.map((location, index) => (
          <div
            className={`location-option${index === activeIndex ? ' active' : ''}`}
            id={`location-option-${index}`}
            key={`${location.id}-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            onClick={() => onChoose(location)}
          >
            <svg className="location-option-pin" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
              <circle cx="12" cy="10" r="2.2" />
            </svg>
            <span className="location-option-copy">
              <span className="location-option-name">{location.name}</span>
              <span className="location-option-region">
                {[location.region, location.country].filter(Boolean).join(', ')}
              </span>
            </span>
            <span className="location-option-coordinates">
              {formatCoordinate(location.lat)}, {formatCoordinate(location.lng)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
