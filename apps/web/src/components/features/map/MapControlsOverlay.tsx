interface MapControlsOverlayProps {
  onFitBounds: () => void;
  hasPlaces: boolean;
}

function MapControlsOverlay({ onFitBounds, hasPlaces }: MapControlsOverlayProps) {
  return (
    <div className="map-controls-overlay">
      <button
        onClick={onFitBounds}
        disabled={!hasPlaces}
        title="Fit Route"
        aria-label="Fit route to view"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      </button>

      <div className="divider" />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
        <span className="legend-dot route" />
        <span className="legend-label">Route</span>

        <span className="legend-dot flight" style={{ marginLeft: '8px' }} />
        <span className="legend-label">Flight</span>
      </div>
    </div>
  );
}

export default MapControlsOverlay;
