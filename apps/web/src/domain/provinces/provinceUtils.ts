import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

/**
 * GeoJSON feature의 속성에서 시도 이름 추출
 */
export function getProvinceName(props: Record<string, unknown> = {}): string {
  return (
    (props.name as string) ||
    (props.NAME_1 as string) ||
    (props.NAME as string) ||
    (props.NAME_EN as string) ||
    (props.CTP_ENG_NM as string) ||
    (props.CTP_KOR_NM as string) ||
    (props.sido as string) ||
    (props.sigungu as string) ||
    'Unknown'
  );
}

/**
 * 밀도 값(0~100)에 따른 choropleth 색상 반환
 */
export function getChoroColor(v: number): string {
  if (v >= 80) return '#b91c1c'; // red-700
  if (v >= 60) return '#ef4444'; // red-500
  if (v >= 40) return '#f59e0b'; // amber-500
  if (v >= 20) return '#fbbf24'; // amber-400
  if (v > 0) return '#34d399'; // emerald-400
  return '#e2e8f0'; // slate-200
}

/**
 * 밀도 범례 구간
 */
export const DENSITY_GRADES = [0, 20, 40, 60, 80] as const;

export interface PointWithWeight {
  lat: number;
  lng: number;
  weight?: number;
}

/**
 * 시도별 밀도 계산
 * @param provincesGeo - 시도 경계 GeoJSON FeatureCollection
 * @param points - 좌표 배열 (lat, lng, weight)
 * @returns 시도 이름별 밀도 값 (0~100)
 */
export function computeProvinceDensity(
  provincesGeo: FeatureCollection<Polygon | MultiPolygon>,
  points: PointWithWeight[]
): Record<string, number> {
  if (!provincesGeo?.features?.length) return {};

  // 시도별 가중치 합계 초기화
  const sums: Record<string, number> = {};
  provincesGeo.features.forEach((f) => {
    const name = getProvinceName((f.properties || {}) as Record<string, unknown>);
    sums[name] = 0;
  });

  // 각 포인트가 속한 시도에 가중치 더하기
  points.forEach((p) => {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;

    const pt = point([p.lng, p.lat]);
    for (const f of provincesGeo.features) {
      if (booleanPointInPolygon(pt, f as Feature<Polygon | MultiPolygon>)) {
        const name = getProvinceName((f.properties || {}) as Record<string, unknown>);
        sums[name] = (sums[name] || 0) + (p.weight ?? 1);
        break;
      }
    }
  });

  // 최대값 기준 정규화 (0~100)
  const maxSum = Math.max(0, ...Object.values(sums));
  const result: Record<string, number> = {};

  for (const [name, sum] of Object.entries(sums)) {
    result[name] = maxSum > 0 ? Math.round((sum / maxSum) * 100) : 0;
  }

  return result;
}

/**
 * 선택된 시도 폴리곤 내의 포인트만 필터링
 */
export function filterPointsInProvince<T extends PointWithWeight>(
  points: T[],
  provinceFeature: Feature<Polygon | MultiPolygon>
): T[] {
  return points.filter((p) => {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
    const pt = point([p.lng, p.lat]);
    return booleanPointInPolygon(pt, provinceFeature);
  });
}
