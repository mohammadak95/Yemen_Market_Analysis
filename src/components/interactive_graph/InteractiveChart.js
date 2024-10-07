// src/components/InteractiveChart.js

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

// Register Chart.js components
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

const InteractiveChart = ({ data, selectedCommodity }) => {
  // State to control the visibility of Conflict Intensity
  const [showConflict, setShowConflict] = useState(true);

  // Memoized chart data to optimize performance
  const chartData = useMemo(() => {
    if (!data || !selectedCommodity) return null;

    // Filter and sort data based on selected commodity and unified regime
    const filteredData = data.features
      .filter((d) => d.commodity === selectedCommodity && d.regime === 'unified')
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (filteredData.length === 0) return null;

    return {
      labels: filteredData.map((d) => new Date(d.date)),
      datasets: [
        {
          label: 'LCU Price',
          data: filteredData.map((d) => d.price),
          borderColor: 'rgba(54, 162, 235, 1)', // Solid blue line
          backgroundColor: 'rgba(54, 162, 235, 0.2)', // Light blue fill
          yAxisID: 'y', // Assign LCU price to the first y-axis
          fill: false,
          tension: 0.4, // Smooth the line
        },
        {
          label: 'USD Price',
          data: filteredData.map((d) => d.usdprice),
          borderColor: 'rgba(75, 192, 192, 1)', // Solid teal line
          backgroundColor: 'rgba(75, 192, 192, 0.2)', // Light teal fill
          yAxisID: 'y1', // Assign USD price to the second y-axis
          fill: false,
          tension: 0.4, // Smooth the line
        },
        ...(showConflict
          ? [
              {
                label: 'Conflict Intensity',
                data: filteredData.map((d) => d.conflict_intensity),
                borderColor: 'rgba(255, 99, 132, 0)', // Transparent border
                backgroundColor: 'rgba(255, 99, 132, 0.3)', // Increased opacity for better visibility
                yAxisID: 'y2', // Assign Conflict Intensity to a new y-axis
                fill: 'origin', // Fill from the origin to the line
                tension: 0.4, // Smooth the line
                pointRadius: 0, // Hide points for a cleaner area
              },
            ]
          : []),
      ],
    };
  }, [data, selectedCommodity, showConflict]);

  // Chart options configuration
  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false, // Allows the chart to resize based on its container
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'month',
          },
          title: {
            display: true,
            text: 'Date',
          },
          ticks: {
            maxTicksLimit: 10, // Limits the number of ticks on the x-axis
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'LCU Price',
          },
          grid: {
            drawOnChartArea: true, // Grid lines for LCU Price
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'USD Price',
          },
          grid: {
            drawOnChartArea: false, // Prevents grid lines for USD Price
          },
        },
        y2: {
          type: 'linear',
          display: showConflict, // Show only if Conflict Intensity is enabled
          position: 'right',
          title: {
            display: true,
            text: 'Conflict Intensity',
          },
          grid: {
            drawOnChartArea: false, // Prevents grid lines for Conflict Intensity
          },
          ticks: {
            beginAtZero: true, // Starts Conflict Intensity axis at zero
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: (context) => {
              const date = new Date(context[0].parsed.x);
              return date.toLocaleDateString();
            },
          },
        },
        legend: {
          position: 'bottom', // Position legend below the chart
          labels: {
            boxWidth: 12, // Size of the legend boxes
            padding: 15, // Spacing between legend items
          },
        },
      },
    }),
    [showConflict]
  );

  // Display a prompt if no data is available
  if (!chartData) return <div>Please select a commodity.</div>;

  return (
    <div>
      {/* Control to toggle Conflict Intensity */}
      <div style={{ marginBottom: '16px' }}>
        <label>
          <input
            type="checkbox"
            checked={showConflict}
            onChange={() => setShowConflict(!showConflict)}
            style={{ marginRight: '8px' }}
          />
          Show Conflict Intensity
        </label>
      </div>

      {/* Line Chart */}
      <div style={{ height: '500px' }}>
        <Line options={options} data={chartData} />
      </div>
    </div>
  );
};

// PropTypes for type checking
InteractiveChart.propTypes = {
  data: PropTypes.shape({
    features: PropTypes.arrayOf(
      PropTypes.shape({
        date: PropTypes.string.isRequired, // Assuming date is a string in ISO format
        commodity: PropTypes.string.isRequired,
        regime: PropTypes.string.isRequired,
        price: PropTypes.number.isRequired,
        usdprice: PropTypes.number.isRequired,
        conflict_intensity: PropTypes.number.isRequired,
      })
    ).isRequired,
  }).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
};

export default InteractiveChart;