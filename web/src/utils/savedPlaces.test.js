import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isSaved,
  loadSavedPlaces,
  persistSavedPlaces,
  removePlace,
  savePlace
} from './savedPlaces.js';

const STORAGE_KEY = 'weather.savedPlaces.v1';

describe('saved places storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty list when storage is empty or invalid', () => {
    expect(loadSavedPlaces()).toEqual([]);
    localStorage.setItem(STORAGE_KEY, '{invalid');
    expect(loadSavedPlaces()).toEqual([]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'Hamilton' }));
    expect(loadSavedPlaces()).toEqual([]);
  });

  it('skips entries without required name or coordinates', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { name: 'Hamilton', lat: -37.78, lng: 175.28 },
      { name: 'Missing longitude', lat: -37.78 },
      { lat: -41.29, lng: 174.78 }
    ]));

    expect(loadSavedPlaces()).toEqual([{
      id: '-37.780,175.280',
      name: 'Hamilton',
      lat: -37.78,
      lng: 175.28,
      savedAt: undefined
    }]);
  });

  it('deduplicates saved coordinates rounded to three decimals', () => {
    const initial = [];
    const saved = savePlace(initial, {
      id: 'ignored',
      name: 'Hamilton',
      lat: -37.7871,
      lng: 175.2791,
      savedAt: '2026-10-14T00:00:00Z'
    });
    const duplicate = savePlace(saved, {
      name: 'Nearby',
      lat: -37.7872,
      lng: 175.2792,
      savedAt: '2026-10-14T00:00:00Z'
    });

    expect(saved[0].id).toBe('-37.787,175.279');
    expect(duplicate).toBe(saved);
    expect(isSaved(saved, -37.7872, 175.2792)).toBe(true);
  });

  it('does not add a place after reaching the 20-place limit', () => {
    const places = Array.from({ length: 20 }, (_, index) => ({
      id: `0.000,${index}.000`,
      name: `Place ${index}`,
      lat: 0,
      lng: index,
      savedAt: ''
    }));

    expect(savePlace(places, {
      name: 'Extra',
      lat: 1,
      lng: 1,
      savedAt: ''
    })).toBe(places);
  });

  it('removes a place without mutating the original list', () => {
    const places = [
      { id: '1.000,2.000', name: 'One', lat: 1, lng: 2, savedAt: '' },
      { id: '3.000,4.000', name: 'Two', lat: 3, lng: 4, savedAt: '' }
    ];
    const remaining = removePlace(places, '1.000,2.000');

    expect(remaining).toEqual([places[1]]);
    expect(places).toHaveLength(2);
  });

  it('does not mutate the list or place when adding', () => {
    const places = [];
    const place = { name: 'Hamilton', lat: -37.78, lng: 175.28, savedAt: '' };
    const result = savePlace(places, place);

    expect(places).toEqual([]);
    expect(place).not.toHaveProperty('id');
    expect(result).not.toBe(places);
  });

  it('persists places and reloads them', () => {
    const places = savePlace([], {
      name: 'Hamilton',
      lat: -37.78,
      lng: 175.28,
      savedAt: '2026-10-14T00:00:00Z'
    });

    persistSavedPlaces(places);

    expect(loadSavedPlaces()).toEqual(places);
  });

  it('handles unavailable storage without throwing', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    expect(loadSavedPlaces()).toEqual([]);
    expect(() => persistSavedPlaces([])).not.toThrow();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});
