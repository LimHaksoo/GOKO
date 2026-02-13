import { memo, useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useBoardStore } from '@/store/useBoardStore';
import type { Place } from '@/shared/types';

interface PlaceNodeData {
  place: Place;
  index: number;
}

function PlaceNode({ data }: NodeProps<PlaceNodeData>) {
  const { place, index } = data;
  const updatePlaceNotes = useBoardStore((state) => state.updatePlaceNotes);
  const removePlace = useBoardStore((state) => state.removePlace);
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(place.notes);

  const handleNotesBlur = useCallback(() => {
    setIsEditing(false);
    if (notes !== place.notes) {
      updatePlaceNotes(place.id, notes);
    }
  }, [notes, place.id, place.notes, updatePlaceNotes]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      removePlace(place.id);
    },
    [place.id, removePlace]
  );

  return (
    <div className="place-node">
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />

      <div className="place-node__badge">{index + 1}</div>

      <button
        className="place-node__delete"
        onClick={handleDelete}
        aria-label="삭제"
        title="삭제"
      >
        &times;
      </button>

      <div className="place-node__name">{place.name}</div>
      <div className="place-node__address">{place.address}</div>

      {isEditing ? (
        <textarea
          className="place-node__notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          autoFocus
          placeholder="메모를 입력하세요..."
        />
      ) : (
        <div
          className="place-node__notes-display"
          onClick={() => setIsEditing(true)}
        >
          {place.notes || '메모 추가...'}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  );
}

export default memo(PlaceNode);
