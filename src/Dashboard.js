// src/Dashboard.js

import React, { Suspense, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Paper, Grid, Typography, Fade } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InteractiveChart from './components/interactive_graph/InteractiveChart';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';

// Lazy load analysis components
const ECMAnalysis = React.lazy(() =>
  import('./components/ecm-analysis/ECMAnalysis')
);
const PriceDifferentialAnalysis = React.lazy(() =>
  import('./components/price-differential-analysis/PriceDifferentialAnalysis')
);
const SpatialAnalysis = React.lazy(() =>
  import('./components/spatial-analysis/SpatialAnalysis')
);

// Register Chart.js components
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

const Dashboard = React.memo(
  ({
    data,
    selectedAnalysis,
    selectedCommodity,
    selectedRegimes,
  }) => {
    const theme = useTheme();

    // Memoize processedData to optimize performance
    const processedData = useMemo(() => {
      if (data?.features) {
        return {
          ...data,
          features: data.features.map((feature) => ({
            ...feature,
            date:
              feature.date instanceof Date
                ? feature.date.toISOString()
                : feature.date,
          })),
        };
      }
      return data;
    }, [data]);

    // Memoize the analysis component to prevent re-renders
    const AnalysisComponent = useMemo(() => {
      const components = {
        ecm: ECMAnalysis,
        priceDiff: PriceDifferentialAnalysis,
        spatial: SpatialAnalysis,
      };
      return components[selectedAnalysis] || null;
    }, [selectedAnalysis]);

    // Memoize the analysis title with more descriptive text
    const analysisTitle = useMemo(() => {
      const titles = {
        ecm: 'Error Correction Model (ECM) Analysis',
        priceDiff: 'Price Differential Analysis',
        spatial: 'Spatial Analysis',
      };
      return titles[selectedAnalysis] || 'Analysis';
    }, [selectedAnalysis]);

    // Render the interactive chart component
    const renderInteractiveChart = useCallback(() => {
      if (!selectedCommodity || selectedRegimes.length === 0) {
        return (
          <ErrorMessage message="Please select at least one regime and a commodity from the sidebar." />
        );
      }

      if (!processedData?.features || processedData.features.length === 0) {
        return <LoadingSpinner />;
      }

      return (
        <InteractiveChart
          data={processedData.features}
          selectedCommodity={selectedCommodity}
          selectedRegimes={selectedRegimes}
        />
      );
    }, [
      processedData?.features,
      selectedCommodity,
      selectedRegimes,
    ]);

    return (
      <Box
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2, md: 3 },
          backgroundColor: theme.palette.background.default,
          minHeight: '100vh',
        }}
      >
        <Grid container spacing={2} justifyContent="center">
          {/* Interactive Chart Section */}
          <Grid item xs={12}>
            <Paper
              elevation={3}
              sx={{
                p: { xs: 1, sm: 2, md: 3 },
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Typography variant="h5" gutterBottom>
                Interactive Commodity Price Chart
              </Typography>
              <Box sx={{ mt: 2 }}>{renderInteractiveChart()}</Box>
            </Paper>
          </Grid>

          {/* Analysis Components Section with Fade Transition */}
          {selectedAnalysis && (
            <Grid item xs={12}>
              <Fade in={Boolean(selectedAnalysis)} timeout={500}>
                <Paper
                  elevation={3}
                  sx={{
                    p: { xs: 1, sm: 2, md: 3 },
                    borderRadius: 2,
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  <Typography variant="h5" gutterBottom>
                    {analysisTitle}
                  </Typography>
                  <Suspense fallback={<LoadingSpinner />}>
                    {AnalysisComponent && (
                      <AnalysisComponent
                        selectedCommodity={selectedCommodity}
                        selectedRegime="unified"
                      />
                    )}
                  </Suspense>
                </Paper>
              </Fade>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  }
);

Dashboard.displayName = 'Dashboard';

Dashboard.propTypes = {
  data: PropTypes.shape({
    features: PropTypes.arrayOf(
      PropTypes.shape({
        date: PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.instanceOf(Date),
        ]).isRequired,
        commodity: PropTypes.string.isRequired,
        regime: PropTypes.string.isRequired,
        price: PropTypes.number,
      })
    ),
    commodities: PropTypes.arrayOf(PropTypes.string),
    regimes: PropTypes.arrayOf(PropTypes.string),
    dateRange: PropTypes.shape({
      min: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(Date),
      ]),
      max: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(Date),
      ]),
    }),
  }),
  selectedAnalysis: PropTypes.string.isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default Dashboard;