//src/components/InteractiveChart.js

import React, { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import PropTypes from 'prop-types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const InteractiveChart = ({ data, selectedCommodity, selectedRegime }) => {
  const [showConflict, setShowConflict] = useState(true);
  const [showResidual, setShowResidual] = useState(false);

  const chartData = useMemo(() => {
    if (!data || !selectedCommodity || !selectedRegime) return null;

    const filteredData = data.features.filter(
      d => d.commodity === selectedCommodity && d.regime === selectedRegime
    ).sort((a, b) => a.date - b.date);

    return {
      labels: filteredData.map(d => d.date),
      datasets: [
        {
          label: 'USD Price',
          data: filteredData.map(d => d.usdprice),
          borderColor: 'rgb(75, 192, 192)',
          yAxisID: 'y',
        },
        ...(showConflict ? [{
          label: 'Conflict Intensity',
          data: filteredData.map(d => d.conflict_intensity),
          borderColor: 'rgb(255, 99, 132)',
          yAxisID: 'y1',
        }] : []),
        ...(showResidual ? [{
          label: 'Residual',
          data: filteredData.map(d => d.residual),
          borderColor: 'rgb(153, 102, 255)',
          yAxisID: 'y2',
        }] : []),
      ],
    };
  }, [data, selectedCommodity, selectedRegime, showConflict, showResidual]);

  const options = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'USD Price'
        }
      },
      y1: {
        type: 'linear',
        display: showConflict,
        position: 'right',
        title: {
          display: true,
          text: 'Conflict Intensity'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      y2: {
        type: 'linear',
        display: showResidual,
        position: 'right',
        title: {
          display: true,
          text: 'Residual'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  if (!chartData) return <div>Please select a commodity and regime</div>;

  return (
    <div>
      <div>
        <label>
          <input
            type="checkbox"
            checked={showConflict}
            onChange={() => setShowConflict(!showConflict)}
          />
          Show Conflict Intensity
        </label>
        <label>
          <input
            type="checkbox"
            checked={showResidual}
            onChange={() => setShowResidual(!showResidual)}
          />
          Show Residual
        </label>
      </div>
      <Line options={options} data={chartData} />
    </div>
  );
};

InteractiveChart.propTypes = {
  data: PropTypes.shape({
    features: PropTypes.array.isRequired,
  }),
  selectedCommodity: PropTypes.string,
  selectedRegime: PropTypes.string,
};

export default InteractiveChart;