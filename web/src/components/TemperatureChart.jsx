function chartPoints(days) {
  const values = days.flatMap((day) => [day.tempMax, day.tempMin]);
  const range = Math.max(...values) - Math.min(...values) || 1;
  const min = Math.min(...values);
  const step = 264 / Math.max(days.length - 1, 1);
  const x = (index) => 18 + index * step;
  const y = (value) => 104 - ((value - min) / range) * 65;

  return {
    highs: days.map((day, index) => ({ x: x(index), y: y(day.tempMax), value: day.tempMax })),
    lows: days.map((day, index) => ({ x: x(index), y: y(day.tempMin) + 16, value: day.tempMin }))
  };
}

export function TemperatureChart({ days }) {
  const { highs, lows } = chartPoints(days);
  const highLine = highs.map((point) => `${point.x},${point.y}`).join(' ');
  const lowLine = lows.map((point) => `${point.x},${point.y}`).join(' ');
  const fillPoints = `${highLine} ${lows.slice().reverse().map((point) => `${point.x},${point.y}`).join(' ')}`;

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
        {days.map((day, index) => (
          <g key={day.date}>
            <circle className="high-dot" cx={highs[index].x} cy={highs[index].y} r="2.7" />
            <circle className="low-dot" cx={lows[index].x} cy={lows[index].y} r="2.5" />
            <text className="chart-high-label" x={highs[index].x} y={highs[index].y - 8} textAnchor="middle">
              {day.tempMax}°
            </text>
            <text className="chart-low-label" x={lows[index].x} y={lows[index].y + 13} textAnchor="middle">
              {day.tempMin}°
            </text>
            <text className={`chart-day-label${index === 0 ? ' today' : ''}`} x={highs[index].x} y="143" textAnchor="middle">
              {index === 0 ? 'Today' : new Date(`${day.date}T00:00:00`).toLocaleDateString('en-NZ', { weekday: 'short' })}
            </text>
          </g>
        ))}
      </svg>
    </section>
  );
}
