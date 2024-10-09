// src/Dashboard.js

import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Fade, // Import Fade transition
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InteractiveChart from './components/interactive_graph/InteractiveChart';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';

// Lazy load analysis components
const ECMAnalysis = React.lazy(() => import('./components/ecm-analysis/ECMAnalysis'));
const PriceDifferentialAnalysis = React.lazy(() =>
  import('./components/price-differential-analysis/PriceDifferentialAnalysis')
);
const SpatialAnalysis = React.lazy(() => import('./components/spatial-analysis/SpatialAnalysis'));

// Register Chart.js components (if not already registered globally)
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

const Dashboard = ({ data, selectedAnalysis, selectedCommodity, selectedRegimes }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: { xs: 2, sm: 3 },
        backgroundColor: theme.palette.background.default,
        minHeight: '100vh',
      }}
    >
      <Grid container spacing={4} justifyContent="center">
        {/* Interactive Chart Section */}
        <Grid item xs={12}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Interactive Chart
            </Typography>
            {selectedCommodity && selectedRegimes.length > 0 ? (
              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <InteractiveChart
                  data={data.features}
                  selectedCommodity={selectedCommodity}
                  selectedRegimes={selectedRegimes}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  mt: 2,
                }}
              >
                <ErrorMessage message="Please select at least one regime and a commodity from the sidebar." />
              </Box>
            )} {/* Added closing parenthesis here */}
          </Paper>
        </Grid>

        {/* Analysis Components Section with Fade Transition */}
        {selectedAnalysis && (
          <Grid item xs={12}>
            <Fade in={Boolean(selectedAnalysis)} timeout={500}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  {getAnalysisTitle(selectedAnalysis)}
                </Typography>
                <Suspense fallback={<LoadingSpinner />}>
                  {renderAnalysisComponent(selectedAnalysis, selectedCommodity, selectedRegimes)}
                </Suspense>
              </Paper>
            </Fade>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

// Helper function to get analysis title
const getAnalysisTitle = (analysis) => {
  switch (analysis) {
    case 'ecm':
      return 'ECM Analysis';
    case 'priceDiff':
      return 'Price Differential Analysis';
    case 'spatial':
      return 'Spatial Analysis';
    default:
      return 'Analysis';
  }
};

// Helper function to render analysis components
const renderAnalysisComponent = (analysis, commodity, regimes) => {
  switch (analysis) {
    case 'ecm':
      return (
        <ECMAnalysis
          selectedCommodity={commodity}
          selectedRegime="unified" // Always 'unified'
        />
      );
    case 'priceDiff':
      return (
        <PriceDifferentialAnalysis
          selectedCommodity={commodity}
          selectedRegime="unified" // Always 'unified'
        />
      );
    case 'spatial':
      return (
        <SpatialAnalysis
          selectedCommodity={commodity}
          selectedRegime={regimes} // Spatial Analysis uses selectedRegimes
        />
      );
    default:
      return <ErrorMessage message="Invalid analysis selected." />;
  }
};

Dashboard.propTypes = {
  data: PropTypes.object.isRequired, // Adjusted to match App.js passing data as prop
  selectedAnalysis: PropTypes.string.isRequired, // Expected values: 'ecm', 'priceDiff', 'spatial'
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default Dashboard;
