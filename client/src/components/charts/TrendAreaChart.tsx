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
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
          <XAxis 
            dataKey="label" 
            stroke="var(--text-soft)" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fontSize: 11, fontWeight: 600 }}
          />
          <YAxis 
            stroke="var(--text-soft)" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fontSize: 11, fontWeight: 500 }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-primary-400)', strokeDasharray: '4 4' }}
            contentStyle={{
              border: '1px solid var(--border-soft)',
              borderRadius: 14,
              boxShadow: 'var(--shadow-glass)',
              background: 'var(--surface-elevated)',
              backdropFilter: 'blur(10px)',
              padding: '8px 12px',
            }}
            labelStyle={{ fontWeight: 700, color: 'var(--color-primary-500)', fontSize: '0.8rem' }}
            itemStyle={{ fontWeight: 600, fontSize: '0.85rem' }}
            formatter={(value) => [`${value}${valueSuffix}`, 'Submissions']}
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
