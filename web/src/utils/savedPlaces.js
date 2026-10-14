const STORAGE_KEY = 'weather.savedPlaces.v1';
const MAX_SAVED_PLACES = 20;

function placeId(lat, lng) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export function loadSavedPlaces() {
  try {
    const saved = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const places = JSON.parse(saved);
    if (!Array.isArray(places)) return [];

    return places
      .filter((place) => (
        place
        && typeof place.name === 'string'
        && place.name.trim()
        && Number.isFinite(place.lat)
        && Number.isFinite(place.lng)
      ))
      .map(({ name, lat, lng, savedAt }) => ({
        id: placeId(lat, lng),
        name,
        lat,
        lng,
        savedAt
      }));
  } catch {
    return [];
  }
}

export function savePlace(places, place) {
  const id = placeId(place.lat, place.lng);
  if (places.length >= MAX_SAVED_PLACES || places.some((saved) => saved.id === id)) {
    return places;
  }

  // Store only names and coordinates because weather goes stale and is fetched fresh.
  // My location is not stored here; it comes from the device each session (see D5).
  return [...places, { ...place, id }];
}

export function removePlace(places, id) {
  return places.filter((place) => place.id !== id);
}

export function isSaved(places, lat, lng) {
  const id = placeId(lat, lng);
  return places.some((place) => place.id === id);
}

export function persistSavedPlaces(places) {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch {
    // Storage may be disabled or unavailable; in-memory changes can still work.
  }
}
