// src/components/ecm-analysis/IRFChart.js
import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import styled from 'styled-components';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// Styled container for the chart
const ChartContainer = styled.div`
  width: 100%;
  height: 400px;
  margin-bottom: 20px;
`;

const IRFChart = React.memo(({ irfData }) => {
  const data = useMemo(() => {
    const labels = irfData.irf.map((_, index) => `T${index + 1}`);
    return {
      labels,
      datasets: [
        {
          label: 'Variable 1',
          data: irfData.irf.map(point => point[0][0]),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Variable 2',
          data: irfData.irf.map(point => point[1][1]),
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [irfData]);

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    interaction: { mode: 'nearest', intersect: false },
    scales: {
      x: { title: { display: true, text: 'Time Periods' } },
      y: { title: { display: true, text: 'Response' } },
    },
  };

  return (
    <ChartContainer>
      <Line data={data} options={options} />
    </ChartContainer>
  );
});

export default IRFChart;
