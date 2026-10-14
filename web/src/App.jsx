import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCurrentMany, fetchForecast, searchLocations } from './api.js';
import { DayDetailSheet } from './components/DayDetailSheet.jsx';
import { ForecastList } from './components/ForecastList.jsx';
import { Hero } from './components/Hero.jsx';
import { LocationDropdown } from './components/LocationDropdown.jsx';
import { LocationHeader } from './components/LocationHeader.jsx';
import { SavedPlaces } from './components/SavedPlaces.jsx';
import { StatCards } from './components/StatCards.jsx';
import { TemperatureChart } from './components/TemperatureChart.jsx';
import { formatLocation, formatLocationDate, isCoordinates } from './utils/format.js';
import {
  isSaved,
  loadSavedPlaces,
  persistSavedPlaces,
  removePlace,
  savePlace
} from './utils/savedPlaces.js';
import { conditionFromWeatherData } from './utils/weatherCondition.js';
import './App.css';

function SearchBar({
  searchText,
  onSearchTextChange,
  onSearch,
  onLocate,
  isSearching,
  isWakingUp,
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
      {isWakingUp && (
        <p className="search-message" role="status" aria-live="polite">
          Waking up the server, this can take up to a minute on the free plan…
        </p>
      )}
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
  const [wakingRequests, setWakingRequests] = useState({
    forecast: 0,
    locations: 0,
    current: 0
  });
  const [searchMessage, setSearchMessage] = useState('');
  const [searchAnnouncement, setSearchAnnouncement] = useState('');
  const [savedPlaces, setSavedPlaces] = useState(loadSavedPlaces);
  const [myLocation, setMyLocation] = useState(() => ({
    name: 'My location',
    status: navigator.geolocation ? 'loading' : 'unavailable'
  }));
  const [dashboardWeather, setDashboardWeather] = useState({});
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(false);
  const [dashboardUpdatedAt, setDashboardUpdatedAt] = useState(null);
  const [dashboardRetry, setDashboardRetry] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [activePage, setActivePage] = useState(
    () => (window.location.hash === '#search' ? 'search' : 'saved')
  );
  const startupLocationRequested = useRef(false);
  const lookupController = useRef(null);
  const searchContainer = useRef(null);
  const searchScroll = useRef(null);
  const cityHeading = useRef(null);
  const focusHeadingAfterForecast = useRef(false);
  const pager = useRef(null);
  const scrollFrame = useRef(null);
  const toastTimer = useRef(null);
  const pendingDeviceLocation = useRef(null);
  const dashboardController = useRef(null);
  const lastDashboardRequest = useRef({ key: '', time: 0 });
  const handledDashboardRetry = useRef(0);

  const startWakeMessage = useCallback((requestType, signal) => {
    let isVisible = false;
    const timer = window.setTimeout(() => {
      isVisible = true;
      setWakingRequests((current) => ({
        ...current,
        [requestType]: current[requestType] + 1
      }));
    }, 4000);
    const clear = () => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', clear);
      if (isVisible) {
        isVisible = false;
        setWakingRequests((current) => ({
          ...current,
          [requestType]: Math.max(0, current[requestType] - 1)
        }));
      }
    };
    signal.addEventListener('abort', clear, { once: true });
    return clear;
  }, []);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(''), 1800);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(toastTimer.current);
    lookupController.current?.abort();
  }, []);

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
    const clearWakeMessage = startWakeMessage('locations', controller.signal);

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
        clearWakeMessage();
        if (lookupController.current === controller) {
          lookupController.current = null;
          setIsSearching(false);
        }
      });
  }, [chooseLocation, closeDropdown, startWakeMessage]);

  const updateSearchText = useCallback((value) => {
    lookupController.current?.abort();
    lookupController.current = null;
    setIsSearching(false);
    setSearchText(value);
    setSearchMessage('');
    setSearchAnnouncement('');
    closeDropdown();
  }, [closeDropdown]);

  const toggleSavedPlace = useCallback(() => {
    if (!data) return;
    const { lat, lng, name } = data.location;
    const existing = isSaved(savedPlaces, lat, lng);

    if (existing) {
      const updated = removePlace(savedPlaces, `${lat.toFixed(3)},${lng.toFixed(3)}`);
      setSavedPlaces(updated);
      persistSavedPlaces(updated);
      setSaveMessage('');
      showToast('Removed from your places');
      return;
    }

    const updated = savePlace(savedPlaces, {
      name: isCoordinates(name) ? 'Pinned location' : name,
      lat,
      lng,
      savedAt: new Date().toISOString()
    });
    if (updated === savedPlaces) {
      setSaveMessage('You can save up to 20 places. Remove one to add another.');
      return;
    }

    setSavedPlaces(updated);
    persistSavedPlaces(updated);
    setSaveMessage('');
    showToast('Saved to your places');
  }, [data, savedPlaces, showToast]);

  const removeSavedPlace = useCallback((place) => {
    const updated = removePlace(savedPlaces, place.id);
    setSavedPlaces(updated);
    persistSavedPlaces(updated);
    if (updated.length === 0) setEditMode(false);
    setDashboardError(false);
    showToast(`Removed ${place.name.split(',')[0]}`);
  }, [savedPlaces, showToast]);

  const openSavedPlace = useCallback((place) => {
    lookupController.current?.abort();
    lookupController.current = null;
    setIsSearching(false);
    setSearchMessage('');
    setSearchText(place.name);
    closeDropdown();
    setUsedCurrentLocation(false);
    setIsDetailOpen(false);
    setStatus('loading');
    focusHeadingAfterForecast.current = true;
    if (searchScroll.current) searchScroll.current.scrollTop = 0;
    setQuery({
      q: `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`,
      label: place.name
    });
    navigateToPage('search');
  }, [closeDropdown, navigateToPage]);

  const focusSearch = useCallback(() => {
    navigateToPage('search');
    window.setTimeout(() => searchContainer.current?.querySelector('input')?.focus(), 0);
  }, [navigateToPage]);

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
    setMyLocation({ name: 'My location', status: 'loading' });

    if (!navigator.geolocation) {
      setUsedCurrentLocation(false);
      setMyLocation({ name: 'My location', status: 'unavailable' });
      setQuery('Hamilton');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        pendingDeviceLocation.current = { lat: latitude, lng: longitude };
        setMyLocation({
          name: 'My location',
          lat: latitude,
          lng: longitude,
          status: 'loading'
        });
        setUsedCurrentLocation(true);
        setIsDetailOpen(false);
        // The backend reverse-geocodes these coordinates while fetching the forecast.
        setQuery({ q: `${latitude}, ${longitude}` });
      },
      (error) => {
        setUsedCurrentLocation(false);
        pendingDeviceLocation.current = null;
        setMyLocation({
          name: 'My location',
          status: error.code === 2 || error.code === 3 ? 'unavailable' : 'denied'
        });
        setQuery('Hamilton');
      },
      { timeout: 8000 }
    );
  }, [closeDropdown]);

  const openMyLocation = useCallback(() => {
    if (myLocation.status !== 'ready') return;
    setStatus('loading');
    focusHeadingAfterForecast.current = true;
    if (searchScroll.current) searchScroll.current.scrollTop = 0;
    loadCurrentLocation();
    navigateToPage('search');
  }, [loadCurrentLocation, myLocation.status, navigateToPage]);

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
    const clearWakeMessage = startWakeMessage('forecast', controller.signal);
    fetchForecast(request.q, controller.signal)
      .then((forecast) => {
        // Preserve the exact label selected from the disambiguation list.
        setData(request.label
          ? { ...forecast, location: { ...forecast.location, name: request.label } }
          : forecast);
        setSelectedDayIndex(0);
        setStatus('success');
        const requestedLocation = pendingDeviceLocation.current;
        if (
          requestedLocation
          && Math.abs(forecast.location.lat - requestedLocation.lat) < 0.00001
          && Math.abs(forecast.location.lng - requestedLocation.lng) < 0.00001
        ) {
          pendingDeviceLocation.current = null;
          setMyLocation({
            name: forecast.location.name,
            lat: requestedLocation.lat,
            lng: requestedLocation.lng,
            status: 'ready'
          });
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (pendingDeviceLocation.current) {
          pendingDeviceLocation.current = null;
          setMyLocation((current) => ({ ...current, status: 'unavailable' }));
        }
        setErrorMessage(error.message);
        setStatus('error');
      })
      .finally(() => {
        clearWakeMessage();
      });

    // Abort a slow older request so it cannot overwrite a newer search.
    return () => controller.abort();
  }, [query, retryCount, startWakeMessage]);

  useEffect(() => {
    if (status !== 'success' || !focusHeadingAfterForecast.current) return;
    cityHeading.current?.focus();
    focusHeadingAfterForecast.current = false;
  }, [status, data]);

  const isMyLocationReady = myLocation.status === 'ready';
  const currentDashboardCoords = useMemo(() => [
    ...(isMyLocationReady ? [{ lat: myLocation.lat, lng: myLocation.lng }] : []),
    ...savedPlaces
  ], [isMyLocationReady, myLocation.lat, myLocation.lng, savedPlaces]);

  useEffect(() => {
    if (activePage !== 'saved') return undefined;

    const includeMyLocation = isMyLocationReady;
    const coords = currentDashboardCoords;
    if (coords.length === 0) return undefined;

    const requestKey = coords.map(({ lat, lng }) => `${lat},${lng}`).join('|');
    const forceRefresh = dashboardRetry !== handledDashboardRetry.current;
    handledDashboardRetry.current = dashboardRetry;
    const isFresh = Date.now() - lastDashboardRequest.current.time < 10 * 60 * 1000;
    if (
      !forceRefresh
      && requestKey === lastDashboardRequest.current.key
      && isFresh
    ) return undefined;

    const controller = new AbortController();
    dashboardController.current?.abort();
    dashboardController.current = controller;
    setDashboardLoading(true);
    const clearWakeMessage = startWakeMessage('current', controller.signal);

    fetchCurrentMany(coords, controller.signal)
      .then((results) => {
        if (controller.signal.aborted) return;
        const nextWeather = {};
        let resultIndex = 0;
        if (includeMyLocation) {
          nextWeather.myLocation = results[resultIndex];
          resultIndex += 1;
        }
        savedPlaces.forEach((place, index) => {
          nextWeather[place.id] = results[resultIndex + index];
        });
        setDashboardWeather((previous) => ({ ...previous, ...nextWeather }));
        const fetchedAt = Date.now();
        lastDashboardRequest.current = { key: requestKey, time: fetchedAt };
        setDashboardUpdatedAt(fetchedAt);
        setDashboardError(false);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setDashboardError(true);
      })
      .finally(() => {
        clearWakeMessage();
        if (!controller.signal.aborted) setDashboardLoading(false);
      });

    return () => {
      controller.abort();
      if (dashboardController.current === controller) {
        dashboardController.current = null;
        setDashboardLoading(false);
      }
    };
  }, [
    activePage,
    currentDashboardCoords,
    isMyLocationReady,
    savedPlaces,
    dashboardRetry,
    startWakeMessage
  ]);

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
        <SavedPlaces
          places={savedPlaces}
          myLocation={myLocation}
          weatherById={dashboardWeather}
          isLoading={dashboardLoading}
          isWakingUp={wakingRequests.current > 0}
          updateError={dashboardError}
          updatedAt={dashboardUpdatedAt}
          editMode={editMode}
          onToggleEdit={() => setEditMode((editing) => !editing)}
          onRemove={removeSavedPlace}
          onOpenPlace={openSavedPlace}
          onRetry={() => setDashboardRetry((count) => count + 1)}
          onLocate={loadCurrentLocation}
          onOpenMyLocation={openMyLocation}
          onSearch={focusSearch}
        />
        <section className="pager-page app-scroll" id="search" aria-label="Search" ref={searchScroll}>
          <div className="home-content">
          <SearchBar
            searchText={searchText}
            onSearchTextChange={updateSearchText}
            onLocate={loadCurrentLocation}
            onSearch={submitSearch}
            isSearching={isSearching}
            isWakingUp={wakingRequests.locations > 0}
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
              {wakingRequests.forecast > 0 && (
                <p>Waking up the server, this can take up to a minute on the free plan…</p>
              )}
            </div>
          )}
          {forecast && status === 'loading' && (
            <p className="loading-banner" role="status" aria-live="polite">
              Loading forecast for {typeof query === 'string' ? query : query.label ?? query.q}…
              {wakingRequests.forecast > 0 && (
                <> Waking up the server, this can take up to a minute on the free plan…</>
              )}
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
                canSave={Boolean(forecast && status !== 'loading')}
                isSaved={forecast ? isSaved(savedPlaces, forecast.location.lat, forecast.location.lng) : false}
                onToggleSaved={toggleSavedPlace}
                cityHeadingRef={cityHeading}
              />
              {saveMessage && <p className="save-limit-message" role="status">{saveMessage}</p>}
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
      {toastMessage && <div className="save-toast" aria-live="polite">{toastMessage}</div>}
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
