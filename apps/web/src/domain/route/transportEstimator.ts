import type { TransportMode, TransportLeg } from '@/shared/types';
import { haversineKm } from './haversine';

/**
 * 이동수단별 평균 속도 (km/h)
 */
const SPEED_BY_MODE: Record<TransportMode, number> = {
  walk: 4, // 도보 4km/h
  public: 25, // 대중교통 평균 25km/h (대기시간 포함)
  car: 40, // 도심 자동차 40km/h
  longDistance: 80, // 고속도로/KTX 등 평균 80km/h
};

/**
 * 거리 기준 이동수단 결정 (km)
 */
const DISTANCE_THRESHOLDS = {
  walk: 1.5, // 1.5km 이하: 도보
  public: 10, // 10km 이하: 대중교통
  car: 50, // 50km 이하: 자동차
  // 50km 초과: 장거리
};

/**
 * 거리 기반 이동수단 추정
 */
export function estimateTransportMode(distanceKm: number): TransportMode {
  if (distanceKm <= DISTANCE_THRESHOLDS.walk) {
    return 'walk';
  }
  if (distanceKm <= DISTANCE_THRESHOLDS.public) {
    return 'public';
  }
  if (distanceKm <= DISTANCE_THRESHOLDS.car) {
    return 'car';
  }
  return 'longDistance';
}

/**
 * 이동 시간 추정 (분)
 */
export function estimateTravelTime(distanceKm: number, mode: TransportMode): number {
  const speedKmh = SPEED_BY_MODE[mode];
  const hours = distanceKm / speedKmh;
  return hours * 60;
}

/**
 * 두 좌표 간의 이동 구간 정보 생성
 */
export function createTransportLeg(
  from: { id: string; lat: number; lng: number },
  to: { id: string; lat: number; lng: number }
): TransportLeg {
  const distanceKm = haversineKm(from, to);
  const mode = estimateTransportMode(distanceKm);
  const estimatedMinutes = estimateTravelTime(distanceKm, mode);

  return {
    fromId: from.id,
    toId: to.id,
    distanceKm,
    estimatedMinutes,
    mode,
  };
}

/**
 * 경로 전체의 이동 구간 배열 생성
 */
export function createTransportLegs(
  places: { id: string; lat: number; lng: number }[]
): TransportLeg[] {
  if (places.length < 2) return [];

  const legs: TransportLeg[] = [];
  for (let i = 0; i < places.length - 1; i++) {
    legs.push(createTransportLeg(places[i], places[i + 1]));
  }
  return legs;
}
