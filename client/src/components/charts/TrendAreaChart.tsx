import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface TrendDatum {
  label: string
  value: number
}

interface TrendAreaChartProps {
  data: TrendDatum[]
  valueSuffix?: string
  height?: number
}

export const TrendAreaChart = ({ data, valueSuffix = '', height = 220 }: TrendAreaChartProps) => {
  if (data.length === 0) {
    return <p className="muted">Not enough data for trend visualization.</p>
  }

  return (
    <div className="chart-surface" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
          <XAxis dataKey="label" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ stroke: 'var(--color-primary-400)', strokeDasharray: '4 4' }}
            contentStyle={{
              border: '1px solid var(--border-strong)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-lg)',
              background: 'var(--surface-elevated)',
            }}
            formatter={(value) => `${Array.isArray(value) ? value[0] : value ?? 0}${valueSuffix}`}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary-500)"
            strokeWidth={2.4}
            fillOpacity={1}
            fill="url(#trendFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
