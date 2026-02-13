import { useProvinceStore, useSelectedProvince, useProvinceDensity } from '@/store/useProvinceStore';
import { useTourApiStore, useTourApiLoading, useTourApiError } from '@/store/useTourApiStore';

function ProvinceInfo() {
  const selectedProvince = useSelectedProvince();
  const provinceDensity = useProvinceDensity();
  const clearSelection = useProvinceStore((state) => state.clearSelection);
  const isLoading = useTourApiLoading();
  const error = useTourApiError();
  const totalCount = useTourApiStore((state) => state.totalCount);
  const tourSpots = useTourApiStore((state) => state.tourSpots);

  const density = selectedProvince ? provinceDensity[selectedProvince] ?? 0 : 0;

  const handleClick = () => {
    if (selectedProvince) {
      clearSelection();
    }
  };

  const renderStatus = () => {
    if (isLoading) {
      return <div className="info-sub">명소 불러오는 중...</div>;
    }
    if (error) {
      return <div className="info-sub" style={{ color: '#ef4444' }}>{error}</div>;
    }
    if (selectedProvince && tourSpots.length > 0) {
      return <div className="info-sub">{tourSpots.length}개 명소 (총 {totalCount}개)</div>;
    }
    if (selectedProvince && tourSpots.length === 0) {
      return <div className="info-sub">명소를 찾을 수 없습니다</div>;
    }
    return null;
  };

  return (
    <div
      className={`province-info ${selectedProvince ? 'clickable' : ''}`}
      style={{ position: 'absolute', top: 16, right: 16 }}
      onClick={handleClick}
    >
      <div className="info-label">Selected</div>
      {selectedProvince ? (
        <>
          <div className="info-name">{selectedProvince}</div>
          {renderStatus()}
          <div className="info-sub" style={{ marginTop: 4 }}>
            밀도: {density} / 100 • click to clear
          </div>
        </>
      ) : (
        <>
          <div className="info-name">All provinces</div>
          <div className="info-sub">Click a province</div>
        </>
      )}
    </div>
  );
}

export default ProvinceInfo;
