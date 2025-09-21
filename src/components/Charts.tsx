import type { FC } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

type ChartType = 'hot-cold' | 'gaps';

type ChartDatum = {
  label: string;
  value: number;
};

interface ChartsProps {
  data: ChartDatum[];
  type: ChartType;
  title: string;
}

const chartCopy: Record<ChartType, string> = {
  'hot-cold': 'Frequency of each ball over the selected window.',
  gaps: 'Average draw gap between appearances for each ball.'
};

export const Charts: FC<ChartsProps> = ({ data, type, title }) => {
  return (
    <section className="chart" data-id={type === 'hot-cold' ? 'hot-cold-chart' : 'gap-chart'}>
      <header className="chart-header">
        <h3>{title}</h3>
        <p>{chartCopy[type]}</p>
      </header>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" interval={0} angle={-45} textAnchor="end" height={80} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" name={type === 'hot-cold' ? 'Draw count' : 'Average gap'} fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
};

export default Charts;
