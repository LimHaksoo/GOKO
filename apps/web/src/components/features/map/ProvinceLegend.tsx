import { getChoroColor, DENSITY_GRADES } from '@/domain/provinces/provinceUtils';

function ProvinceLegend() {
  return (
    <div className="province-legend" style={{ position: 'absolute', bottom: 16, right: 16 }}>
      <div className="legend-title">Density</div>
      {DENSITY_GRADES.map((grade, i) => {
        const nextGrade = DENSITY_GRADES[i + 1];
        const label = nextGrade != null ? `${grade}–${nextGrade}` : `${grade}+`;
        const color = getChoroColor(grade + 1);

        return (
          <div key={grade} className="legend-item">
            <span className="legend-swatch" style={{ background: color }} />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default ProvinceLegend;
