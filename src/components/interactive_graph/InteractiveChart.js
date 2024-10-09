// src/components/interactive_graph/InteractiveChart.js

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
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Grid,
  Typography,
  Tooltip as MuiTooltip,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { applySeasonalAdjustment, applySmoothing } from '../../utils/dataProcessing'; // Data processing functions

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
  Title,
  Tooltip,
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
    if (!data || !selectedCommodity || selectedRegimes.length === 0) return null;

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
    const validDataByRegime = dataByRegime.filter((regimeData) => regimeData.data.length > 0);

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
            text: priceType === 'lcu' ? 'Price (LCU)' : 'Price (US$)',
            color: theme.palette.text.primary, // Set title color
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          ticks: {
            color: theme.palette.text.primary, // Set tick color
            callback: (value) => {
              return value.toLocaleString(); // Format numbers with commas
            },
          },
          grid: {
            color: theme.palette.divider, // Use theme divider color
          },
        },
        y1: {
          type: 'linear',
          display: showConflictIntensity, // Show only if Conflict Intensity is enabled
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
          ticks: {
            beginAtZero: true, // Starts Conflict Intensity axis at zero
            color: theme.palette.text.primary, // Set tick color
            callback: (value) => {
              return value.toLocaleString(); // Format numbers with commas
            },
          },
          grid: {
            drawOnChartArea: false, // Prevents grid lines for Conflict Intensity
            color: theme.palette.divider, // Use theme divider color if needed
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
              label += context.parsed.y !== null ? context.parsed.y.toLocaleString() : '';
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
    [showConflictIntensity, priceType, theme.palette]
  );

  // Display a prompt if no data is available
  if (!chartData) return <Typography>Please select at least one regime and a commodity.</Typography>;

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
        <Grid container spacing={3} alignItems="center">
          {/* Price Type Dropdown */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="price-type-label">Price Type</InputLabel>
              <Select
                labelId="price-type-label"
                value={priceType}
                onChange={(e) => setPriceType(e.target.value)}
                label="Price Type"
              >
                <MenuItem value="lcu">Price in LCU</MenuItem>
                <MenuItem value="usd">Price in US$</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {/* Tooltip for Price Type */}
          <Grid item xs={12} sm={6} md={1}>
            <MuiTooltip title="Select the currency type for price display">
              <IconButton>
                <HelpOutlineIcon />
              </IconButton>
            </MuiTooltip>
          </Grid>

          {/* Apply Seasonal Adjustment */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={applySeasonalAdj}
                  onChange={() => setApplySeasonalAdj(!applySeasonalAdj)}
                  color="primary"
                />
              }
              label="Apply Seasonal Adjustment"
            />
          </Grid>
          {/* Tooltip for Seasonal Adjustment */}
          <Grid item xs={12} sm={6} md={1}>
            <MuiTooltip title="Toggle seasonal adjustment on the price data">
              <IconButton>
                <HelpOutlineIcon />
              </IconButton>
            </MuiTooltip>
          </Grid>

          {/* Apply Smoothing */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={applySmooth}
                  onChange={() => setApplySmooth(!applySmooth)}
                  color="primary"
                />
              }
              label="Apply Smoothing"
            />
          </Grid>
          {/* Tooltip for Smoothing */}
          <Grid item xs={12} sm={6} md={1}>
            <MuiTooltip title="Toggle smoothing on the price data">
              <IconButton>
                <HelpOutlineIcon />
              </IconButton>
            </MuiTooltip>
          </Grid>

          {/* Show Conflict Intensity */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showConflictIntensity}
                  onChange={() => setShowConflictIntensity(!showConflictIntensity)}
                  color="error"
                />
              }
              label="Show Conflict Intensity"
            />
          </Grid>
          {/* Tooltip for Conflict Intensity */}
          <Grid item xs={12} sm={6} md={1}>
            <MuiTooltip title="Toggle the visibility of Conflict Intensity on the chart">
              <IconButton>
                <HelpOutlineIcon />
              </IconButton>
            </MuiTooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Line Chart */}
      <Box sx={{ height: '500px', width: '100%' }}>
        <Line options={options} data={chartData} />
      </Box>
    </Box>
  );
};

// PropTypes for type checking
InteractiveChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired, // Assuming date is a string in ISO format
      commodity: PropTypes.string.isRequired,
      regime: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      usdprice: PropTypes.number.isRequired,
      conflict_intensity: PropTypes.number.isRequired,
    })
  ).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default InteractiveChart;