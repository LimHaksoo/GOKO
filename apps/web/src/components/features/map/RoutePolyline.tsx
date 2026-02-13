import { PolylineF } from '@react-google-maps/api';
import type { Place } from '@/shared/types';

interface RoutePolylineProps {
  places: Place[];
}

// Google Maps에서 대시 스타일을 구현하기 위한 아이콘 패턴
const dashedLineSymbol: google.maps.Symbol = {
  path: 'M 0,-1 0,1',
  strokeOpacity: 1,
  strokeWeight: 3,
  scale: 4,
};

const polylineOptions: google.maps.PolylineOptions = {
  strokeColor: '#00467F',
  strokeOpacity: 0, // 기본 선은 숨기고 아이콘으로 대시 표현
  strokeWeight: 3,
  icons: [
    {
      icon: dashedLineSymbol,
      offset: '0',
      repeat: '16px', // 대시 간격
    },
  ],
  geodesic: true,
};

function RoutePolyline({ places }: RoutePolylineProps) {
  if (places.length < 2) return null;

  const path = places.map((place) => ({
    lat: place.lat,
    lng: place.lng,
  }));

  return <PolylineF path={path} options={polylineOptions} />;
}

export default RoutePolyline;
