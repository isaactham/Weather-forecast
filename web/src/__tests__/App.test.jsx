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
    setGeolocationDenied();
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const requestUrl = new URL(url);
      const query = requestUrl.searchParams.get('q');
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
