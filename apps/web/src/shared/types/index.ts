/** 장소 데이터 */
export interface Place {
  id: string;
  placeId: string; // Google Place ID
  name: string;
  address: string;
  lat: number;
  lng: number;
  notes: string;
  canvasPos: {
    x: number;
    y: number;
  };
}

/** 지도 모드 */
export type MapMode = 'expanded' | 'peek' | 'collapsed';

/** UI 상태 */
export interface BoardUI {
  mapMode: MapMode;
  canvasViewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

/** 보드 전체 상태 */
export interface Board {
  placesById: Record<string, Place>;
  routeOrder: string[]; // Place id 배열 (순서 기준)
  ui: BoardUI;
}

/** 좌표 */
export interface LatLng {
  lat: number;
  lng: number;
}

/** 캔버스 좌표 */
export interface CanvasPosition {
  x: number;
  y: number;
}

/** TourAPI 관광지 데이터 */
export interface TourSpot {
  contentId: string;
  contentTypeId: string;
  title: string;
  addr1: string;
  addr2?: string;
  mapx: number; // longitude
  mapy: number; // latitude
  firstimage?: string;
  firstimage2?: string;
  tel?: string;
  overview?: string;
}

/** 이동수단 타입 */
export type TransportMode = 'walk' | 'public' | 'car' | 'longDistance';

/** 이동 구간 정보 */
export interface TransportLeg {
  fromId: string;
  toId: string;
  distanceKm: number;
  estimatedMinutes: number;
  mode: TransportMode;
}

/** 일정 아이템 (장소 방문 또는 이동) */
export interface ItineraryItem {
  type: 'visit' | 'transport';
  placeId?: string;
  placeName?: string;
  transport?: TransportLeg;
  order: number;
}

/** 여행 일정 */
export interface Itinerary {
  id: string;
  day: number;
  items: ItineraryItem[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
}
