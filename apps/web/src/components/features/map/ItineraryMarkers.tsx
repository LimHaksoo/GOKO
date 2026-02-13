import { OverlayViewF, OverlayView } from '@react-google-maps/api';
import type { Place } from '@/shared/types';

interface ItineraryMarkersProps {
  places: Place[];
}

function ItineraryMarkers({ places }: ItineraryMarkersProps) {
  return (
    <>
      {places.map((place, index) => (
        <OverlayViewF
          key={place.id}
          position={{ lat: place.lat, lng: place.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div
            className="custom-marker selected"
            style={{ width: '32px', height: '32px' }}
            title={place.name}
          >
            <span className="marker-number">{index + 1}</span>
          </div>
        </OverlayViewF>
      ))}
    </>
  );
}

export default ItineraryMarkers;
