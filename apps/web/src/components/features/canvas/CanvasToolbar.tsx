import { useState } from 'react';
import { useBoardStore, usePlaces, useRouteOrder } from '@/store/useBoardStore';
import { optimizeRoute } from '@/domain/route/optimizer';
import { buildItinerary } from '@/domain/itinerary/itineraryBuilder';
import ItineraryPanel from './ItineraryPanel';
import type { Itinerary } from '@/shared/types';

function CanvasToolbar() {
  const placesById = usePlaces();
  const routeOrder = useRouteOrder();
  const reorderRoute = useBoardStore((state) => state.reorderRoute);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const hasPlaces = routeOrder.length >= 2;

  const handleCreateTrip = async () => {
    if (!hasPlaces) return;

    setIsGenerating(true);

    try {
      // 현재 장소들을 좌표 배열로 변환
      const places = routeOrder
        .map((id) => placesById[id])
        .filter(Boolean);

      // 경로 최적화 (최단 거리 순)
      const optimizedOrder = optimizeRoute(places);

      // 상태 업데이트
      reorderRoute(optimizedOrder);

      // 최적화된 순서로 장소 배열 재구성
      const orderedPlaces = optimizedOrder
        .map((id) => placesById[id])
        .filter(Boolean);

      // 일정 생성
      const newItinerary = buildItinerary(orderedPlaces, 1);
      setItinerary(newItinerary);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseItinerary = () => {
    setItinerary(null);
  };

  return (
    <>
      <div className="canvas-toolbar">
        <div className="canvas-toolbar__info">
          {routeOrder.length > 0 ? (
            <span>{routeOrder.length}개 장소</span>
          ) : (
            <span>장소를 선택하세요</span>
          )}
        </div>

        <button
          className="canvas-toolbar__btn canvas-toolbar__btn--primary"
          onClick={handleCreateTrip}
          disabled={!hasPlaces || isGenerating}
        >
          {isGenerating ? '생성 중...' : '여행 만들기'}
        </button>
      </div>

      {itinerary && (
        <ItineraryPanel itinerary={itinerary} onClose={handleCloseItinerary} />
      )}
    </>
  );
}

export default CanvasToolbar;
