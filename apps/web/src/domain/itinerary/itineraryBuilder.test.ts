import { describe, it, expect } from 'vitest';
import { buildItinerary, buildMultiDayItinerary } from './itineraryBuilder';
import type { Place } from '@/shared/types';

const createPlace = (id: string, lat: number, lng: number): Place => ({
  id,
  placeId: `place-${id}`,
  name: `장소 ${id}`,
  address: `주소 ${id}`,
  lat,
  lng,
  notes: '',
  canvasPos: { x: 0, y: 0 },
});

describe('buildItinerary', () => {
  it('returns empty itinerary for empty places', () => {
    const itinerary = buildItinerary([]);

    expect(itinerary.items).toHaveLength(0);
    expect(itinerary.totalDistanceKm).toBe(0);
    expect(itinerary.totalDurationMinutes).toBe(0);
    expect(itinerary.day).toBe(1);
  });

  it('creates itinerary with single place', () => {
    const places = [createPlace('a', 37.5, 127.0)];
    const itinerary = buildItinerary(places);

    expect(itinerary.items).toHaveLength(1);
    expect(itinerary.items[0].type).toBe('visit');
    expect(itinerary.items[0].placeId).toBe('a');
    expect(itinerary.totalDistanceKm).toBe(0);
  });

  it('creates itinerary with visit and transport items alternating', () => {
    const places = [
      createPlace('a', 37.5, 127.0),
      createPlace('b', 37.6, 127.0),
      createPlace('c', 37.7, 127.0),
    ];

    const itinerary = buildItinerary(places);

    // 방문 3개 + 이동 2개 = 5개
    expect(itinerary.items).toHaveLength(5);

    // 순서 확인: 방문 -> 이동 -> 방문 -> 이동 -> 방문
    expect(itinerary.items[0].type).toBe('visit');
    expect(itinerary.items[0].placeId).toBe('a');

    expect(itinerary.items[1].type).toBe('transport');
    expect(itinerary.items[1].transport).toBeDefined();

    expect(itinerary.items[2].type).toBe('visit');
    expect(itinerary.items[2].placeId).toBe('b');

    expect(itinerary.items[3].type).toBe('transport');

    expect(itinerary.items[4].type).toBe('visit');
    expect(itinerary.items[4].placeId).toBe('c');
  });

  it('calculates total distance and duration', () => {
    const places = [
      createPlace('seoul', 37.5665, 126.978),
      createPlace('suwon', 37.2636, 127.0286), // 약 35km 거리
    ];

    const itinerary = buildItinerary(places);

    expect(itinerary.totalDistanceKm).toBeGreaterThan(30);
    expect(itinerary.totalDistanceKm).toBeLessThan(50);
    expect(itinerary.totalDurationMinutes).toBeGreaterThan(0);
  });

  it('uses provided day number', () => {
    const places = [createPlace('a', 37.5, 127.0)];
    const itinerary = buildItinerary(places, 3);

    expect(itinerary.day).toBe(3);
  });
});

describe('buildMultiDayItinerary', () => {
  it('splits places into multiple days', () => {
    const places = Array.from({ length: 12 }, (_, i) =>
      createPlace(`place-${i}`, 37.5 + i * 0.01, 127.0)
    );

    // 하루 5개씩 = 3일
    const itineraries = buildMultiDayItinerary(places, 5);

    expect(itineraries).toHaveLength(3);
    expect(itineraries[0].day).toBe(1);
    expect(itineraries[1].day).toBe(2);
    expect(itineraries[2].day).toBe(3);
  });

  it('handles exact division', () => {
    const places = Array.from({ length: 10 }, (_, i) =>
      createPlace(`place-${i}`, 37.5 + i * 0.01, 127.0)
    );

    const itineraries = buildMultiDayItinerary(places, 5);

    expect(itineraries).toHaveLength(2);
  });

  it('handles fewer places than placesPerDay', () => {
    const places = [
      createPlace('a', 37.5, 127.0),
      createPlace('b', 37.6, 127.0),
    ];

    const itineraries = buildMultiDayItinerary(places, 5);

    expect(itineraries).toHaveLength(1);
    expect(itineraries[0].day).toBe(1);
  });
});
