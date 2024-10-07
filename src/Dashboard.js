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
  Grid,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tooltip as MuiTooltip,
  IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import { applySeasonalAdjustment, applySmoothing } from './utils/dataProcessing';

const ECMAnalysis = React.lazy(() => import('./components/ecm-analysis/ECMAnalysis'));
const PriceDifferentialAnalysis = React.lazy(() =>
  import('./components/price-differential-analysis/PriceDifferentialAnalysis')
);
const SpatialAnalysis = React.lazy(() => import('./components/spatial-analysis/SpatialAnalysis'));

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

const Dashboard = ({ data, selectedCommodity, selectedRegime, selectedAnalysis }) => {
  const [showConflictIntensity, setShowConflictIntensity] = useState(true);
  const [priceType, setPriceType] = useState('lcu');
  const [applySeasonalAdj, setApplySeasonalAdj] = useState(false);
  const [applySmooth, setApplySmooth] = useState(false);
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data || !selectedCommodity || !selectedRegime) return null;

    let filteredData = data.features
      .filter(
        (d) => d.commodity === selectedCommodity && d.regime === selectedRegime
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (filteredData.length === 0) return null;

    if (applySeasonalAdj) {
      filteredData = applySeasonalAdjustment(filteredData, [selectedRegime], 12, priceType === 'lcu');
    }

    if (applySmooth) {
      filteredData = applySmoothing(filteredData, [selectedRegime], 6, priceType === 'lcu');
    }

    return {
      labels: filteredData.map((d) => new Date(d.date)),
      datasets: [
        {
          label: priceType === 'lcu' ? 'Price (LCU)' : 'Price (US$)',
          data: filteredData.map((d) => (priceType === 'lcu' ? d.price : d.usdprice)),
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
                data: filteredData.map((d) => d.conflict_intensity),
                borderColor: theme.palette.error.main,
                backgroundColor: theme.palette.error.light,
                yAxisID: 'y1',
                fill: true,
                tension: 0.4,
              },
            ]
          : []),
      ],
    };
  }, [
    data,
    selectedCommodity,
    selectedRegime,
    showConflictIntensity,
    priceType,
    applySeasonalAdj,
    applySmooth,
    theme.palette,
  ]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
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
            maxTicksLimit: 10,
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: priceType === 'lcu' ? 'Price (LCU)' : 'Price (US$)',
          },
          grid: {
            drawOnChartArea: true,
          },
        },
        y1: {
          type: 'linear',
          display: showConflictIntensity,
          position: 'right',
          title: {
            display: true,
            text: 'Conflict Intensity',
          },
          min: 0,
          max: 10,
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: (context) => {
              return new Date(context[0].parsed.x).toLocaleDateString();
            },
          },
        },
        legend: {
          position: 'bottom', // Changed from 'top' to 'bottom'
          labels: {
            boxWidth: 12, // Optional: Adjust the size of the legend boxes
            padding: 15,  // Optional: Adjust the spacing between legend items
          },
        },
      },
    }),
    [showConflictIntensity, priceType]
  );

  return (
    <Box
      sx={{
        mt: 4,
        mb: 4,
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        px: { xs: 2, sm: 4 },
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
          height: { xs: 400, sm: 500, md: 600 },
        }}
      >
        {chartData ? (
          <Box sx={{ width: '100%', height: '100%', paddingBottom: '50px' }}> {/* Added paddingBottom */}
            <Line data={chartData} options={options} />
          </Box>
        ) : (
          <ErrorMessage message="No data available for the selected commodity and regime." />
        )}
      </Paper>

      {/* Conditional Analysis Components */}
      {selectedAnalysis && (
        <Box sx={{ mt: 4, width: '100%', maxWidth: 1200 }}>
          <Paper
            elevation={3}
            sx={{
              p: { xs: 3, md: 4 },
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: 2,
            }}
          >
            <Suspense
              fallback={
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <LoadingSpinner />
                </Box>
              }
            >
              {selectedAnalysis === 'ecm' && (
                <ECMAnalysis selectedCommodity={selectedCommodity} selectedRegime={selectedRegime} />
              )}
              {selectedAnalysis === 'priceDiff' && (
                <PriceDifferentialAnalysis
                  selectedCommodity={selectedCommodity}
                  selectedRegime={selectedRegime}
                />
              )}
              {selectedAnalysis === 'spatial' && (
                <SpatialAnalysis selectedCommodity={selectedCommodity} selectedRegime={selectedRegime} />
              )}
            </Suspense>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

Dashboard.propTypes = {
  data: PropTypes.object.isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
  selectedAnalysis: PropTypes.string.isRequired,
};

export default Dashboard;