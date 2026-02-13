import type { Place } from '@/shared/types';
import { haversineKm } from './haversine';

/**
 * Nearest Neighbor 알고리즘을 사용한 경로 최적화
 * 시작점에서 가장 가까운 미방문 장소를 순차적으로 선택
 *
 * @param places - 최적화할 장소 배열
 * @returns 최적화된 장소 ID 순서 배열
 */
export function optimizeRoute(places: Place[]): string[] {
  if (places.length <= 1) {
    return places.map((p) => p.id);
  }

  const remaining = new Set(places.map((p) => p.id));
  const result: string[] = [];
  const placesMap = new Map(places.map((p) => [p.id, p]));

  // 첫 번째 장소: 가장 북쪽에 있는 장소 (일반적으로 여행 시작점)
  let currentId = places.reduce((northmost, p) =>
    p.lat > (placesMap.get(northmost)?.lat ?? -Infinity) ? p.id : northmost
  , places[0].id);

  result.push(currentId);
  remaining.delete(currentId);

  // Nearest Neighbor 순회
  while (remaining.size > 0) {
    const current = placesMap.get(currentId)!;
    let nearestId = '';
    let nearestDist = Infinity;

    for (const id of remaining) {
      const place = placesMap.get(id)!;
      const dist = haversineKm(current, place);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = id;
      }
    }

    result.push(nearestId);
    remaining.delete(nearestId);
    currentId = nearestId;
  }

  return result;
}

/**
 * 주어진 순서의 총 경로 거리 계산
 */
export function calculateRouteDistance(places: Place[]): number {
  if (places.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < places.length - 1; i++) {
    total += haversineKm(places[i], places[i + 1]);
  }
  return total;
}
