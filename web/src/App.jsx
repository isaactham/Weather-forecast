import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchForecast } from './api.js';
import { DayDetailSheet } from './components/DayDetailSheet.jsx';
import { ForecastList } from './components/ForecastList.jsx';
import { Hero } from './components/Hero.jsx';
import { LocationHeader } from './components/LocationHeader.jsx';
import { StatCards } from './components/StatCards.jsx';
import { TemperatureChart } from './components/TemperatureChart.jsx';
import { formatLocation, formatLocationDate } from './utils/format.js';
import { conditionFromWeatherData } from './utils/weatherCondition.js';
import './App.css';

function SearchBar({ onSearch, onLocate }) {
  const [searchText, setSearchText] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const query = searchText.trim();
    if (query) onSearch(query);
  }

  return (
    <form className="search-row" role="search" onSubmit={handleSubmit}>
      <label className="search-field">
        <span className="visually-hidden">Search for a city, address or coordinates</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 5 5" />
        </svg>
        <input
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="City, address or −37.78, 175.28"
        />
      </label>
      <button className="icon-button" type="submit" aria-label="Search">
        <span aria-hidden="true">⌕</span>
      </button>
      <button
        className="icon-button"
        type="button"
        aria-label="Use my current location"
        onClick={onLocate}
      >
        <span aria-hidden="true">◎</span>
      </button>
    </form>
  );
}

function App() {
  const [query, setQuery] = useState(null);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [usedCurrentLocation, setUsedCurrentLocation] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(1);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const startupLocationRequested = useRef(false);

  const loadCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setUsedCurrentLocation(false);
      setQuery('Hamilton');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUsedCurrentLocation(true);
        setIsDetailOpen(false);
        // The backend parser already accepts coordinate queries, so no backend change is needed.
        setQuery(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
      },
      () => {
        setUsedCurrentLocation(false);
        setQuery('Hamilton');
      },
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (startupLocationRequested.current) return;
    startupLocationRequested.current = true;
    loadCurrentLocation();
  }, [loadCurrentLocation]);

  useEffect(() => {
    if (!query) return undefined;

    const controller = new AbortController();
    setStatus('loading');
    setErrorMessage('');

    fetchForecast(query, controller.signal)
      .then((forecast) => {
        setData(forecast);
        setSelectedDayIndex(0);
        setStatus('success');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setErrorMessage(error.message);
        setStatus('error');
      });

    // Abort a slow older request so it cannot overwrite a newer search.
    return () => controller.abort();
  }, [query, retryCount]);

  const forecast = data;
  const today = forecast?.days?.[0];
  const location = forecast ? formatLocation(forecast.location) : null;
  const conditionOverride = new URLSearchParams(window.location.search).get('condition');
  const condition = conditionFromWeatherData(forecast, conditionOverride);
  const locationDate = today ? formatLocationDate(today.date) : '';

  return (
    <main
      className="weather-app"
      data-theme={isDark ? 'dark' : 'light'}
      data-condition={condition}
      data-status={status}
    >
      <div className="app-scroll">
        <div className="home-content">
          <SearchBar
            onLocate={loadCurrentLocation}
            onSearch={(nextQuery) => {
              setUsedCurrentLocation(false);
              setIsDetailOpen(false);
              setQuery(nextQuery);
            }}
          />
          {!forecast && status === 'loading' && (
            <div className="loading-hero" role="status" aria-live="polite">
              <span className="loading-indicator" aria-hidden="true" />
              <p>Loading forecast…</p>
            </div>
          )}
          {forecast && status === 'loading' && (
            <p className="loading-banner" role="status" aria-live="polite">
              Loading forecast for {query}…
            </p>
          )}
          {status === 'error' && (
            <section className="error-card" role="alert">
              <div>
                <h2>Forecast unavailable</h2>
                <p>{errorMessage || "Something went wrong. Please try again."}</p>
              </div>
              <button
                type="button"
                className="retry-button"
                onClick={() => setRetryCount((count) => count + 1)}
                disabled={!query}
              >
                Try again
              </button>
            </section>
          )}
          {forecast && today && (
            <>
              <LocationHeader
                location={location}
                date={locationDate}
                isDark={isDark}
                onToggleTheme={() => setIsDark((value) => !value)}
                isCurrentLocation={usedCurrentLocation}
              />
              <Hero
                current={forecast.current}
                today={today}
                condition={condition}
                isDark={isDark}
              />
              <div className="content-panel">
                <StatCards day={today} />
                <TemperatureChart days={forecast.days} />
                <ForecastList
                  days={forecast.days}
                  selectedDayIndex={isDetailOpen ? selectedDayIndex : -1}
                  onSelectDay={(index) => {
                    setSelectedDayIndex(index);
                    setIsDetailOpen(true);
                  }}
                />
              </div>
            </>
          )}
          {!forecast && status === 'idle' && (
            <p className="request-status">Search for a city to see its forecast.</p>
          )}
          <DayDetailSheet
            days={forecast?.days ?? []}
            selectedDayIndex={selectedDayIndex}
            locationName={location?.city ?? ''}
            isOpen={isDetailOpen}
            onSelectDay={setSelectedDayIndex}
            onClose={() => setIsDetailOpen(false)}
          />
        </div>
      </div>
    </main>
  );
}

export default App;
