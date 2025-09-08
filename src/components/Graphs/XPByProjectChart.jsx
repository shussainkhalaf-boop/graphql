import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer
} from 'recharts';

function formatXP(bytes) {
  const kb = bytes / 1024;
  if (kb >= 1000) return { value: (kb / 1024).toFixed(2), unit: 'MB' };
  return { value: kb.toFixed(2), unit: 'KB' };
}

function XPByProjectChart({ projects }) {
  const chartData = projects.map((project) => {
    const { value, unit } = formatXP(project.amount);
    return {
      name: project.object?.name || 'Unknown',
      xp: parseFloat(value),
      unit
    };
  });

  const unit = chartData[0]?.unit || 'KB';

  return (
    <ResponsiveContainer width="100%" height={500}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 50, bottom: 92 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          interval={0}
          angle={-45}
          textAnchor="end"
        />
        <YAxis
          label={{
            value: `XP in ${unit}`,
            angle: -90,
            position: 'insideLeft',
            style: { fontSize: 20 }
          }}
        />
        <Tooltip />
        <Legend />
        <Bar dataKey="xp" fill="url(#colorXp)" />
        <defs>
          <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2} />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default XPByProjectChart;
