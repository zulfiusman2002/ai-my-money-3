export const shortMonth = (value) => {
  if (!value || value === 'Now') return value || '';
  const d = new Date(`${value}-02T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
};

export default function MoneyChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="money-tooltip">
      <div className="money-tooltip-date">{shortMonth(label)}</div>
      {payload.filter((p) => p.value != null).map((p) => (
        <div className="money-tooltip-row" key={p.dataKey || p.name}>
          <span><i style={{ background: p.color || p.stroke }} />{p.name}</span>
          <strong>{formatter ? formatter(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}
