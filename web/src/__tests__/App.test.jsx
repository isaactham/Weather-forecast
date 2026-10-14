import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import forecast from './fixtures/forecast.json';
import App from '../App.jsx';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function setGeolocationDenied() {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (_success, error) => error(new Error('Location denied'))
    }
  });
}

const locations = [
  {
    id: 1,
    name: 'Hamilton',
    region: 'Waikato',
    country: 'New Zealand',
    countryCode: 'NZ',
    lat: -37.7833,
    lng: 175.2833,
    label: 'Hamilton, Waikato, New Zealand'
  },
  {
    id: 2,
    name: 'Hamilton',
    region: 'Ontario',
    country: 'Canada',
    countryCode: 'CA',
    lat: 43.25011,
    lng: -79.84963,
    label: 'Hamilton, Ontario, Canada'
  },
  {
    id: 3,
    name: 'Hamilton',
    region: 'Ohio',
    country: 'United States',
    countryCode: 'US',
    lat: 39.3995,
    lng: -84.5613,
    label: 'Hamilton, Ohio, United States'
  }
];

describe('App forecast flow', () => {
  beforeEach(() => {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#saved`);
    localStorage.clear();
    setGeolocationDenied();
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const requestUrl = new URL(url);
      const query = requestUrl.searchParams.get('q');
      if (requestUrl.pathname === '/api/current') {
        const latitudes = requestUrl.searchParams.getAll('lat');
        const longitudes = requestUrl.searchParams.getAll('lng');
        return jsonResponse(latitudes.map((lat, index) => ({
          lat: Number(lat),
          lng: Number(longitudes[index]),
          temperature: 18.7,
          code: 2,
          summary: 'Partly cloudy',
          tempMax: 20,
          tempMin: 12
        })));
      }
      if (requestUrl.pathname === '/api/locations') {
        if (query === 'Hamilton') return jsonResponse(locations);
        if (query === 'Wellington') return jsonResponse([{
          ...locations[0],
          name: 'Wellington',
          region: null,
          country: 'New Zealand',
          lat: -41.29,
          lng: 174.78,
          label: 'Wellington, New Zealand'
        }]);
        return jsonResponse([]);
      }
      if (query?.includes(',')) {
        const [lat, lng] = query.split(',').map(Number);
        return jsonResponse({
          ...forecast,
          location: lat === -37.78 && lng === 175.28
            ? forecast.location
            : { name: `${lat}, ${lng}`, lat, lng }
        });
      }
      if (query === 'Wellington') {
        return jsonResponse({
          ...forecast,
          location: { name: 'Wellington, New Zealand', lat: -41.29, lng: 174.78 }
        });
      }
      return jsonResponse(forecast);
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('falls back to Hamilton and renders the location with seven forecast rows', async () => {
    render(<App />);

    expect(screen.getByRole('region', { name: 'Saved places' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('heading', { name: 'Hamilton' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=Hamilton'),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(screen.getAllByRole('button', { name: /chance of rain/ })).toHaveLength(7);
  });

  it('renders My location first with the reverse-geocoded device name', async () => {
    localStorage.setItem('weather.savedPlaces.v1', JSON.stringify([{
      id: '-41.290,174.780',
      name: 'Wellington, New Zealand',
      lat: -41.29,
      lng: 174.78,
      savedAt: '2026-10-14T00:00:00Z'
    }]));
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success) => success({
          coords: { latitude: -37.78, longitude: 175.28 }
        })
      }
    });
    render(<App />);

    const savedRegion = screen.getByRole('region', { name: 'Saved places' });
    expect(await within(savedRegion).findByText('My location')).toBeInTheDocument();
    expect(await within(savedRegion).findByText('Hamilton')).toBeInTheDocument();
    expect(within(savedRegion).getByText('Wellington')).toBeInTheDocument();
    await waitFor(() => expect(savedRegion.querySelector('.my-location-card .saved-place-open'))
      .toHaveAccessibleName('Hamilton, 19 degrees, Partly cloudy. Open forecast.'));
  });

  it('requests current weather once for My location first, then saved places', async () => {
    localStorage.setItem('weather.savedPlaces.v1', JSON.stringify([{
      id: '-41.290,174.780',
      name: 'Wellington, New Zealand',
      lat: -41.29,
      lng: 174.78,
      savedAt: '2026-10-14T00:00:00Z'
    }]));
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success) => success({
          coords: { latitude: -37.78, longitude: 175.28 }
        })
      }
    });
    render(<App />);

    await within(screen.getByRole('region', { name: 'Saved places' }))
      .findByText('Wellington');
    await waitFor(() => {
      const requests = fetch.mock.calls
        .map(([url]) => new URL(url))
        .filter((url) => url.pathname === '/api/current');
      const latest = requests.at(-1);
      expect(latest?.searchParams.getAll('lat')).toEqual(['-37.78', '-41.29']);
      expect(latest?.searchParams.getAll('lng')).toEqual(['175.28', '174.78']);
    });
  });

  it('does not store My location or show a remove control for it in Edit mode', async () => {
    localStorage.setItem('weather.savedPlaces.v1', JSON.stringify([{
      id: '-41.290,174.780',
      name: 'Wellington, New Zealand',
      lat: -41.29,
      lng: 174.78,
      savedAt: '2026-10-14T00:00:00Z'
    }]));
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success) => success({
          coords: { latitude: -37.78, longitude: 175.28 }
        })
      }
    });
    const user = userEvent.setup();
    render(<App />);

    const savedRegion = screen.getByRole('region', { name: 'Saved places' });
    await within(savedRegion).findByText('My location');
    await user.click(within(savedRegion).getByRole('button', { name: 'Edit' }));

    expect(within(savedRegion).getByRole('button', { name: 'Remove Wellington' })).toBeInTheDocument();
    expect(within(savedRegion).queryByRole('button', { name: 'Remove Hamilton' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('weather.savedPlaces.v1'))).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('weather.savedPlaces.v1'))[0].name).toContain('Wellington');
  });

  it('shows denied geolocation and asks again when the My location card is tapped', async () => {
    const getCurrentPosition = vi.fn((_success, error) => {
      if (getCurrentPosition.mock.calls.length === 1) {
        error({ code: 1 });
      } else {
        _success({ coords: { latitude: -37.78, longitude: 175.28 } });
      }
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition }
    });
    const user = userEvent.setup();
    render(<App />);

    const savedRegion = screen.getByRole('region', { name: 'Saved places' });
    const locationOff = await within(savedRegion).findByText('Location off · Tap to turn on');
    expect(within(savedRegion).getByText('Allow location in your browser settings')).toBeInTheDocument();
    await user.click(locationOff.closest('button'));

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('shows saved-place names immediately while current weather is loading', async () => {
    localStorage.setItem('weather.savedPlaces.v1', JSON.stringify([{
      id: '-41.290,174.780',
      name: 'Wellington, New Zealand',
      lat: -41.29,
      lng: 174.78,
      savedAt: '2026-10-14T00:00:00Z'
    }]));
    fetch.mockImplementation((url) => {
      if (new URL(url).pathname === '/api/current') return new Promise(() => {});
      return jsonResponse(forecast);
    });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Saved places' })).toBeInTheDocument();
    expect(screen.getByText('Wellington')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading temperature')).toBeInTheDocument();
  });

  it('keeps the last weather and retries when the dashboard refresh fails', async () => {
    localStorage.setItem('weather.savedPlaces.v1', JSON.stringify([{
      id: '-41.290,174.780',
      name: 'Wellington, New Zealand',
      lat: -41.29,
      lng: 174.78,
      savedAt: '2026-10-14T00:00:00Z'
    }]));
    let requestCount = 0;
    fetch.mockImplementation((url) => {
      if (new URL(url).pathname === '/api/current') {
        requestCount += 1;
        if (requestCount === 1) return Promise.resolve(jsonResponse({ detail: 'Unavailable' }, 502));
        return Promise.resolve(jsonResponse([{
          lat: -41.29,
          lng: 174.78,
          temperature: 16,
          code: 2,
          summary: 'Partly cloudy',
          tempMax: 19,
          tempMin: 10
        }]));
      }
      return Promise.resolve(jsonResponse(forecast));
    });
    const user = userEvent.setup();
    render(<App />);
    const savedRegion = screen.getByRole('region', { name: 'Saved places' });

    await within(savedRegion).findByRole('button', { name: 'Retry' });
    expect(within(savedRegion).getByText("Couldn't update. Showing last known weather.")).toBeInTheDocument();
    expect(within(savedRegion).getByText('Wellington')).toBeInTheDocument();
    await user.click(within(savedRegion).getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(requestCount).toBe(2));
    await waitFor(() => expect(within(savedRegion).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument());
  });

  it('removes saved places in edit mode and updates local storage', async () => {
    localStorage.setItem('weather.savedPlaces.v1', JSON.stringify([{
      id: '-41.290,174.780',
      name: 'Wellington, New Zealand',
      lat: -41.29,
      lng: 174.78,
      savedAt: '2026-10-14T00:00:00Z'
    }]));
    const user = userEvent.setup();
    render(<App />);
    const savedRegion = screen.getByRole('region', { name: 'Saved places' });

    await within(savedRegion).findByText('Wellington');
    await user.click(within(savedRegion).getByRole('button', { name: 'Edit' }));
    await user.click(within(savedRegion).getByRole('button', { name: 'Remove Wellington' }));

    expect(JSON.parse(localStorage.getItem('weather.savedPlaces.v1'))).toEqual([]);
    expect(await screen.findByText('Removed Wellington')).toBeInTheDocument();
    expect(within(savedRegion).queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
  });

  it('opens a saved place in Search with its saved name and Saved state', async () => {
    localStorage.setItem('weather.savedPlaces.v1', JSON.stringify([{
      id: '-41.290,174.780',
      name: 'Wellington, New Zealand',
      lat: -41.29,
      lng: 174.78,
      savedAt: '2026-10-14T00:00:00Z'
    }]));
    const user = userEvent.setup();
    render(<App />);
    const savedRegion = screen.getByRole('region', { name: 'Saved places' });

    const placeCard = await within(savedRegion).findByRole('button', {
      name: /Wellington, 19 degrees, Partly cloudy/
    });
    const pager = screen.getByLabelText('Weather app pages');
    Object.defineProperty(pager, 'clientWidth', { configurable: true, value: 400 });
    pager.scrollTo = vi.fn(({ left }) => {
      pager.scrollLeft = left;
      pager.dispatchEvent(new Event('scroll'));
    });

    await user.click(placeCard);

    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('q=-41.2900%2C%20174.7800'),
      expect.anything()
    );
    expect(await screen.findByRole('heading', { name: 'Wellington' })).toHaveFocus();
    expect(within(screen.getByRole('region', { name: 'Current location' }))
      .getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
    expect(pager.scrollTo).toHaveBeenCalledWith({ left: 400, behavior: 'smooth' });
    expect(window.location.hash).toBe('#search');
  });

  it('opens My location in Search and marks it as current location', async () => {
    const getCurrentPosition = vi.fn((success) => success({
      coords: { latitude: -37.78, longitude: 175.28 }
    }));
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition }
    });
    const user = userEvent.setup();
    render(<App />);
    const savedRegion = screen.getByRole('region', { name: 'Saved places' });
    const pager = screen.getByLabelText('Weather app pages');
    pager.scrollTo = vi.fn();

    const card = await within(savedRegion).findByRole('button', {
      name: /Hamilton, 19 degrees, Partly cloudy/
    });
    await user.click(card);

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('heading', { name: 'Hamilton' })).toHaveFocus();
    expect(screen.getByText('⌖ Current location')).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('q=-37.78%2C%20175.28'),
      expect.anything()
    );
  });

  it('shows the empty state below My location and focuses Search from its button', async () => {
    const user = userEvent.setup();
    render(<App />);
    const savedRegion = screen.getByRole('region', { name: 'Saved places' });

    expect(await within(savedRegion).findByText(/My location/)).toBeInTheDocument();
    expect(within(savedRegion).getByText('No saved places yet')).toBeInTheDocument();
    const pager = screen.getByLabelText('Weather app pages');
    Object.defineProperty(pager, 'clientWidth', { configurable: true, value: 400 });
    pager.scrollTo = vi.fn();
    await user.click(within(savedRegion).getByRole('button', { name: 'Search for a place' }));

    expect(pager.scrollTo).toHaveBeenCalledWith({ left: 400, behavior: 'smooth' });
    expect(screen.getByRole('combobox')).toHaveFocus();
  });

  it('saves the displayed place and persists it, then removes it when clicked again', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: 'Hamilton' });
    const header = within(screen.getByRole('region', { name: 'Current location' }));
    const saveButton = await header.findByRole('button', { name: 'Save' });
    await user.click(saveButton);

    expect(await header.findByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('Saved to your places')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('weather.savedPlaces.v1'))).toEqual([{
      id: '-37.780,175.280',
      name: 'Hamilton, Waikato, New Zealand',
      lat: -37.78,
      lng: 175.28,
      savedAt: expect.any(String)
    }]);

    await user.click(header.getByRole('button', { name: 'Saved' }));

    expect(await header.findByRole('button', { name: 'Save' })).toHaveAttribute('aria-pressed', 'false');
    expect(await screen.findByText('Removed from your places')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('weather.savedPlaces.v1'))).toEqual([]);
  });

  it('shows Saved when the current coordinates already exist in storage', async () => {
    localStorage.setItem('weather.savedPlaces.v1', JSON.stringify([{
      id: '-37.780,175.280',
      name: 'Hamilton, Waikato, New Zealand',
      lat: -37.78,
      lng: 175.28,
      savedAt: '2026-10-14T00:00:00Z'
    }]));
    render(<App />);

    await screen.findByRole('heading', { name: 'Hamilton' });
    const header = within(screen.getByRole('region', { name: 'Current location' }));
    expect(await header.findByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the save limit message when there are already 20 saved places', async () => {
    const places = Array.from({ length: 20 }, (_, index) => ({
      id: `0.000,${index}.000`,
      name: `Place ${index}`,
      lat: 0,
      lng: index,
      savedAt: '2026-10-14T00:00:00Z'
    }));
    localStorage.setItem('weather.savedPlaces.v1', JSON.stringify(places));
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: 'Hamilton' });
    await user.click(await screen.findByRole('button', { name: 'Save' }));

    expect(await screen.findByText('You can save up to 20 places. Remove one to add another.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('weather.savedPlaces.v1'))).toHaveLength(20);
  });

  it('opens the Search page from the navigation pill and syncs the hash', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });

    const pager = screen.getByLabelText('Weather app pages');
    Object.defineProperty(pager, 'clientWidth', { configurable: true, value: 400 });
    pager.scrollTo = vi.fn(({ left }) => {
      pager.scrollLeft = left;
      pager.dispatchEvent(new Event('scroll'));
    });

    const navigation = within(screen.getByRole('navigation', { name: 'Weather pages' }));
    await user.click(navigation.getByRole('button', { name: 'Search' }));

    expect(pager.scrollTo).toHaveBeenCalledWith({ left: 400, behavior: 'smooth' });
    await waitFor(() => {
      expect(navigation.getByRole('button', { name: 'Search' })).toHaveAttribute('aria-current', 'page');
      expect(window.location.hash).toBe('#search');
    });
  });

  it('uses the search hash to choose the initial page', async () => {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}#search`);
    render(<App />);

    expect(within(screen.getByRole('navigation', { name: 'Weather pages' }))
      .getByRole('button', { name: 'Search' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('heading', { name: 'Hamilton' })).toBeInTheDocument();
  });

  it('uses arrow keys to switch pages when focus is outside a text field', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });
    const pager = screen.getByLabelText('Weather app pages');
    Object.defineProperty(pager, 'clientWidth', { configurable: true, value: 400 });
    pager.scrollTo = vi.fn(({ left }) => {
      pager.scrollLeft = left;
      pager.dispatchEvent(new Event('scroll'));
    });

    await user.keyboard('{ArrowRight}');

    expect(pager.scrollTo).toHaveBeenCalledWith({ left: 400, behavior: 'smooth' });
    expect(within(screen.getByRole('navigation', { name: 'Weather pages' }))
      .getByRole('button', { name: 'Search' })).toHaveAttribute('aria-current', 'page');
  });

  it('updates navigation and the hash when the user swipes between pages', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });
    const pager = screen.getByLabelText('Weather app pages');
    Object.defineProperty(pager, 'clientWidth', { configurable: true, value: 400 });

    pager.scrollLeft = 400;
    pager.dispatchEvent(new Event('scroll'));

    await waitFor(() => {
      expect(within(screen.getByRole('navigation', { name: 'Weather pages' }))
        .getByRole('button', { name: 'Search' })).toHaveAttribute('aria-current', 'page');
      expect(window.location.hash).toBe('#search');
    });
  });

  it('restores the previous page with browser history navigation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });
    const pager = screen.getByLabelText('Weather app pages');
    Object.defineProperty(pager, 'clientWidth', { configurable: true, value: 400 });
    pager.scrollTo = vi.fn(({ left }) => {
      pager.scrollLeft = left;
      pager.dispatchEvent(new Event('scroll'));
    });

    await user.click(within(screen.getByRole('navigation', { name: 'Weather pages' }))
      .getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(window.location.hash).toBe('#search'));
    window.history.back();

    await waitFor(() => {
      expect(window.location.hash).toBe('#saved');
      expect(within(screen.getByRole('navigation', { name: 'Weather pages' }))
        .getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-current', 'page');
    });
  });

  it('searches for Wellington and renders its response', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: 'Hamilton' });
    const search = screen.getByRole('combobox');
    await user.clear(search);
    await user.type(search, 'Wellington');
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Wellington' })).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('q=-41.2900%2C%20174.7800'),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('shows a 404 error and retries the last query', async () => {
    const user = userEvent.setup();
    fetch
      .mockResolvedValueOnce(jsonResponse(forecast))
      .mockResolvedValueOnce(jsonResponse({ detail: "We couldn't find that place." }, 404))
      .mockResolvedValueOnce(jsonResponse(forecast));
    render(<App />);

    await screen.findByRole('heading', { name: 'Hamilton' });
    const search = screen.getByRole('combobox');
    await user.clear(search);
    await user.type(search, '-37.78, 175.28');
    await user.keyboard('{Enter}');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText("We couldn't find that place.")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hamilton' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hamilton' })).toBeInTheDocument();
  });

  it('shows location lookup failures under the search bar', async () => {
    const user = userEvent.setup();
    fetch.mockImplementation(async (url) => {
      const requestUrl = new URL(url);
      if (requestUrl.pathname === '/api/locations') {
        return jsonResponse({ detail: 'The weather service is unavailable right now.' }, 502);
      }
      return jsonResponse(forecast);
    });
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });

    const search = screen.getByRole('combobox');
    await user.clear(search);
    await user.type(search, 'Hamilton');
    await user.keyboard('{Enter}');

    expect(await screen.findByText('The weather service is unavailable right now.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('opens choices for multiple matches and loads the clicked place by coordinates', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });

    const search = screen.getByRole('combobox');
    await user.clear(search);
    await user.type(search, 'Hamilton');
    await user.keyboard('{Enter}');

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getAllByRole('option')).toHaveLength(3);
    await user.click(within(listbox).getAllByRole('option')[1]);

    expect(await screen.findByText('Ontario, Canada')).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('q=43.2501%2C%20-79.8496'),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(JSON.parse(localStorage.getItem('weather.savedPlaces.v1'))[0].name)
      .toBe('Hamilton, Ontario, Canada');
  });

  it('loads a single match without opening the dropdown', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });

    const search = screen.getByRole('combobox');
    await user.clear(search);
    await user.type(search, 'Wellington');
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Wellington' })).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('q=-41.2900%2C%20174.7800'),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('shows no-match feedback without clearing the previous forecast', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });

    const search = screen.getByRole('combobox');
    await user.clear(search);
    await user.type(search, 'asdfghjkl');
    await user.keyboard('{Enter}');

    expect(await screen.findByText(
      'No places found for "asdfghjkl". Try a different spelling or coordinates.'
    )).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hamilton' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/forecast?q=asdfghjkl'),
      expect.anything()
    );
  });

  it('skips the locations lookup for coordinate searches', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });

    const search = screen.getByRole('combobox');
    await user.clear(search);
    await user.type(search, '-37.78, 175.28');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('q=-37.78%2C%20175.28'),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    ));
    expect(fetch.mock.calls.some(([url]) => String(url).includes('/api/locations'))).toBe(false);
  });

  it('shows a reverse-geocoded name for typed coordinate searches', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });

    fetch.mockResolvedValueOnce(jsonResponse({
      ...forecast,
      location: { name: 'Hamilton, Waikato, New Zealand', lat: -37.78, lng: 175.28 }
    }));
    const search = screen.getByRole('combobox');
    await user.clear(search);
    await user.type(search, '-37.78, 175.28');
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Hamilton' })).toBeInTheDocument();
    expect(screen.getByText('Waikato, New Zealand')).toBeInTheDocument();
  });

  it('shows Unnamed location when typed coordinates have no reverse-geocoded name', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });

    fetch.mockResolvedValueOnce(jsonResponse({
      ...forecast,
      location: { name: '20.0, 90.0', lat: 20, lng: 90 }
    }));
    const search = screen.getByRole('combobox');
    await user.clear(search);
    await user.type(search, '20, 90');
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Unnamed location' })).toBeInTheDocument();
  });

  it('keeps Your location for a coordinate-only current-location response', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success) => success({
          coords: { latitude: -37.78, longitude: 175.28 }
        })
      }
    });
    fetch.mockResolvedValueOnce(jsonResponse({
      ...forecast,
      location: { name: '-37.78, 175.28', lat: -37.78, lng: 175.28 }
    }));
    await user.click(screen.getByRole('button', { name: 'Use my current location' }));

    expect(await screen.findByRole('heading', { name: 'Your location' })).toBeInTheDocument();
  });

  it('supports ArrowDown and Enter to select, and Escape to close', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Hamilton' });

    const search = screen.getByRole('combobox');
    await user.clear(search);
    await user.type(search, 'Hamilton');
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(await screen.findByText('Ontario, Canada')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
