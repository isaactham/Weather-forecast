import { useEffect, useState } from 'react';
import { fetchForecast } from './api.js';
import { DayDetailSheet } from './components/DayDetailSheet.jsx';
import { ForecastList } from './components/ForecastList.jsx';
import { Hero } from './components/Hero.jsx';
import { LocationHeader } from './components/LocationHeader.jsx';
import { StatCards } from './components/StatCards.jsx';
import { TemperatureChart } from './components/TemperatureChart.jsx';
import { conditionFromCode } from './utils/weatherCondition.js';
import './App.css';

const demoForecast = {
  location: {
    city: 'Hamilton',
    region: 'Waikato, New Zealand',
    coordinates: '−37.79°, 175.28°'
  },
  current: { temperature: 15, code: 61, summary: 'Slight rain' },
  days: [
    { date: '2026-10-12', tempMax: 17, tempMin: 9, precipMm: 3.2, precipChance: 70, windMax: 22, uvMax: 3, code: 61, summary: 'Slight rain' },
    { date: '2026-10-13', tempMax: 15, tempMin: 8, precipMm: 8.4, precipChance: 85, windMax: 31, uvMax: 3, code: 63, summary: 'Moderate rain' },
    { date: '2026-10-14', tempMax: 14, tempMin: 6, precipMm: 1.2, precipChance: 30, windMax: 18, uvMax: 2, code: 3, summary: 'Overcast' },
    { date: '2026-10-15', tempMax: 16, tempMin: 7, precipMm: 0.4, precipChance: 15, windMax: 16, uvMax: 4, code: 2, summary: 'Partly cloudy' },
    { date: '2026-10-16', tempMax: 19, tempMin: 10, precipMm: 0, precipChance: 5, windMax: 14, uvMax: 6, code: 1, summary: 'Mainly clear' },
    { date: '2026-10-17', tempMax: 20, tempMin: 11, precipMm: 0, precipChance: 10, windMax: 19, uvMax: 7, code: 0, summary: 'Clear sky' },
    { date: '2026-10-18', tempMax: 18, tempMin: 10, precipMm: 2.1, precipChance: 55, windMax: 25, uvMax: 3, code: 80, summary: 'Rain showers' }
  ]
};

function SearchBar({ onSearch }) {
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
    </form>
  );
}

function App() {
  const [query, setQuery] = useState(null);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(1);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    if (!query) return undefined;

    const controller = new AbortController();
    setStatus('loading');
    setErrorMessage('');

    fetchForecast(query, controller.signal)
      .then((forecast) => {
        setData(forecast);
        setStatus('success');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setErrorMessage(error.message);
        setStatus('error');
      });

    // Abort a slow older request so it cannot overwrite a newer search.
    return () => controller.abort();
  }, [query]);

  const forecast = demoForecast;
  const today = forecast.days[0];

  return (
    <main
      className="weather-app"
      data-theme={isDark ? 'dark' : 'light'}
      data-condition={conditionFromCode(forecast.current.code)}
    >
      <div className="app-scroll">
        <div className="home-content">
          <SearchBar onSearch={setQuery} />
          <LocationHeader
            location={forecast.location}
            date="Mon 12 Oct"
            isDark={isDark}
            onToggleTheme={() => setIsDark((value) => !value)}
            isCurrentLocation
          />
          <Hero
            current={forecast.current}
            today={today}
            condition={conditionFromCode(forecast.current.code)}
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
        </div>
      </div>
      <DayDetailSheet
        days={forecast.days}
        selectedDayIndex={selectedDayIndex}
        locationName={forecast.location.city}
        isOpen={isDetailOpen}
        onSelectDay={setSelectedDayIndex}
        onClose={() => setIsDetailOpen(false)}
      />
      {status === 'loading' && <p className="request-status" role="status">Loading forecast…</p>}
      {status === 'error' && <p className="request-status error" role="alert">{errorMessage}</p>}
      {data && (
        <output className="request-status">
          Loaded forecast for {data.location.name}.
        </output>
      )}
    </main>
  );
}

export default App;
