// src/Dashboard.js
import React, { useMemo, Suspense, useState } from 'react';
import PropTypes from 'prop-types';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import {
  Box,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tooltip as MuiTooltip,
  IconButton,
  Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import { applySeasonalAdjustment, applySmoothing } from './utils/dataProcessing';

// Lazy load analysis components
const ECMAnalysis = React.lazy(() => import('./components/ecm-analysis/ECMAnalysis'));
const PriceDifferentialAnalysis = React.lazy(() =>
  import('./components/price-differential-analysis/PriceDifferentialAnalysis')
);
const SpatialAnalysis = React.lazy(() => import('./components/spatial-analysis/SpatialAnalysis'));

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = ({ data, selectedCommodity, selectedRegimes, selectedAnalysis }) => {
  // State for chart controls
  const [showConflictIntensity, setShowConflictIntensity] = useState(true);
  const [priceType, setPriceType] = useState('lcu'); // 'lcu' or 'usd'
  const [applySeasonalAdj, setApplySeasonalAdj] = useState(false);
  const [applySmooth, setApplySmooth] = useState(false);
  const theme = useTheme();

  // **Chart Data Preparation for Multiple Regimes**
  const chartData = useMemo(() => {
    if (!data || !selectedCommodity || selectedRegimes.length === 0) return null;

    // Aggregate data from selected regimes
    let aggregatedData = [];

    selectedRegimes.forEach((regime) => {
      const regimeData = data.features
        .filter(
          (d) =>
            d.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
            d.regime.toLowerCase() === regime.toLowerCase()
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (regimeData.length > 0) {
        let processedData = regimeData;

        // Apply Seasonal Adjustment if enabled
        if (applySeasonalAdj) {
          processedData = applySeasonalAdjustment(regimeData, [regime], 12, priceType === 'lcu');
        }

        // Apply Smoothing if enabled
        if (applySmooth) {
          processedData = applySmoothing(regimeData, [regime], 6, priceType === 'lcu');
        }

        aggregatedData = aggregatedData.concat(processedData);
      }
    });

    if (aggregatedData.length === 0) return null;

    // Sort aggregated data by date
    aggregatedData.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      labels: aggregatedData.map((d) => new Date(d.date)),
      datasets: [
        {
          label: priceType === 'lcu' ? 'Price (LCU)' : 'Price (US$)',
          data: aggregatedData.map((d) => (priceType === 'lcu' ? d.price : d.usdprice)),
          borderColor: theme.palette.primary.main,
          backgroundColor: theme.palette.primary.light,
          yAxisID: 'y',
          tension: 0.4,
          fill: false,
        },

        ...(showConflictIntensity
          ? [
              {
                label: 'Conflict Intensity',
                data: aggregatedData.map((d) => d.conflict_intensity),
                borderColor: theme.palette.error.main,
                backgroundColor: theme.palette.error.light,
                yAxisID: 'y1',
                fill: 'origin',
                tension: 0.4,
                pointRadius: 0,
              },
            ]
          : []),
      ],
    };
  }, [
    data,
    selectedCommodity,
    selectedRegimes,
    showConflictIntensity,
    priceType,
    applySeasonalAdj,
    applySmooth,
    theme.palette,
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
            text: priceType === 'lcu' ? 'Price (LCU)' : 'Price (US$)',
            color: theme.palette.text.primary,
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          grid: {
            drawOnChartArea: true,
            color: theme.palette.divider,
          },
          ticks: {
            color: theme.palette.text.primary,
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
          grid: {
            drawOnChartArea: false,
            color: theme.palette.divider,
          },
          ticks: {
            beginAtZero: true,
            color: theme.palette.text.primary,
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
  if (!chartData) return <div>Please select at least one regime and a commodity.</div>;

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        p: { xs: 2, sm: 3 },
        alignItems: 'center', // Center child components horizontally
      }}
    >
      {/* Controls Panel */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 4,
          width: '100%',
          maxWidth: 1200,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
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

          {/* Show Conflict Intensity */}
          <Grid item xs={12} sm={6} md={2}>
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
        </Grid>
      </Paper>

      {/* Chart */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          flexGrow: 1,
          width: '100%',
          maxWidth: 1200,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 2,
          height: { xs: '300px', sm: '400px', md: '500px' }, // Responsive heights
          backgroundColor: theme.palette.background.paper,
        }}
      >
        {chartData ? (
          <Box sx={{ width: '100%', height: '100%' }}>
            <Line options={options} data={chartData} />
          </Box>
        ) : (
          <ErrorMessage message="No data available for the selected commodity and regimes." />
        )}
      </Paper>

      {/* Conditional Analysis Components */}
      {selectedAnalysis && (
        <Box sx={{ mt: 4, width: '100%', maxWidth: 1200, mx: 'auto' }}>
          <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
            <Suspense fallback={<LoadingSpinner />}>
              {/* Pass 'unified' as the regime to ECM and Price Differential analyses */}
              {selectedAnalysis === 'ecm' && (
                <ECMAnalysis
                  selectedCommodity={selectedCommodity}
                  selectedRegime={'unified'} // Always 'unified'
                />
              )}
              {selectedAnalysis === 'priceDiff' && (
                <PriceDifferentialAnalysis
                  selectedCommodity={selectedCommodity}
                  selectedRegime={'unified'} // Always 'unified'
                />
              )}
              {selectedAnalysis === 'spatial' && (
                <SpatialAnalysis
                  selectedCommodity={selectedCommodity}
                  selectedRegime={selectedRegimes} // Spatial Analysis still uses selectedRegime
                />
              )}
            </Suspense>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

// **Update PropTypes to include selectedRegimes**
Dashboard.propTypes = {
  data: PropTypes.object.isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedAnalysis: PropTypes.string.isRequired, // Expected values: 'ecm', 'priceDiff', 'spatial'
};

export default Dashboard;