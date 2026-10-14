const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function getJson(url, signal) {
  let response;

  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error("Can't reach the weather server. Is the backend running?");
  }

  // fetch() resolves for HTTP errors too, so check response.ok explicitly.
  if (!response.ok) {
    let body = {};

    try {
      body = await response.json();
    } catch {
      // Keep the status-based message when the error response is not JSON.
    }

    const fallbackMessages = {
      404: "We couldn't find that place. Try a city name or coordinates.",
      502: 'The weather service is unavailable right now. Please try again shortly.'
    };
    const message = body?.detail || fallbackMessages[response.status] || `Something went wrong (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export function fetchForecast(query, signal) {
  return getJson(`${API_URL}/api/forecast?q=${encodeURIComponent(query)}`, signal);
}

export function searchLocations(query, signal) {
  return getJson(`${API_URL}/api/locations?q=${encodeURIComponent(query)}`, signal);
}

export function fetchCurrentMany(coordsList, signal) {
  const params = new URLSearchParams();
  coordsList.forEach(({ lat, lng }) => {
    params.append('lat', lat);
    params.append('lng', lng);
  });
  return getJson(`${API_URL}/api/current?${params}`, signal);
}
