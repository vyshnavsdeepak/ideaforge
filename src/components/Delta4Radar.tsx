'use client';

interface Delta4Scores {
  speed: number;
  convenience: number;
  trust: number;
  price: number;
  status: number;
  predictability: number;
  uiUx: number;
  easeOfUse: number;
  legalFriction: number;
  emotionalComfort: number;
}

interface Delta4RadarProps {
  scores: Delta4Scores;
  size?: number;
}

export function Delta4Radar({ scores, size = 200 }: Delta4RadarProps) {
  const dimensions = [
    { key: 'speed', label: 'Speed', value: scores.speed },
    { key: 'convenience', label: 'Convenience', value: scores.convenience },
    { key: 'trust', label: 'Trust', value: scores.trust },
    { key: 'price', label: 'Price', value: scores.price },
    { key: 'status', label: 'Status', value: scores.status },
    { key: 'predictability', label: 'Predictability', value: scores.predictability },
    { key: 'uiUx', label: 'UI/UX', value: scores.uiUx },
    { key: 'easeOfUse', label: 'Ease of Use', value: scores.easeOfUse },
    { key: 'legalFriction', label: 'Legal Friction', value: scores.legalFriction },
    { key: 'emotionalComfort', label: 'Emotional Comfort', value: scores.emotionalComfort },
  ];

  const center = size / 2;
  const radius = size / 2 - 40;
  const maxValue = 10;

  // Calculate points for the radar chart
  const points = dimensions.map((dim, index) => {
    const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
    const value = (dim.value / maxValue) * radius;
    const x = center + value * Math.cos(angle);
    const y = center + value * Math.sin(angle);
    return { x, y, ...dim };
  });

  // Create the polygon path
  const pathData = points.map((point, index) => {
    return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }).join(' ') + ' Z';

  // Create grid circles
  const gridCircles = [2, 4, 6, 8, 10].map(value => ({
    r: (value / maxValue) * radius,
    opacity: value === 10 ? 0.3 : 0.1,
  }));

  // Create axis lines
  const axisLines = dimensions.map((dim, index) => {
    const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
    const endX = center + radius * Math.cos(angle);
    const endY = center + radius * Math.sin(angle);
    return {
      x1: center,
      y1: center,
      x2: endX,
      y2: endY,
      label: dim.label,
      labelX: center + (radius + 20) * Math.cos(angle),
      labelY: center + (radius + 20) * Math.sin(angle),
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid circles */}
        {gridCircles.map((circle, index) => (
          <circle
            key={index}
            cx={center}
            cy={center}
            r={circle.r}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            opacity={circle.opacity}
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((line, index) => (
          <line
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.2}
          />
        ))}

        {/* Data polygon */}
        <path
          d={pathData}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="rgb(59, 130, 246)"
          strokeWidth={2}
        />

        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={3}
            fill="rgb(59, 130, 246)"
          />
        ))}

        {/* Labels */}
        {axisLines.map((line, index) => (
          <text
            key={index}
            x={line.labelX}
            y={line.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-current text-gray-600 dark:text-gray-400"
            fontSize={10}
          >
            {line.label}
          </text>
        ))}
      </svg>
      
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Delta 4 Analysis (0-10 scale)
      </div>
    </div>
  );
}