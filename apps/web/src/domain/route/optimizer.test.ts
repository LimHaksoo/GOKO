import { describe, it, expect } from 'vitest';
import { optimizeRoute, calculateRouteDistance } from './optimizer';
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

describe('optimizeRoute', () => {
  it('returns empty array for empty input', () => {
    expect(optimizeRoute([])).toEqual([]);
  });

  it('returns single place unchanged', () => {
    const places = [createPlace('1', 37.5, 127.0)];
    expect(optimizeRoute(places)).toEqual(['1']);
  });

  it('optimizes route for multiple places', () => {
    // 서울 -> 대전 -> 부산 순서가 되어야 함 (북쪽에서 남쪽으로)
    const places = [
      createPlace('busan', 35.1796, 129.0756), // 부산 (남쪽)
      createPlace('seoul', 37.5665, 126.978), // 서울 (북쪽)
      createPlace('daejeon', 36.3504, 127.3845), // 대전 (중간)
    ];

    const result = optimizeRoute(places);

    // 가장 북쪽(서울)에서 시작
    expect(result[0]).toBe('seoul');
    // 그 다음 가까운 곳(대전)
    expect(result[1]).toBe('daejeon');
    // 마지막 부산
    expect(result[2]).toBe('busan');
  });

  it('handles places in a line', () => {
    const places = [
      createPlace('a', 37.0, 127.0),
      createPlace('b', 37.1, 127.0),
      createPlace('c', 37.2, 127.0),
      createPlace('d', 37.3, 127.0),
    ];

    const result = optimizeRoute(places);

    // 가장 북쪽(d)에서 시작해서 남쪽으로
    expect(result).toEqual(['d', 'c', 'b', 'a']);
  });
});

describe('calculateRouteDistance', () => {
  it('returns 0 for empty array', () => {
    expect(calculateRouteDistance([])).toBe(0);
  });

  it('returns 0 for single place', () => {
    const places = [createPlace('1', 37.5, 127.0)];
    expect(calculateRouteDistance(places)).toBe(0);
  });

  it('calculates total distance correctly', () => {
    // 서울 -> 부산 약 325km
    const places = [
      createPlace('seoul', 37.5665, 126.978),
      createPlace('busan', 35.1796, 129.0756),
    ];

    const distance = calculateRouteDistance(places);

    // 대략 325km (허용 오차 ±20km)
    expect(distance).toBeGreaterThan(305);
    expect(distance).toBeLessThan(345);
  });
});
