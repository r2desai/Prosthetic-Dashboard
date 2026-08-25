export interface ChartSeries {
  label: string;
  data: number[];
  color: string;
}

interface MultiLineChartProps {
  series: ChartSeries[];
  min?: number;
  max?: number;
  height?: number;
  title?: string;
}


export function MultiLineChart({ series, min, max, height = 90, title }: MultiLineChartProps) {
  const width = 100;
  const allValues = series.flatMap((s) => s.data);
  const lo = min ?? (allValues.length ? Math.min(...allValues) : 0);
  const hi = max ?? (allValues.length ? Math.max(...allValues) : 1);
  const range = hi - lo || 1;

  return (
    <div className="multi-line-chart">
      {title && <div className="line-chart-label">{title}</div>}
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="line-chart-svg" style={{ height }}>
        {series.map((s) => {
          const values = s.data.length > 0 ? s.data : [0];
          const points = values
            .map((v, i) => {
              const x = (i / Math.max(values.length - 1, 1)) * width;
              const y = height - ((v - lo) / range) * height;
              return `${x},${y.toFixed(1)}`;
            })
            .join(" ");
          return (
            <polyline
              key={s.label}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="multi-line-legend">
        {series.map((s) => (
          <span key={s.label} className="legend-item">
            <span className="legend-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
