import { useBoardStore, useMapMode } from '@/store/useBoardStore';
import CollapseToggle from './CollapseToggle';
import MapPanel from '@/components/features/map/MapPanel';
import { CanvasPanel } from '@/components/features/canvas';

function SplitView() {
  const mapMode = useMapMode();
  const toggleMapMode = useBoardStore((state) => state.toggleMapMode);

  return (
    <div className="split-view">
      {/* 좌측: 지도 패널 */}
      <div className={`map-panel ${mapMode}`}>
        {mapMode !== 'collapsed' && <MapPanel />}
      </div>

      {/* 우측: 캔버스 패널 */}
      <div className="canvas-panel">
        <CollapseToggle mapMode={mapMode} onToggle={toggleMapMode} />
        <CanvasPanel />
      </div>
    </div>
  );
}

export default SplitView;
