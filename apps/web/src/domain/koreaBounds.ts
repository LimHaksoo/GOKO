/**
 * 대한민국 경계 상수 및 유틸리티
 */

export const SK_BOUNDS = {
  south: 33.0,
  west: 124.5,
  north: 38.9,
  east: 131.2,
} as const;

/**
 * 좌표가 대한민국 경계 내에 있는지 확인
 */
export function isWithinKorea(lat: number, lng: number): boolean {
  return (
    lat >= SK_BOUNDS.south &&
    lat <= SK_BOUNDS.north &&
    lng >= SK_BOUNDS.west &&
    lng <= SK_BOUNDS.east
  );
}

/**
 * Google Maps LatLngBounds 형식으로 변환
 */
export function getKoreaBoundsForGoogleMaps(): google.maps.LatLngBoundsLiteral {
  return {
    south: SK_BOUNDS.south,
    west: SK_BOUNDS.west,
    north: SK_BOUNDS.north,
    east: SK_BOUNDS.east,
  };
}

/**
 * 대한민국 중심 좌표 (대략)
 */
export const KOREA_CENTER = {
  lat: 36.3,
  lng: 127.8,
} as const;
