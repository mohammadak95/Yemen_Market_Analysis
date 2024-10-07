//src/components/Dashboard.js

import React, { useMemo, Suspense } from 'react';
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
  useTheme,
  Typography,
  Container,
} from '@mui/material';
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
  Legend
);

const Dashboard = ({ data, selectedCommodity, selectedRegime, selectedAnalysis }) => {
  const [showConflictIntensity, setShowConflictIntensity] = React.useState(true);
  const [showResidual, setShowResidual] = React.useState(false);
  const [priceType, setPriceType] = React.useState('lcu');
  const [applySeasonalAdj, setApplySeasonalAdj] = React.useState(false);
  const [applySmooth, setApplySmooth] = React.useState(false);
  const theme = useTheme();

  const chartData = useMemo(() => {
    if (!data || !selectedCommodity || !selectedRegime) return null;

    let filteredData = data.features
      .filter(
        (d) =>
          d.commodity === selectedCommodity &&
          d.regime === selectedRegime
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (filteredData.length === 0) return null;

    // Apply seasonal adjustment if toggled
    if (applySeasonalAdj) {
      filteredData = applySeasonalAdjustment(filteredData, [selectedRegime], 12, priceType === 'lcu');
    }

    // Apply smoothing if toggled
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
        ...(showResidual
          ? [
              {
                label: 'Residual',
                data: filteredData.map((d) => d.residual),
                borderColor: theme.palette.secondary.main,
                backgroundColor: theme.palette.secondary.light,
                yAxisID: 'y2',
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
    showResidual,
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
        y2: {
          type: 'linear',
          display: showResidual,
          position: 'right',
          title: {
            display: true,
            text: 'Residual',
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
              return new Date(context[0].parsed.x).toLocaleDateString();
            },
          },
        },
        legend: {
          position: 'top',
        },
      },
    }),
    [showConflictIntensity, showResidual, priceType]
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Heading */}
      <Typography variant="h5" gutterBottom>
        Market Analysis
      </Typography>

      {/* Selectors */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          {/* Left Column */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 2 }}>
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
          {/* Right Column */}
          <Grid item xs={12} md={6}>
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
            <FormControlLabel
              control={
                <Checkbox
                  checked={showResidual}
                  onChange={() => setShowResidual(!showResidual)}
                  color="secondary"
                />
              }
              label="Show Residual"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Chart */}
      <Paper
        sx={{
          p: 2,
          height: '500px',
          mb: 2,
        }}
      >
        {chartData ? (
          <Line data={chartData} options={options} />
        ) : (
          <ErrorMessage message="No data available for the selected commodity and regime." />
        )}
      </Paper>

      {/* Analysis Section */}
      {selectedAnalysis && (
        <Box sx={{ mt: 4 }}>
          <Suspense fallback={<LoadingSpinner />}>
            {selectedAnalysis === 'ecm' && <ECMAnalysis />}
            {selectedAnalysis === 'priceDiff' && <PriceDifferentialAnalysis />}
            {selectedAnalysis === 'spatial' && <SpatialAnalysis />}
          </Suspense>
        </Box>
      )}
    </Container>
  );
};

Dashboard.propTypes = {
  data: PropTypes.object.isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegime: PropTypes.string.isRequired,
  selectedAnalysis: PropTypes.string.isRequired,
};

export default Dashboard;
