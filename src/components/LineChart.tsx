interface LineChartProps {
  data: number[];
  color?: string;
  min?: number;
  max?: number;
  height?: number;
  label?: string;
  unit?: string;
  id?: string;
}

export function LineChart({
  data,
  color = "var(--accent-blue)",
  min,
  max,
  height = 72,
  label,
  unit = "",
  id,
}: LineChartProps) {
  const width = 100;
  const values = data.length > 0 ? data : [0];
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const range = hi - lo || 1;
  const gradientId = `line-chart-fill-${id ?? label ?? Math.random().toString(36).slice(2)}`;

  const coords = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * width;
    const y = height - ((v - lo) / range) * height;
    return [x, y] as const;
  });

  const linePoints = coords.map(([x, y]) => `${x},${y.toFixed(1)}`).join(" ");
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;

  const latest = values[values.length - 1];

  return (
    <div className="line-chart">
      {label && (
        <div className="line-chart-header">
          <span className="line-chart-label">{label}</span>
          <span className="line-chart-value" style={{ color }}>
            {latest}
            {unit}
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="line-chart-svg"
        style={{ height }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#${gradientId})`} stroke="none" />
        <polyline
          points={linePoints}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
