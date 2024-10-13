// src/components/interactive_graph/InteractiveChart.js

import React, { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip as MuiTooltip,
  IconButton,
  Grid,
  Typography,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {
  applySeasonalAdjustment,
  applySmoothing,
} from '../../utils/dataProcessing'; // Data processing functions

// Utility function to capitalize words
const capitalizeWords = (str) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  ChartTooltip,
  Legend,
  TimeScale,
  Filler
);

// Predefined color palette
const COLORS = [
  'rgba(75, 192, 192, 1)', // Teal
  'rgba(255, 99, 132, 1)', // Red
  'rgba(54, 162, 235, 1)', // Blue
  'rgba(255, 206, 86, 1)', // Yellow
  'rgba(153, 102, 255, 1)', // Purple
  'rgba(255, 159, 64, 1)', // Orange
];

const InteractiveChart = ({
  data,
  selectedCommodity,
  selectedRegimes,
}) => {
  const theme = useTheme(); // Access the theme

  // State for chart controls
  const [showConflictIntensity, setShowConflictIntensity] = useState(true);
  const [priceType, setPriceType] = useState('lcu'); // 'lcu' or 'usd'
  const [applySeasonalAdj, setApplySeasonalAdj] = useState(false);
  const [applySmooth, setApplySmooth] = useState(false);

  // Memoized chart data to optimize performance
  const chartData = useMemo(() => {
    if (!data || !selectedCommodity || selectedRegimes.length === 0)
      return null;

    // Group data by regime
    const dataByRegime = selectedRegimes.map((regime) => ({
      regime,
      data: data.filter(
        (d) =>
          d.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
          d.regime.toLowerCase() === regime.toLowerCase()
      ),
    }));

    // Remove regimes with no data
    const validDataByRegime = dataByRegime.filter(
      (regimeData) => regimeData.data.length > 0
    );

    if (validDataByRegime.length === 0) return null;

    // Generate datasets for each regime
    const datasets = [];

    validDataByRegime.forEach((regimeData, index) => {
      const color = COLORS[index % COLORS.length];
      const conflictColor = color.replace('1)', '0.2)'); // Semi-transparent for shaded area

      let processedData = regimeData.data;

      // Apply Seasonal Adjustment if enabled
      if (applySeasonalAdj) {
        processedData = applySeasonalAdjustment(
          processedData,
          [regimeData.regime],
          12,
          priceType === 'lcu'
        );
      }

      // Apply Smoothing if enabled
      if (applySmooth) {
        processedData = applySmoothing(
          processedData,
          [regimeData.regime],
          6,
          priceType === 'lcu'
        );
      }

      // Price Line Dataset
      datasets.push({
        label: `${capitalizeWords(regimeData.regime)} Price`,
        data: processedData.map((d) => ({
          x: new Date(d.date),
          y: priceType === 'lcu' ? d.price : d.usdprice,
        })),
        borderColor: color,
        backgroundColor: color,
        yAxisID: 'y',
        fill: false,
        tension: 0.3,
      });

      // Conflict Intensity Shaded Area Dataset
      if (showConflictIntensity) {
        datasets.push({
          label: `${capitalizeWords(regimeData.regime)} Conflict Intensity`,
          data: processedData.map((d) => ({
            x: new Date(d.date),
            y: d.conflict_intensity,
          })),
          borderColor: conflictColor,
          backgroundColor: conflictColor,
          yAxisID: 'y1',
          fill: 'origin', // Fill from the origin to the line
          tension: 0.3,
          pointRadius: 0, // Hide points for a cleaner area
        });
      }
    });

    return {
      datasets,
    };
  }, [
    data,
    selectedCommodity,
    selectedRegimes,
    priceType,
    showConflictIntensity,
    applySeasonalAdj,
    applySmooth,
  ]);

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
            color: theme.palette.text.primary,
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          ticks: {
            maxTicksLimit: 10,
            color: theme.palette.text.primary,
          },
          grid: {
            color: theme.palette.divider,
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text:
              priceType === 'lcu' ? 'Price (LCU)' : 'Price (US$)',
            color: theme.palette.text.primary,
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          ticks: {
            color: theme.palette.text.primary,
            callback: (value) => {
              return value.toLocaleString();
            },
          },
          grid: {
            color: theme.palette.divider,
          },
        },
        y1: {
          type: 'linear',
          display: showConflictIntensity,
          position: 'right',
          title: {
            display: true,
            text: 'Conflict Intensity',
            color: theme.palette.text.primary,
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          ticks: {
            beginAtZero: true,
            color: theme.palette.text.primary,
            callback: (value) => {
              return value.toLocaleString();
            },
          },
          grid: {
            drawOnChartArea: false,
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
              label +=
                context.parsed.y !== null
                  ? context.parsed.y.toLocaleString()
                  : '';
              return label;
            },
          },
          backgroundColor: theme.palette.background.paper,
          titleColor: theme.palette.text.primary,
          bodyColor: theme.palette.text.secondary,
        },
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 15,
            color: theme.palette.text.primary,
            font: {
              size: 12,
            },
          },
        },
      },
    }),
    [showConflictIntensity, priceType, theme.palette]
  );

  // Display a prompt if no data is available
  if (!chartData)
    return (
      <Typography>
        Please select at least one regime and a commodity.
      </Typography>
    );

  return (
    <Box>
      {/* Controls Panel */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Grid
          container
          spacing={2}
          alignItems="center"
          justifyContent="center"
        >
          {/* Toggle Controls */}
          <Grid item xs={12} md="auto">
            <ToggleButtonGroup
              value={priceType}
              exclusive
              onChange={(e, newValue) => {
                if (newValue !== null) setPriceType(newValue);
              }}
              aria-label="Price Type"
              size="small"
            >
              <ToggleButton value="lcu" aria-label="Price in LCU">
                LCU
              </ToggleButton>
              <ToggleButton value="usd" aria-label="Price in US$">
                US$
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12} md="auto">
            <ToggleButtonGroup
              value={applySeasonalAdj}
              exclusive
              onChange={() => setApplySeasonalAdj(!applySeasonalAdj)}
              aria-label="Seasonal Adjustment"
              size="small"
            >
              <ToggleButton value={true} selected={applySeasonalAdj}>
                Seasonal Adjustment
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12} md="auto">
            <ToggleButtonGroup
              value={applySmooth}
              exclusive
              onChange={() => setApplySmooth(!applySmooth)}
              aria-label="Smoothing"
              size="small"
            >
              <ToggleButton value={true} selected={applySmooth}>
                Smoothing
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12} md="auto">
            <ToggleButtonGroup
              value={showConflictIntensity}
              exclusive
              onChange={() =>
                setShowConflictIntensity(!showConflictIntensity)
              }
              aria-label="Conflict Intensity"
              size="small"
            >
              <ToggleButton value={true} selected={showConflictIntensity}>
                Conflict Intensity
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* Help Icon */}
          <Grid item xs={12} md="auto">
            <MuiTooltip title="Use the toggles to customize the chart display.">
              <IconButton>
                <HelpOutlineIcon />
              </IconButton>
            </MuiTooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Line Chart */}
      <Box
        sx={{
          height: { xs: '300px', sm: '400px', md: '500px' },
          width: '100%',
        }}
      >
        <Line options={options} data={chartData} />
      </Box>
    </Box>
  );
};

// PropTypes for type checking
InteractiveChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      commodity: PropTypes.string.isRequired,
      regime: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      usdprice: PropTypes.number.isRequired, // Assuming you have usdprice
      conflict_intensity: PropTypes.number.isRequired,
    })
  ).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default InteractiveChart;