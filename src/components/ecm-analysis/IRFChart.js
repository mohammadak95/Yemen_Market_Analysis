import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const ChartContainer = styled.div`
  width: 100%;
  height: 400px;
  margin-bottom: 20px;
`;

const IRFChart = ({ irfData }) => {
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
};

IRFChart.propTypes = {
  irfData: PropTypes.shape({
    irf: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number))).isRequired,
  }).isRequired,
};

export default IRFChart;