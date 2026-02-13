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
import {
  useTourApiLoading,
  useTourApiError,
  useTourSpots,
  useTourApiStore,
} from '@/store/useTourApiStore';
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
  const tourSpots = useTourSpots();
  const lastFetchedProvince = useTourApiStore((s) => s.lastFetchedProvince);

  const selectedProvince = useSelectedProvince();

  // Place들을 React Flow 노드로 변환
  const nodes = useMemo((): Node<PlaceNodeData>[] => {
    return routeOrder
      .map((id, index) => {
        const place = placesById[id];
        if (!place) return null;

        return {
          id: place.id,
          type: 'placeNode',
          position: { x: place.canvasPos.x, y: place.canvasPos.y },
          data: { place, index },
          draggable: true,
        };
      })
      .filter(Boolean) as Node<PlaceNodeData>[];
  }, [placesById, routeOrder]);

  // 노드 변경 핸들러 (드래그 이동)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          movePlace(change.id, { x: change.position.x, y: change.position.y });
        }
      });
    },
    [movePlace]
  );

  // 뷰포트 변경 핸들러
  const onMoveEnd = useCallback(
    (_evt: any, viewport: { x: number; y: number; zoom: number }) => {
      setCanvasViewport(viewport);
    },
    [setCanvasViewport]
  );

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

    // ✅ 핵심: “조회 완료 + 결과 0개”를 로딩이 아니라 “없음”으로 보여주기
    if (lastFetchedProvince === selectedProvince && tourSpots.length === 0) {
      return (
        <div className="canvas-empty-state">
          <p>{selectedProvince}에서 명소를 찾을 수 없습니다.</p>
          <p className="canvas-empty-hint">다른 지역을 선택하거나 조건을 바꿔보세요.</p>
        </div>
      );
    }

    // 보드에 아직 place가 안 올라온 상태(잠깐)
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
        <div
          className="canvas-background"
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
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
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls position="bottom-right" />
          <MiniMap style={{ background: '#1e293b' }} />
        </ReactFlow>
      )}
    </div>
  );
}

export default CanvasPanel;
