import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { getGoogleMapsApiKey, isGoogleMapsConfigured } from '@/services/map/googleMapsLoader';
import { getKoreaBoundsForGoogleMaps, KOREA_CENTER } from '@/domain/koreaBounds';
import { useRouteOrder, usePlaces, useBoardStore } from '@/store/useBoardStore';
import { useProvinceStore } from '@/store/useProvinceStore';
import { useTourApiStore, useTourSpots } from '@/store/useTourApiStore';
import { fetchProvincesGeoJSON } from '@/services/koreaProvincesGeojson';
import {
  getProvinceName,
  getChoroColor,
  computeProvinceDensity,
} from '@/domain/provinces/provinceUtils';
import MapControlsOverlay from './MapControlsOverlay';
import ItineraryMarkers from './ItineraryMarkers';
import RoutePolyline from './RoutePolyline';
import ProvinceLegend from './ProvinceLegend';
import ProvinceInfo from './ProvinceInfo';

const containerStyle = {
  width: '100%',
  height: '100%',
};

function MapPanel() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const placesById = usePlaces();
  const routeOrder = useRouteOrder();
  const places = useMemo(
    () => routeOrder.map((id) => placesById[id]).filter(Boolean),
    [placesById, routeOrder]
  );

  const {
    provincesGeo,
    provinceDensity,
    selectedProvince,
    setProvincesGeo,
    setProvinceDensity,
    selectProvince,
    clearSelection,
  } = useProvinceStore();

  const fetchByProvince = useTourApiStore((state) => state.fetchByProvince);
  const clearSpots = useTourApiStore((state) => state.clearSpots);
  const tourSpots = useTourSpots();
  const importPlaces = useBoardStore((state) => state.importPlaces);
  const clearPlaces = useBoardStore((state) => state.clearPlaces);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: getGoogleMapsApiKey(),
  });

  const mapOptions = useMemo((): google.maps.MapOptions | undefined => {
    if (!isLoaded) return undefined;

    return {
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM,
      },
      restriction: {
        latLngBounds: getKoreaBoundsForGoogleMaps(),
        strictBounds: false,
      },
      minZoom: 6,
      maxZoom: 18,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    };
  }, [isLoaded]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    dataLayerRef.current = null;
    setMapReady(false);
  }, []);

  // GeoJSON 로드 및 Data Layer 생성
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const loadProvinces = async () => {
      try {
        const geo = await fetchProvincesGeoJSON();
        setProvincesGeo(geo);

        // 밀도 계산
        const points = places.map((p) => ({ lat: p.lat, lng: p.lng, weight: 1 }));
        const density = computeProvinceDensity(geo, points);
        setProvinceDensity(density);

        // Data Layer 생성
        const map = mapRef.current!;
        if (dataLayerRef.current) {
          dataLayerRef.current.setMap(null);
        }

        const dataLayer = new google.maps.Data({ map });
        dataLayer.addGeoJson(geo);

        // 스타일 설정
        dataLayer.setStyle((feature) => {
          const props = {} as Record<string, unknown>;
          feature.forEachProperty((value, key) => {
            props[key] = value;
          });
          const name = getProvinceName(props);
          const v = density[name] ?? 0;
          const isSelected = selectedProvince === name;

          return {
            fillColor: getChoroColor(v),
            fillOpacity: isSelected ? 0.4 : 0.2,
            strokeColor: isSelected ? '#0f172a' : '#334155',
            strokeWeight: isSelected ? 2.5 : 1,
            strokeOpacity: 0.95,
          };
        });

        // 이벤트 핸들러
        dataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
          const props = {} as Record<string, unknown>;
          event.feature.forEachProperty((value, key) => {
            props[key] = value;
          });
          const name = getProvinceName(props);

          if (selectedProvince === name) {
            clearSelection();
          } else {
            selectProvince(name);
          }
        });

        dataLayerRef.current = dataLayer;
      } catch (error) {
        console.warn('Failed to load provinces:', error);
      }
    };

    loadProvinces();
  }, [mapReady, places, selectedProvince, setProvincesGeo, setProvinceDensity, selectProvince, clearSelection]);

  // selectedProvince 변경 시 스타일 업데이트
  useEffect(() => {
    if (!dataLayerRef.current || !provinceDensity) return;

    dataLayerRef.current.setStyle((feature) => {
      const props = {} as Record<string, unknown>;
      feature.forEachProperty((value, key) => {
        props[key] = value;
      });
      const name = getProvinceName(props);
      const v = provinceDensity[name] ?? 0;
      const isSelected = selectedProvince === name;

      return {
        fillColor: getChoroColor(v),
        fillOpacity: isSelected ? 0.4 : 0.2,
        strokeColor: isSelected ? '#0f172a' : '#334155',
        strokeWeight: isSelected ? 2.5 : 1,
        strokeOpacity: 0.95,
      };
    });
  }, [selectedProvince, provinceDensity]);

  // Province 선택 시 TourAPI fetch 트리거
  useEffect(() => {
    if (selectedProvince) {
      fetchByProvince(selectedProvince);
    } else {
      clearSpots();
      clearPlaces();
    }
  }, [selectedProvince]);

  // // TourAPI 결과를 Board로 동기화
  // useEffect(() => {
  //   if (tourSpots.length > 0) {
  //     const placesData = tourSpots.map((spot) => ({
  //       placeId: spot.contentId,
  //       name: spot.title,
  //       address: spot.addr1 + (spot.addr2 ? ` ${spot.addr2}` : ''),
  //       lat: spot.mapy,
  //       lng: spot.mapx,
  //     }));
  //     importPlaces(placesData);
  //   }
  // }, [tourSpots, importPlaces]);

  useEffect(() => {
    const placesData = tourSpots.map((spot) => ({
      placeId: spot.contentId,
      name: spot.title,
      address: spot.addr1 + (spot.addr2 ? ` ${spot.addr2}` : ''),
      lat: spot.mapy,
      lng: spot.mapx,
    }));
    importPlaces(placesData);
  }, [tourSpots, importPlaces]);

  const handleFitBounds = useCallback(() => {
    if (!mapRef.current || places.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    places.forEach((place) => {
      bounds.extend({ lat: place.lat, lng: place.lng });
    });

    mapRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [places]);

  if (!isGoogleMapsConfigured()) {
    return (
      <div className="map-error">
        <div className="map-error__icon">🗺️</div>
        <p>Google Maps API 키가 설정되지 않았습니다.</p>
        <p className="map-error__hint">.env 파일에 VITE_GOOGLE_MAPS_API_KEY를 설정하세요.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="map-error">
        <div className="map-error__icon">⚠️</div>
        <p>지도를 불러올 수 없습니다.</p>
        <p className="map-error__hint">{loadError.message}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="map-loading">
        <div className="map-loading__spinner" />
        <p>지도 로딩 중...</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={KOREA_CENTER}
        zoom={7}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {mapReady && (
          <>
            <ItineraryMarkers places={places} />
            <RoutePolyline places={places} />
          </>
        )}
      </GoogleMap>

      <MapControlsOverlay onFitBounds={handleFitBounds} hasPlaces={places.length > 0} />
      {provincesGeo && (
        <>
          <ProvinceLegend />
          <ProvinceInfo />
        </>
      )}
    </div>
  );
}

export default MapPanel;
