import type { Itinerary, ItineraryItem } from '@/shared/types';
import { usePlaces } from '@/store/useBoardStore';

interface ItineraryPanelProps {
  itinerary: Itinerary;
  onClose: () => void;
}

const TRANSPORT_MODE_LABELS: Record<string, string> = {
  walk: '도보',
  public: '대중교통',
  car: '자동차',
  longDistance: '장거리 이동',
};

const TRANSPORT_MODE_ICONS: Record<string, string> = {
  walk: '🚶',
  public: '🚌',
  car: '🚗',
  longDistance: '✈️',
};

function ItineraryPanel({ itinerary, onClose }: ItineraryPanelProps) {
  const placesById = usePlaces();

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}분`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
  };

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  const renderItem = (item: ItineraryItem) => {
    if (item.type === 'visit' && item.placeId) {
      const place = placesById[item.placeId];
      if (!place) return null;

      return (
        <div key={`visit-${item.order}`} className="itinerary-item itinerary-item--visit">
          <div className="itinerary-item__badge">{Math.floor(item.order / 2) + 1}</div>
          <div className="itinerary-item__content">
            <div className="itinerary-item__name">{place.name}</div>
            <div className="itinerary-item__address">{place.address}</div>
            {place.notes && (
              <div className="itinerary-item__notes">{place.notes}</div>
            )}
          </div>
        </div>
      );
    }

    if (item.type === 'transport' && item.transport) {
      const { transport } = item;
      const modeLabel = TRANSPORT_MODE_LABELS[transport.mode] || transport.mode;
      const modeIcon = TRANSPORT_MODE_ICONS[transport.mode] || '🚗';

      return (
        <div key={`transport-${item.order}`} className="itinerary-item itinerary-item--transport">
          <div className="itinerary-transport">
            <span className="itinerary-transport__icon">{modeIcon}</span>
            <span className="itinerary-transport__mode">{modeLabel}</span>
            <span className="itinerary-transport__distance">
              {formatDistance(transport.distanceKm)}
            </span>
            <span className="itinerary-transport__duration">
              {formatDuration(transport.estimatedMinutes)}
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="itinerary-panel">
      <div className="itinerary-panel__header">
        <h3>여행 일정</h3>
        <button className="itinerary-panel__close" onClick={onClose}>
          &times;
        </button>
      </div>

      <div className="itinerary-panel__summary">
        <div className="itinerary-summary__item">
          <span className="itinerary-summary__label">총 거리</span>
          <span className="itinerary-summary__value">
            {formatDistance(itinerary.totalDistanceKm)}
          </span>
        </div>
        <div className="itinerary-summary__item">
          <span className="itinerary-summary__label">예상 시간</span>
          <span className="itinerary-summary__value">
            {formatDuration(itinerary.totalDurationMinutes)}
          </span>
        </div>
      </div>

      <div className="itinerary-panel__content">
        {itinerary.items.map(renderItem)}
      </div>
    </div>
  );
}

export default ItineraryPanel;
