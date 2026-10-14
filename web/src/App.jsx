import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchForecast, searchLocations } from './api.js';
import { DayDetailSheet } from './components/DayDetailSheet.jsx';
import { ForecastList } from './components/ForecastList.jsx';
import { Hero } from './components/Hero.jsx';
import { LocationDropdown } from './components/LocationDropdown.jsx';
import { LocationHeader } from './components/LocationHeader.jsx';
import { StatCards } from './components/StatCards.jsx';
import { TemperatureChart } from './components/TemperatureChart.jsx';
import { formatLocation, formatLocationDate, isCoordinates } from './utils/format.js';
import { conditionFromWeatherData } from './utils/weatherCondition.js';
import './App.css';

function SearchBar({
  searchText,
  onSearchTextChange,
  onSearch,
  onLocate,
  isSearching,
  message,
  announcement,
  locations,
  activeIndex,
  onChooseLocation,
  onMoveHighlight,
  onCloseDropdown,
  containerRef
}) {
  function handleSubmit(event) {
    event.preventDefault();
    const query = searchText.trim();
    if (query) onSearch(query);
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape' && locations.length > 1) {
      event.preventDefault();
      onCloseDropdown();
      return;
    }

    if (locations.length > 1 && event.key === 'ArrowDown') {
      event.preventDefault();
      onMoveHighlight(1);
    } else if (locations.length > 1 && event.key === 'ArrowUp') {
      event.preventDefault();
      onMoveHighlight(-1);
    } else if (locations.length > 1 && event.key === 'Enter') {
      event.preventDefault();
      onChooseLocation(locations[activeIndex] ?? locations[0]);
    }
  }

  return (
    <div className="search-area" ref={containerRef}>
      <form className="search-row" role="search" onSubmit={handleSubmit}>
        <label className="search-field">
          <span className="visually-hidden">Search for a city, address or coordinates</span>
          {isSearching ? (
            <span className="search-spinner" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 5 5" />
            </svg>
          )}
          <input
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={locations.length > 1}
            aria-controls="location-options"
            aria-activedescendant={activeIndex >= 0 && locations.length > 1
              ? `location-option-${activeIndex}`
              : undefined}
            aria-busy={isSearching}
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            onKeyDown={handleKeyDown}
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
      <LocationDropdown
        query={searchText}
        locations={locations}
        activeIndex={activeIndex}
        onChoose={onChooseLocation}
      />
      {message && <p className="search-message" role="status">{message}</p>}
      <span className="visually-hidden" aria-live="polite">{announcement}</span>
    </div>
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
  const [searchText, setSearchText] = useState('');
  const [locations, setLocations] = useState([]);
  const [activeLocationIndex, setActiveLocationIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchAnnouncement, setSearchAnnouncement] = useState('');
  const [activePage, setActivePage] = useState(
    () => (window.location.hash === '#search' ? 'search' : 'saved')
  );
  const startupLocationRequested = useRef(false);
  const lookupController = useRef(null);
  const searchContainer = useRef(null);
  const pager = useRef(null);
  const scrollFrame = useRef(null);

  const scrollToPage = useCallback((page, behavior = 'smooth') => {
    const pagerElement = pager.current;
    if (!pagerElement) return;
    const left = page === 'search' ? pagerElement.clientWidth : 0;

    if (behavior === 'auto') {
      pagerElement.scrollLeft = left;
    } else {
      pagerElement.scrollTo({ left, behavior });
    }
  }, []);

  const navigateToPage = useCallback((page) => {
    if (page === activePage) return;
    window.history.pushState({ page }, '', `#${page}`);
    setActivePage(page);
    scrollToPage(
      page,
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    );
  }, [activePage, scrollToPage]);

  const closeDropdown = useCallback(() => {
    setLocations([]);
    setActiveLocationIndex(-1);
  }, []);

  const chooseLocation = useCallback((place) => {
    lookupController.current?.abort();
    lookupController.current = null;
    setIsSearching(false);
    setSearchMessage('');
    setSearchText(place.label);
    closeDropdown();
    setUsedCurrentLocation(false);
    setIsDetailOpen(false);
    setQuery({
      q: `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`,
      label: place.label
    });
  }, [closeDropdown]);

  const submitSearch = useCallback((text) => {
    lookupController.current?.abort();
    lookupController.current = null;
    setSearchMessage('');
    setSearchAnnouncement('');
    closeDropdown();
    setIsDetailOpen(false);
    setUsedCurrentLocation(false);
    setIsSearching(false);

    if (isCoordinates(text)) {
      setQuery(text);
      return;
    }

    const controller = new AbortController();
    lookupController.current = controller;
    setIsSearching(true);

    searchLocations(text, controller.signal)
      .then((results) => {
        if (controller.signal.aborted) return;
        setSearchAnnouncement(`${results.length} ${results.length === 1 ? 'place' : 'places'} found`);
        if (results.length === 0) {
          setSearchMessage(`No places found for "${text}". Try a different spelling or coordinates.`);
        } else if (results.length === 1) {
          chooseLocation(results[0]);
        } else {
          setLocations(results);
          setActiveLocationIndex(0);
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setSearchMessage(error.message);
      })
      .finally(() => {
        if (lookupController.current === controller) {
          lookupController.current = null;
          setIsSearching(false);
        }
      });
  }, [chooseLocation, closeDropdown]);

  const updateSearchText = useCallback((value) => {
    lookupController.current?.abort();
    lookupController.current = null;
    setIsSearching(false);
    setSearchText(value);
    setSearchMessage('');
    setSearchAnnouncement('');
    closeDropdown();
  }, [closeDropdown]);

  const moveHighlight = useCallback((direction) => {
    setActiveLocationIndex((current) => {
      const start = current < 0 ? 0 : current;
      return (start + direction + locations.length) % locations.length;
    });
  }, [locations.length]);

  useEffect(() => {
    if (locations.length < 2) return undefined;
    function closeOnOutsideClick(event) {
      if (!searchContainer.current?.contains(event.target)) closeDropdown();
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [closeDropdown, locations.length]);

  const loadCurrentLocation = useCallback(() => {
    lookupController.current?.abort();
    lookupController.current = null;
    setIsSearching(false);
    closeDropdown();
    setSearchMessage('');
    setSearchAnnouncement('');

    if (!navigator.geolocation) {
      setUsedCurrentLocation(false);
      setQuery('Hamilton');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUsedCurrentLocation(true);
        setIsDetailOpen(false);
        // The backend reverse-geocodes these coordinates while fetching the forecast.
        setQuery(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
      },
      () => {
        setUsedCurrentLocation(false);
        setQuery('Hamilton');
      },
      { timeout: 8000 }
    );
  }, [closeDropdown]);

  useEffect(() => {
    if (startupLocationRequested.current) return;
    startupLocationRequested.current = true;
    loadCurrentLocation();
  }, [loadCurrentLocation]);

  useEffect(() => {
    const initialPage = window.location.hash === '#search' ? 'search' : 'saved';
    if (window.location.hash !== '#saved' && window.location.hash !== '#search') {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#saved`);
    }
    scrollToPage(initialPage, 'auto');

    function handlePopState() {
      const page = window.location.hash === '#search' ? 'search' : 'saved';
      setActivePage(page);
      scrollToPage(page, 'auto');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [scrollToPage]);

  useEffect(() => {
    const pagerElement = pager.current;
    if (!pagerElement) return undefined;

    function handleScroll() {
      if (scrollFrame.current !== null) return;
      scrollFrame.current = window.requestAnimationFrame(() => {
        scrollFrame.current = null;
        const page = pagerElement.scrollLeft >= pagerElement.clientWidth / 2 ? 'search' : 'saved';
        setActivePage(page);
        if (window.location.hash !== `#${page}`) {
          window.history.replaceState(window.history.state, '', `#${page}`);
        }
      });
    }

    pagerElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      pagerElement.removeEventListener('scroll', handleScroll);
      if (scrollFrame.current !== null) {
        window.cancelAnimationFrame(scrollFrame.current);
        scrollFrame.current = null;
      }
    };
  }, []);

  useEffect(() => {
    function handleArrowNavigation(event) {
      if (isDetailOpen) return;
      const target = event.target;
      if (
        target instanceof HTMLElement
        && (target.isContentEditable || target.matches('input, textarea, select'))
      ) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

      event.preventDefault();
      navigateToPage(event.key === 'ArrowLeft' ? 'saved' : 'search');
    }

    window.addEventListener('keydown', handleArrowNavigation);
    return () => window.removeEventListener('keydown', handleArrowNavigation);
  }, [isDetailOpen, navigateToPage]);

  useEffect(() => {
    if (!query) return undefined;

    const controller = new AbortController();
    setStatus('loading');
    setErrorMessage('');

    const request = typeof query === 'string' ? { q: query } : query;
    fetchForecast(request.q, controller.signal)
      .then((forecast) => {
        // Preserve the exact label selected from the disambiguation list.
        setData(request.label
          ? { ...forecast, location: { ...forecast.location, name: request.label } }
          : forecast);
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
  const location = forecast ? formatLocation(forecast.location, usedCurrentLocation) : null;
  const conditionOverride = new URLSearchParams(window.location.search).get('condition');
  const condition = conditionFromWeatherData(forecast, conditionOverride);
  const locationDate = today ? formatLocationDate(today.date) : '';

  return (
    <main
      className="weather-app"
      data-theme={isDark ? 'dark' : 'light'}
      data-condition={condition}
      data-status={status}
      data-detail-open={isDetailOpen}
    >
      <div
        className="page-pager"
        ref={pager}
        aria-label="Weather app pages"
      >
        <section className="pager-page saved-page" id="saved" aria-label="Saved places">
          <div className="saved-page-content">
            <h1 className="saved-page-title">Saved places</h1>
            <p className="saved-page-placeholder">Your saved places will appear here.</p>
          </div>
        </section>
        <section className="pager-page app-scroll" id="search" aria-label="Search">
          <div className="home-content">
          <SearchBar
            searchText={searchText}
            onSearchTextChange={updateSearchText}
            onLocate={loadCurrentLocation}
            onSearch={submitSearch}
            isSearching={isSearching}
            message={searchMessage}
            announcement={searchAnnouncement}
            locations={locations}
            activeIndex={activeLocationIndex}
            onChooseLocation={chooseLocation}
            onMoveHighlight={moveHighlight}
            onCloseDropdown={closeDropdown}
            containerRef={searchContainer}
          />
          {!forecast && status === 'loading' && (
            <div className="loading-hero" role="status" aria-live="polite">
              <span className="loading-indicator" aria-hidden="true" />
              <p>Loading forecast…</p>
            </div>
          )}
          {forecast && status === 'loading' && (
            <p className="loading-banner" role="status" aria-live="polite">
              Loading forecast for {typeof query === 'string' ? query : query.label}…
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
        </section>
      </div>
      <nav className="page-navigation" aria-label="Weather pages">
        {[
          { page: 'saved', label: 'Saved', icon: 'list' },
          { page: 'search', label: 'Search', icon: 'search' }
        ].map(({ page, label, icon }) => (
          <button
            className={`page-navigation-button${activePage === page ? ' active' : ''}`}
            key={page}
            type="button"
            aria-current={activePage === page ? 'page' : undefined}
            onClick={() => navigateToPage(page)}
          >
            {icon === 'list' ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 5 5" />
              </svg>
            )}
            {label}
          </button>
        ))}
      </nav>
    </main>
  );
}

export default App;
