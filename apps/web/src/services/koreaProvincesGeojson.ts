import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';

const KOREA_PROVINCES_GEOJSON_URL =
  'https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_provinces_geo_simple.json';

let cachedGeoJSON: FeatureCollection<Polygon | MultiPolygon> | null = null;

/**
 * 대한민국 시도 경계 GeoJSON 가져오기 (캐시)
 */
export async function fetchProvincesGeoJSON(): Promise<FeatureCollection<Polygon | MultiPolygon>> {
  if (cachedGeoJSON) return cachedGeoJSON;

  const response = await fetch(KOREA_PROVINCES_GEOJSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch provinces GeoJSON: ${response.status}`);
  }

  cachedGeoJSON = (await response.json()) as FeatureCollection<Polygon | MultiPolygon>;
  return cachedGeoJSON;
}

/**
 * 캐시된 GeoJSON 가져오기 (없으면 null)
 */
export function getCachedProvincesGeoJSON(): FeatureCollection<Polygon | MultiPolygon> | null {
  return cachedGeoJSON;
}
