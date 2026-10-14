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

describe('App forecast flow', () => {
  beforeEach(() => {
    setGeolocationDenied();
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const query = new URL(url).searchParams.get('q');
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

    expect(await screen.findByRole('heading', { name: 'Hamilton' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=Hamilton'),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(screen.getAllByRole('button', { name: /chance of rain/ })).toHaveLength(7);
  });

  it('searches for Wellington and renders its response', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: 'Hamilton' });
    const search = screen.getByRole('searchbox');
    await user.clear(search);
    await user.type(search, 'Wellington');
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Wellington' })).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('q=Wellington'),
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
    const search = screen.getByRole('searchbox');
    await user.clear(search);
    await user.type(search, 'asdfghjkl');
    await user.keyboard('{Enter}');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText("We couldn't find that place.")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hamilton' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hamilton' })).toBeInTheDocument();
  });
});
