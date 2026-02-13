import { create } from 'zustand';
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';

interface ProvinceState {
  provincesGeo: FeatureCollection<Polygon | MultiPolygon> | null;
  provinceDensity: Record<string, number>;
  selectedProvince: string | null;
  selectedFeature: Feature<Polygon | MultiPolygon> | null;
  isLoading: boolean;
  error: string | null;
}

interface ProvinceActions {
  setProvincesGeo: (geo: FeatureCollection<Polygon | MultiPolygon>) => void;
  setProvinceDensity: (density: Record<string, number>) => void;
  selectProvince: (name: string | null, feature?: Feature<Polygon | MultiPolygon> | null) => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type ProvinceStore = ProvinceState & ProvinceActions;

export const useProvinceStore = create<ProvinceStore>((set) => ({
  provincesGeo: null,
  provinceDensity: {},
  selectedProvince: null,
  selectedFeature: null,
  isLoading: false,
  error: null,

  setProvincesGeo: (geo) => set({ provincesGeo: geo }),

  setProvinceDensity: (density) => set({ provinceDensity: density }),

  selectProvince: (name, feature = null) =>
    set({
      selectedProvince: name,
      selectedFeature: feature,
    }),

  clearSelection: () =>
    set({
      selectedProvince: null,
      selectedFeature: null,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),
}));

// Selectors
export const useSelectedProvince = () => useProvinceStore((state) => state.selectedProvince);
export const useProvinceDensity = () => useProvinceStore((state) => state.provinceDensity);
