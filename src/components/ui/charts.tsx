const APPROVED_COLOR = "#4f46e5"; // indigo-600 — matches Badge "green" semantics but CVD-safe against rejected
const REJECTED_COLOR = "#dc2626"; // red-600 — matches Badge "red" tone

export function ChartLegend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

/** Single-hue horizontal bar list for magnitude comparisons (e.g. by meal, by mess). */
export function BarList({
  data,
  emptyLabel = "No data",
}: {
  data: { label: string; value: number }[];
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs font-medium capitalize text-slate-600" title={d.label}>
            {d.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width]"
              style={{ width: `${(d.value / max) * 100}%` }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-900">
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Grouped vertical bar chart comparing two status series (approved/rejected) per category. */
export function GroupedBarChart({
  data,
  height = 160,
}: {
  data: { label: string; approved: number; rejected: number }[];
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No data for this range</p>;
  }

  const max = Math.max(1, ...data.map((d) => Math.max(d.approved, d.rejected)));
  const barWidth = 10;
  const groupGap = 22;
  const groupWidth = barWidth * 2 + 4;
  const width = data.length * (groupWidth + groupGap);
  const chartHeight = height - 28;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label="Approved and rejected mess entries by day"
          width={Math.max(width, 280)}
          height={height}
          className="min-w-full"
        >
          {data.map((d, i) => {
            const gx = i * (groupWidth + groupGap) + groupGap / 2;
            const approvedH = (d.approved / max) * chartHeight;
            const rejectedH = (d.rejected / max) * chartHeight;
            return (
              <g key={d.label}>
                <rect
                  x={gx}
                  y={chartHeight - approvedH}
                  width={barWidth}
                  height={Math.max(approvedH, d.approved > 0 ? 3 : 0)}
                  rx={2.5}
                  fill={APPROVED_COLOR}
                >
                  <title>
                    {d.label}: {d.approved} approved
                  </title>
                </rect>
                <rect
                  x={gx + barWidth + 4}
                  y={chartHeight - rejectedH}
                  width={barWidth}
                  height={Math.max(rejectedH, d.rejected > 0 ? 3 : 0)}
                  rx={2.5}
                  fill={REJECTED_COLOR}
                >
                  <title>
                    {d.label}: {d.rejected} rejected
                  </title>
                </rect>
                <line
                  x1={gx - groupGap / 2 + 2}
                  x2={gx - groupGap / 2 + groupWidth + groupGap - 2}
                  y1={chartHeight}
                  y2={chartHeight}
                  stroke="#e2e8f0"
                />
                <text
                  x={gx + barWidth / 2 + 2}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#94a3b8"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3">
        <ChartLegend
          items={[
            { label: "Approved", color: APPROVED_COLOR },
            { label: "Rejected", color: REJECTED_COLOR },
          ]}
        />
      </div>
    </div>
  );
}
