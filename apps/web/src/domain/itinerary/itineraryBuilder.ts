import { nanoid } from 'nanoid';
import type { Place, Itinerary, ItineraryItem } from '@/shared/types';
import { createTransportLegs } from '../route/transportEstimator';
import { calculateRouteDistance } from '../route/optimizer';

/**
 * 장소 목록으로부터 여행 일정 생성
 *
 * @param places - 방문 순서대로 정렬된 장소 배열
 * @param day - 일차 (1부터 시작)
 * @returns 생성된 일정
 */
export function buildItinerary(places: Place[], day: number = 1): Itinerary {
  if (places.length === 0) {
    return {
      id: nanoid(),
      day,
      items: [],
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
    };
  }

  const transportLegs = createTransportLegs(places);
  const items: ItineraryItem[] = [];
  let order = 0;

  // 방문/이동을 교차로 배치
  for (let i = 0; i < places.length; i++) {
    // 방문 아이템
    items.push({
      type: 'visit',
      placeId: places[i].id,
      placeName: places[i].name,
      order: order++,
    });

    // 이동 아이템 (마지막 장소 제외)
    if (i < transportLegs.length) {
      items.push({
        type: 'transport',
        transport: transportLegs[i],
        order: order++,
      });
    }
  }

  // 총 거리 및 시간 계산
  const totalDistanceKm = calculateRouteDistance(places);
  const totalDurationMinutes = transportLegs.reduce(
    (sum, leg) => sum + leg.estimatedMinutes,
    0
  );

  return {
    id: nanoid(),
    day,
    items,
    totalDistanceKm,
    totalDurationMinutes,
  };
}

/**
 * 여러 일차 일정 생성 (장소를 일자별로 분배)
 *
 * @param places - 전체 장소 배열
 * @param placesPerDay - 하루 최대 방문 장소 수
 * @returns 일차별 일정 배열
 */
export function buildMultiDayItinerary(
  places: Place[],
  placesPerDay: number = 5
): Itinerary[] {
  const itineraries: Itinerary[] = [];
  const totalDays = Math.ceil(places.length / placesPerDay);

  for (let day = 1; day <= totalDays; day++) {
    const startIndex = (day - 1) * placesPerDay;
    const dayPlaces = places.slice(startIndex, startIndex + placesPerDay);
    itineraries.push(buildItinerary(dayPlaces, day));
  }

  return itineraries;
}
