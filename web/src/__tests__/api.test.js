import { beforeEach, describe, expect, it, vi } from 'vitest';
import forecast from './fixtures/forecast.json';
import { fetchForecast } from '../api.js';

describe('fetchForecast', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('encodes the query in the API URL and passes the signal', async () => {
    const signal = new AbortController().signal;
    fetch.mockResolvedValue(new Response(JSON.stringify(forecast), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    await fetchForecast('-37.78, 175.28', signal);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=-37.78%2C%20175.28'),
      { signal }
    );
  });

  it('returns the parsed forecast JSON on success', async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify(forecast), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    await expect(fetchForecast('Hamilton')).resolves.toEqual(forecast);
  });

  it('throws the backend detail and attaches a 404 status', async () => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ detail: 'Place not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }));

    await expect(fetchForecast('asdfghjkl')).rejects.toMatchObject({
      message: 'Place not found',
      status: 404
    });
  });

  it('reports a network failure with the friendly server message', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchForecast('Hamilton')).rejects.toThrow(
      "Can't reach the weather server. Is the backend running?"
    );
  });

  it('rethrows AbortError unchanged', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    fetch.mockRejectedValue(abortError);

    await expect(fetchForecast('Hamilton')).rejects.toBe(abortError);
  });
});
