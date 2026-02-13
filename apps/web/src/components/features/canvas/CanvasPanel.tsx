import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  NodeChange,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useBoardStore, usePlaces, useRouteOrder } from '@/store/useBoardStore';
import { useTourApiLoading, useTourApiError } from '@/store/useTourApiStore';
import { useSelectedProvince } from '@/store/useProvinceStore';
import PlaceNode from './PlaceNode';
import CanvasToolbar from './CanvasToolbar';
import type { Place } from '@/shared/types';

const nodeTypes = {
  placeNode: PlaceNode,
};

interface PlaceNodeData {
  place: Place;
  index: number;
}

function CanvasPanel() {
  const placesById = usePlaces();
  const routeOrder = useRouteOrder();
  const movePlace = useBoardStore((state) => state.movePlace);
  const setCanvasViewport = useBoardStore((state) => state.setCanvasViewport);
  const canvasViewport = useBoardStore((state) => state.ui.canvasViewport);

  const isLoading = useTourApiLoading();
  const error = useTourApiError();
  const selectedProvince = useSelectedProvince();

  // Place들을 React Flow 노드로 변환
  const nodes = useMemo((): Node<PlaceNodeData>[] => {
    return routeOrder.map((id, index) => {
      const place = placesById[id];
      if (!place) return null;

      return {
        id: place.id,
        type: 'placeNode',
        position: { x: place.canvasPos.x, y: place.canvasPos.y },
        data: { place, index },
        draggable: true,
      };
    }).filter(Boolean) as Node<PlaceNodeData>[];
  }, [placesById, routeOrder]);

  // 노드 변경 핸들러 (드래그 이동)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          // 드래그가 끝났을 때만 저장
          movePlace(change.id, { x: change.position.x, y: change.position.y });
        }
      });
    },
    [movePlace]
  );

  // 뷰포트 변경 핸들러
  const onMoveEnd = useCallback(
    (_: unknown, viewport: { x: number; y: number; zoom: number }) => {
      setCanvasViewport(viewport);
    },
    [setCanvasViewport]
  );

  // 빈 상태 렌더링
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <div className="canvas-empty-state">
          <div className="map-loading__spinner" />
          <p>명소를 불러오는 중...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="canvas-empty-state">
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      );
    }

    if (!selectedProvince) {
      return (
        <div className="canvas-empty-state">
          <p>지도에서 지역을 선택하세요</p>
          <p className="canvas-empty-hint">시도를 클릭하면 해당 지역의 명소가 표시됩니다</p>
        </div>
      );
    }

    if (routeOrder.length === 0) {
      return (
        <div className="canvas-empty-state">
          <p>{selectedProvince}의 명소를 불러오는 중...</p>
        </div>
      );
    }

    return null;
  };

  const emptyState = renderEmptyState();

  return (
    <div className="canvas-container">
      <CanvasToolbar />

      {emptyState ? (
        <div className="canvas-background" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {emptyState}
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={[]}
          onNodesChange={onNodesChange}
          onMoveEnd={onMoveEnd}
          defaultViewport={canvasViewport}
          nodeTypes={nodeTypes}
          fitView={false}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
          <Controls position="bottom-right" />
          <MiniMap
            nodeColor="#667eea"
            maskColor="rgba(0, 0, 0, 0.8)"
            style={{ background: '#1e293b' }}
          />
        </ReactFlow>
      )}
    </div>
  );
}

export default CanvasPanel;
