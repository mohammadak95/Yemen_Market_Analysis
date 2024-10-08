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
import { useTheme } from '@mui/material/styles'; // Import useTheme
import {
  Box,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip as MuiTooltip,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

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
  const theme = useTheme(); // Access the theme

  // State to control the visibility of Conflict Intensity
  const [showConflict, setShowConflict] = useState(true);

  // Memoized chart data to optimize performance
  const chartData = useMemo(() => {
    if (!data || !selectedCommodity) return null;

    // Filter and sort data based on selected commodity and unified regime
    const filteredData = data.features
      .filter(
        (d) =>
          d.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
          d.regime.toLowerCase() === 'unified'
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (filteredData.length === 0) return null;

    return {
      labels: filteredData.map((d) => new Date(d.date)),
      datasets: [
        {
          label: 'LCU Price',
          data: filteredData.map((d) => d.price),
          borderColor: theme.palette.primary.main, // Use theme primary color
          backgroundColor: theme.palette.primary.light, // Use theme primary light color
          yAxisID: 'y', // Assign LCU price to the first y-axis
          fill: false,
          tension: 0.4, // Smooth the line
        },
        {
          label: 'USD Price',
          data: filteredData.map((d) => d.usdprice),
          borderColor: theme.palette.secondary.main, // Use theme secondary color
          backgroundColor: theme.palette.secondary.light, // Use theme secondary light color
          yAxisID: 'y1', // Assign USD price to the second y-axis
          fill: false,
          tension: 0.4, // Smooth the line
        },
        ...(showConflict
          ? [
              {
                label: 'Conflict Intensity',
                data: filteredData.map((d) => d.conflict_intensity),
                borderColor: theme.palette.error.main, // Use theme error color
                backgroundColor: theme.palette.error.light, // Use theme error light color
                yAxisID: 'y2', // Assign Conflict Intensity to a new y-axis
                fill: 'origin', // Fill from the origin to the line
                tension: 0.4, // Smooth the line
                pointRadius: 0, // Hide points for a cleaner area
              },
            ]
          : []),
      ],
    };
  }, [data, selectedCommodity, showConflict, theme.palette]);

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
            color: theme.palette.text.primary, // Set title color
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          ticks: {
            maxTicksLimit: 10, // Limits the number of ticks on the x-axis
            color: theme.palette.text.primary, // Set tick color
          },
          grid: {
            color: theme.palette.divider, // Use theme divider color
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'LCU Price',
            color: theme.palette.text.primary, // Set title color
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          grid: {
            drawOnChartArea: true, // Grid lines for LCU Price
            color: theme.palette.divider, // Use theme divider color
          },
          ticks: {
            color: theme.palette.text.primary, // Set tick color
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'USD Price',
            color: theme.palette.text.primary, // Set title color
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          grid: {
            drawOnChartArea: false, // Prevents grid lines for USD Price
            color: theme.palette.divider, // Use theme divider color if needed
          },
          ticks: {
            color: theme.palette.text.primary, // Set tick color
          },
        },
        y2: {
          type: 'linear',
          display: showConflict, // Show only if Conflict Intensity is enabled
          position: 'right',
          title: {
            display: true,
            text: 'Conflict Intensity',
            color: theme.palette.text.primary, // Set title color
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          grid: {
            drawOnChartArea: false, // Prevents grid lines for Conflict Intensity
            color: theme.palette.divider, // Use theme divider color if needed
          },
          ticks: {
            beginAtZero: true, // Starts Conflict Intensity axis at zero
            color: theme.palette.text.primary, // Set tick color
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
            label: (context) => {
              let label = `${context.dataset.label}: `;
              label += context.parsed.y !== null ? context.parsed.y.toFixed(2) : '';
              return label;
            },
          },
          backgroundColor: theme.palette.background.paper, // Tooltip background
          titleColor: theme.palette.text.primary, // Tooltip title color
          bodyColor: theme.palette.text.secondary, // Tooltip body color
        },
        legend: {
          position: 'bottom', // Position legend below the chart
          labels: {
            boxWidth: 12, // Size of the legend boxes
            padding: 15, // Spacing between legend items
            color: theme.palette.text.primary, // Use theme text primary color
            font: {
              size: 12,
            },
          },
        },
      },
    }),
    [showConflict, theme.palette]
  );

  // Display a prompt if no data is available
  if (!chartData) return <div>Please select a commodity.</div>;

  return (
    <Box>
      {/* Control to toggle Conflict Intensity */}
      <Box sx={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={showConflict}
              onChange={() => setShowConflict(!showConflict)}
              color="error" // Use theme error color for the checkbox
            />
          }
          label="Show Conflict Intensity"
        />
        <MuiTooltip title="Toggle the visibility of Conflict Intensity on the chart">
          <IconButton aria-label="help">
            <HelpOutlineIcon />
          </IconButton>
        </MuiTooltip>
      </Box>

      {/* Line Chart */}
      <Box sx={{ height: '500px', width: '100%' }}>
        <Line options={options} data={chartData} />
      </Box>
    </Box>
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