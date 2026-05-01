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
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
          <XAxis dataKey="label" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              border: '1px solid var(--border-strong)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-lg)',
              background: 'var(--surface-elevated)',
            }}
            formatter={(value) => `${Array.isArray(value) ? value[0] : value ?? 0}${valueSuffix}`}
          />
          <Bar dataKey="value" fill="var(--color-accent-500)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
