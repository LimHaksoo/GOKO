import { describe, it, expect } from 'vitest';
import {
  estimateTransportMode,
  estimateTravelTime,
  createTransportLeg,
  createTransportLegs,
} from './transportEstimator';

describe('estimateTransportMode', () => {
  it('returns walk for short distances (< 1.5km)', () => {
    expect(estimateTransportMode(0.5)).toBe('walk');
    expect(estimateTransportMode(1.0)).toBe('walk');
    expect(estimateTransportMode(1.5)).toBe('walk');
  });

  it('returns public for medium distances (1.5 - 10km)', () => {
    expect(estimateTransportMode(2)).toBe('public');
    expect(estimateTransportMode(5)).toBe('public');
    expect(estimateTransportMode(10)).toBe('public');
  });

  it('returns car for longer distances (10 - 50km)', () => {
    expect(estimateTransportMode(15)).toBe('car');
    expect(estimateTransportMode(30)).toBe('car');
    expect(estimateTransportMode(50)).toBe('car');
  });

  it('returns longDistance for very long distances (> 50km)', () => {
    expect(estimateTransportMode(51)).toBe('longDistance');
    expect(estimateTransportMode(100)).toBe('longDistance');
    expect(estimateTransportMode(300)).toBe('longDistance');
  });
});

describe('estimateTravelTime', () => {
  it('calculates walk time (4km/h)', () => {
    // 1km at 4km/h = 15 minutes
    expect(estimateTravelTime(1, 'walk')).toBe(15);
  });

  it('calculates public transport time (25km/h)', () => {
    // 5km at 25km/h = 12 minutes
    expect(estimateTravelTime(5, 'public')).toBe(12);
  });

  it('calculates car time (40km/h)', () => {
    // 20km at 40km/h = 30 minutes
    expect(estimateTravelTime(20, 'car')).toBe(30);
  });

  it('calculates long distance time (80km/h)', () => {
    // 160km at 80km/h = 120 minutes
    expect(estimateTravelTime(160, 'longDistance')).toBe(120);
  });
});

describe('createTransportLeg', () => {
  it('creates a transport leg with correct properties', () => {
    const from = { id: 'a', lat: 37.5665, lng: 126.978 };
    const to = { id: 'b', lat: 37.57, lng: 126.98 };

    const leg = createTransportLeg(from, to);

    expect(leg.fromId).toBe('a');
    expect(leg.toId).toBe('b');
    expect(leg.distanceKm).toBeGreaterThan(0);
    expect(leg.estimatedMinutes).toBeGreaterThan(0);
    expect(['walk', 'public', 'car', 'longDistance']).toContain(leg.mode);
  });

  it('estimates walk for nearby locations', () => {
    // 약 0.5km 거리
    const from = { id: 'a', lat: 37.5665, lng: 126.978 };
    const to = { id: 'b', lat: 37.570, lng: 126.978 };

    const leg = createTransportLeg(from, to);

    expect(leg.mode).toBe('walk');
  });
});

describe('createTransportLegs', () => {
  it('returns empty array for less than 2 places', () => {
    expect(createTransportLegs([])).toEqual([]);
    expect(createTransportLegs([{ id: 'a', lat: 37.5, lng: 127.0 }])).toEqual([]);
  });

  it('creates legs for each consecutive pair', () => {
    const places = [
      { id: 'a', lat: 37.5, lng: 127.0 },
      { id: 'b', lat: 37.6, lng: 127.0 },
      { id: 'c', lat: 37.7, lng: 127.0 },
    ];

    const legs = createTransportLegs(places);

    expect(legs).toHaveLength(2);
    expect(legs[0].fromId).toBe('a');
    expect(legs[0].toId).toBe('b');
    expect(legs[1].fromId).toBe('b');
    expect(legs[1].toId).toBe('c');
  });
});
