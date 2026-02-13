import type { MapMode } from '@/shared/types';

interface CollapseToggleProps {
  mapMode: MapMode;
  onToggle: () => void;
}

function CollapseToggle({ mapMode, onToggle }: CollapseToggleProps) {
  const icon = mapMode === 'collapsed' ? '▶' : '◀';
  const label =
    mapMode === 'collapsed' ? '지도 열기' : mapMode === 'peek' ? '지도 접기' : '지도 미리보기';

  return (
    <button
      className="collapse-toggle"
      onClick={onToggle}
      aria-label={label}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

export default CollapseToggle;
