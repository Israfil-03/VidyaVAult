interface ChartPlaceholderProps {
  label: string
}

export const ChartPlaceholder = ({ label }: ChartPlaceholderProps) => (
  <div className="chart-placeholder">
    <span>{label}</span>
  </div>
)
