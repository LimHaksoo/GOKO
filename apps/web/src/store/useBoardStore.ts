import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Place, Board, MapMode, CanvasPosition } from '@/shared/types';

interface BoardActions {
  // Place 관리
  addPlace: (place: Omit<Place, 'id' | 'canvasPos' | 'notes'>) => void;
  removePlace: (id: string) => void;
  updatePlaceNotes: (id: string, notes: string) => void;
  movePlace: (id: string, canvasPos: CanvasPosition) => void;
  importPlaces: (places: Omit<Place, 'id' | 'canvasPos' | 'notes'>[]) => void;
  clearPlaces: () => void;

  // Route 관리
  reorderRoute: (newOrder: string[]) => void;

  // UI
  setMapMode: (mode: MapMode) => void;
  toggleMapMode: () => void;
  setCanvasViewport: (viewport: { x: number; y: number; zoom: number }) => void;

  // 초기화
  reset: () => void;
}

type BoardStore = Board & BoardActions;

// 초기 상태 (Mock 데이터 포함)
const initialState: Board = {
  placesById: {
    place1: {
      id: 'place1',
      placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      name: '경복궁',
      address: '서울 종로구 사직로 161',
      lat: 37.5796,
      lng: 126.977,
      notes: '',
      canvasPos: { x: 100, y: 100 },
    },
    place2: {
      id: 'place2',
      placeId: 'ChIJ0YyfLhyifDURuQ1M9lO2wK8',
      name: '남산타워',
      address: '서울 용산구 남산공원길 105',
      lat: 37.5512,
      lng: 126.9882,
      notes: '',
      canvasPos: { x: 350, y: 150 },
    },
    place3: {
      id: 'place3',
      placeId: 'ChIJE8o5uMKjfDURVZ5FKg2nohk',
      name: '명동성당',
      address: '서울 중구 명동길 74',
      lat: 37.5633,
      lng: 126.9873,
      notes: '',
      canvasPos: { x: 200, y: 300 },
    },
  },
  routeOrder: ['place1', 'place2', 'place3'],
  ui: {
    mapMode: 'expanded',
    canvasViewport: { x: 0, y: 0, zoom: 1 },
  },
};

// 다음 카드 위치 계산 (기존 카드들 기준 오프셋)
function getNextCanvasPos(placesById: Record<string, Place>): CanvasPosition {
  const places = Object.values(placesById);
  if (places.length === 0) {
    return { x: 100, y: 100 };
  }
  const maxX = Math.max(...places.map((p) => p.canvasPos.x));
  const avgY = places.reduce((sum, p) => sum + p.canvasPos.y, 0) / places.length;
  return { x: maxX + 250, y: avgY };
}

export const useBoardStore = create<BoardStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addPlace: (placeData) => {
        const id = nanoid();
        const canvasPos = getNextCanvasPos(get().placesById);
        const place: Place = {
          ...placeData,
          id,
          notes: '',
          canvasPos,
        };

        set((state) => ({
          placesById: { ...state.placesById, [id]: place },
          routeOrder: [...state.routeOrder, id],
        }));
      },

      removePlace: (id) => {
        set((state) => {
          const newPlacesById = { ...state.placesById };
          delete newPlacesById[id];
          return {
            placesById: newPlacesById,
            routeOrder: state.routeOrder.filter((pid) => pid !== id),
          };
        });
      },

      importPlaces: (placesData) => {
        const newPlacesById: Record<string, Place> = {};
        const newRouteOrder: string[] = [];

        // 그리드 레이아웃으로 캔버스 위치 계산
        const COLS = 4;
        const GAP_X = 280;
        const GAP_Y = 200;
        const START_X = 100;
        const START_Y = 100;

        placesData.forEach((placeData, index) => {
          const id = nanoid();
          const col = index % COLS;
          const row = Math.floor(index / COLS);
          const canvasPos = {
            x: START_X + col * GAP_X,
            y: START_Y + row * GAP_Y,
          };

          newPlacesById[id] = {
            ...placeData,
            id,
            notes: '',
            canvasPos,
          };
          newRouteOrder.push(id);
        });

        set({
          placesById: newPlacesById,
          routeOrder: newRouteOrder,
        });
      },

      clearPlaces: () => {
        set({
          placesById: {},
          routeOrder: [],
        });
      },

      updatePlaceNotes: (id, notes) => {
        set((state) => ({
          placesById: {
            ...state.placesById,
            [id]: { ...state.placesById[id], notes },
          },
        }));
      },

      movePlace: (id, canvasPos) => {
        set((state) => ({
          placesById: {
            ...state.placesById,
            [id]: { ...state.placesById[id], canvasPos },
          },
        }));
      },

      reorderRoute: (newOrder) => {
        set({ routeOrder: newOrder });
      },

      setMapMode: (mode) => {
        set((state) => ({
          ui: { ...state.ui, mapMode: mode },
        }));
      },

      toggleMapMode: () => {
        set((state) => {
          const modes: MapMode[] = ['expanded', 'peek', 'collapsed'];
          const currentIndex = modes.indexOf(state.ui.mapMode);
          const nextIndex = (currentIndex + 1) % modes.length;
          return {
            ui: { ...state.ui, mapMode: modes[nextIndex] },
          };
        });
      },

      setCanvasViewport: (viewport) => {
        set((state) => ({
          ui: { ...state.ui, canvasViewport: viewport },
        }));
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'goko-board-storage',
      partialize: (state) => ({
        placesById: state.placesById,
        routeOrder: state.routeOrder,
        ui: state.ui,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const usePlaces = () => useBoardStore((state) => state.placesById);
export const useRouteOrder = () => useBoardStore((state) => state.routeOrder);
export const useMapMode = () => useBoardStore((state) => state.ui.mapMode);
