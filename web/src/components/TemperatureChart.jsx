import { formatDayLabel, formatWithUnit } from '../utils/format.js';

function chartPoints(days) {
  const values = days.flatMap((day) => [day.tempMax, day.tempMin]).filter(Number.isFinite);
  const range = values.length ? Math.max(...values) - Math.min(...values) || 1 : 1;
  const min = values.length ? Math.min(...values) : 0;
  const step = 264 / Math.max(days.length - 1, 1);
  const x = (index) => 18 + index * step;
  const y = (value) => !Number.isFinite(value) ? null : 104 - ((value - min) / range) * 65;

  return {
    highs: days.map((day, index) => ({ x: x(index), y: y(day.tempMax), value: day.tempMax })),
    lows: days.map((day, index) => ({ x: x(index), y: y(day.tempMin), value: day.tempMin }))
  };
}

export function TemperatureChart({ days }) {
  const { highs, lows } = chartPoints(days);
  const highPoints = highs.filter((point) => point.y !== null);
  const lowPoints = lows.filter((point) => point.y !== null);
  const highLine = highPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const lowLine = lowPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const fillPoints = highPoints.length && lowPoints.length
    ? `${highLine} ${lowPoints.slice().reverse().map((point) => `${point.x},${point.y}`).join(' ')}`
    : '';

  return (
    <section className="card chart-card" aria-labelledby="week-chart-title">
      <div className="card-heading">
        <h2 className="section-title" id="week-chart-title">Temperature this week</h2>
        <div className="legend" aria-label="Chart legend">
          <span className="legend-item"><i className="legend-line" />High</span>
          <span className="legend-item"><i className="legend-line low" />Low</span>
        </div>
      </div>
      <svg
        className="temperature-chart"
        viewBox="0 0 300 148"
        role="img"
        aria-label="High and low temperatures across the forecast"
      >
        <polygon className="chart-area" points={fillPoints} />
        <polyline className="high-path" points={highLine} />
        <polyline className="low-path" points={lowLine} />
        {days.map((day, index) => {
          const high = highs[index];
          const low = lows[index];
          return (
            <g key={day.date}>
              {high.y !== null && <circle className="high-dot" cx={high.x} cy={high.y} r="2.7" />}
              {low.y !== null && <circle className="low-dot" cx={low.x} cy={low.y} r="2.5" />}
              <text className="chart-high-label" x={high.x} y={(high.y ?? 39) - 8} textAnchor="middle">
                {formatWithUnit(day.tempMax, '°')}
              </text>
              <text className="chart-low-label" x={low.x} y={(low.y ?? 104) + 13} textAnchor="middle">
                {formatWithUnit(day.tempMin, '°')}
              </text>
              <text className={`chart-day-label${index === 0 ? ' today' : ''}`} x={high.x} y="143" textAnchor="middle">
                {formatDayLabel(day.date, index)}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
