import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ComparisonDatum {
  label: string
  value: number
}

interface ComparisonBarChartProps {
  data: ComparisonDatum[]
  valueSuffix?: string
  height?: number
}

export const ComparisonBarChart = ({
  data,
  valueSuffix = '',
  height = 220,
}: ComparisonBarChartProps) => {
  if (data.length === 0) {
    return <p className="muted">Not enough data for comparison visualization.</p>
  }

  return (
    <div className="chart-surface" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary-500)" stopOpacity={0.85} />
              <stop offset="100%" stopColor="var(--color-primary-600)" stopOpacity={0.4} />
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
            formatter={(value) => [`${value}${valueSuffix}`, 'Tests']}
          />
          <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
