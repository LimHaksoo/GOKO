import { create } from 'zustand';
import type { TourSpot } from '@/shared/types';
import { fetchTourSpots, getAreaCode, isTourApiConfigured } from '@/services/tourApi';

interface TourApiState {
  tourSpots: TourSpot[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  lastFetchedProvince: string | null;
}

interface TourApiActions {
  fetchByProvince: (provinceName: string) => Promise<void>;
  clearSpots: () => void;
  reset: () => void;
}

type TourApiStore = TourApiState & TourApiActions;

const initialState: TourApiState = {
  tourSpots: [],
  isLoading: false,
  error: null,
  totalCount: 0,
  lastFetchedProvince: null,
};

export const useTourApiStore = create<TourApiStore>((set, get) => ({
  ...initialState,

  fetchByProvince: async (provinceName: string) => {
    // 이미 같은 지역을 조회 중이거나 조회한 경우 스킵
    if (get().lastFetchedProvince === provinceName && get().tourSpots.length > 0) {
      return;
    }

    if (!isTourApiConfigured()) {
      set({
        error: 'TourAPI 서비스 키가 설정되지 않았습니다. .env 파일을 확인하세요.',
        isLoading: false,
      });
      return;
    }

    const areaCode = getAreaCode(provinceName);
    if (!areaCode) {
      set({
        error: `지역 코드를 찾을 수 없습니다: ${provinceName}`,
        isLoading: false,
      });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { spots, totalCount } = await fetchTourSpots({
        areaCode,
        numOfRows: 30, // 최대 30개 로드
      });

      set({
        tourSpots: spots,
        totalCount,
        isLoading: false,
        lastFetchedProvince: provinceName,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '명소 조회 중 오류가 발생했습니다.',
        isLoading: false,
        tourSpots: [],
        totalCount: 0,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  clearSpots: () => {
    set({
      tourSpots: [],
      totalCount: 0,
      lastFetchedProvince: null,
      error: null,
    });
  },

  reset: () => {
    set(initialState);
  },
}));

// Selectors
export const useTourSpots = () => useTourApiStore((state) => state.tourSpots);
export const useTourApiLoading = () => useTourApiStore((state) => state.isLoading);
export const useTourApiError = () => useTourApiStore((state) => state.error);
