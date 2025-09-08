import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

function PassFailChart({ data }) {
  const passCount = data.filter(item => item.grade >= 1).length;
  const failCount = data.filter(item => item.grade < 1).length;

  const chartData = [
    { name: 'PASS', value: passCount },
    { name: 'FAIL', value: failCount },
  ];

  const COLORS = ['#34d399', '#f87171'];

  return (
    <PieChart width={500} height={400}>
      <Pie
        data={chartData}
        cx="50%"
        cy="50%"
        outerRadius={150}
        label={(entry) => `${entry.name}: ${entry.value}`}
        dataKey="value"
      >
        {chartData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
}

export default PassFailChart;
