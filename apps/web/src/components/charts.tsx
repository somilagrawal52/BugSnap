'use client';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
export function ReportsChart({ data }: { data: { day: string; reports: number }[] }) {
  return (
    <div
      className="chart"
      role="img"
      aria-label={`Reports over the last 14 days: ${data.reduce((s, d) => s + d.reports, 0)} received`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7663ee" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#7663ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#edeef4" />
          <XAxis
            dataKey="day"
            tickFormatter={(v) =>
              new Date(v + 'T00:00:00Z').toLocaleDateString('en', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              })
            }
            tickLine={false}
            axisLine={false}
            minTickGap={35}
            tick={{ fill: '#858698', fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#858698', fontSize: 12 }}
          />
          <Tooltip
            labelFormatter={(v) => String(v)}
            contentStyle={{ borderRadius: 10, borderColor: '#e9e9f0', fontSize: 14 }}
          />
          <Area
            type="monotone"
            dataKey="reports"
            stroke="#7965ed"
            strokeWidth={2.5}
            fill="url(#reportFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
