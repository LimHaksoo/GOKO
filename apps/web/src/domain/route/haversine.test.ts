import { describe, it, expect } from 'vitest';
import { haversineKm, totalRouteDistance } from './haversine';

describe('haversineKm', () => {
  it('동일 좌표는 거리 0', () => {
    const point = { lat: 37.5665, lng: 126.978 };
    expect(haversineKm(point, point)).toBe(0);
  });

  it('서울-부산 거리가 대략 325km (실제 약 325km)', () => {
    const seoul = { lat: 37.5665, lng: 126.978 };
    const busan = { lat: 35.1796, lng: 129.0756 };
    const distance = haversineKm(seoul, busan);

    expect(distance).toBeGreaterThan(300);
    expect(distance).toBeLessThan(350);
  });

  it('서울-도쿄 거리가 대략 1150km', () => {
    const seoul = { lat: 37.5665, lng: 126.978 };
    const tokyo = { lat: 35.6762, lng: 139.6503 };
    const distance = haversineKm(seoul, tokyo);

    expect(distance).toBeGreaterThan(1100);
    expect(distance).toBeLessThan(1200);
  });

  it('거리는 항상 양수 또는 0', () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 90, lng: 180 };
    expect(haversineKm(a, b)).toBeGreaterThanOrEqual(0);
  });
});

describe('totalRouteDistance', () => {
  it('빈 배열은 0', () => {
    expect(totalRouteDistance([])).toBe(0);
  });

  it('단일 포인트는 0', () => {
    expect(totalRouteDistance([{ lat: 37.5665, lng: 126.978 }])).toBe(0);
  });

  it('서울-대전-부산 총 거리 계산', () => {
    const seoul = { lat: 37.5665, lng: 126.978 };
    const daejeon = { lat: 36.3504, lng: 127.3845 };
    const busan = { lat: 35.1796, lng: 129.0756 };

    const total = totalRouteDistance([seoul, daejeon, busan]);
    const direct = haversineKm(seoul, busan);

    // 경유 거리가 직선 거리보다 길어야 함
    expect(total).toBeGreaterThan(direct);
  });
});
