// src/Dashboard.js

import React, { Suspense, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid } from '@mui/material';
import InteractiveChart from './components/interactive_graph/InteractiveChart';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import AnalysisWrapper from './utils/AnalysisWrapper';

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
const Tutorials = React.lazy(() =>
  import('./components/tutorials/Tutorials')
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
    windowWidth,
  }) => {

    // Memoize processedData to optimize performance
    const processedData = useMemo(() => {
      if (data?.features) {
        return data.features.map((feature) => ({
          ...feature,
          date:
            feature.date instanceof Date
              ? feature.date.toISOString()
              : feature.date,
        }));
      }
      return [];
    }, [data]);

    // Determine which analysis component to render
    const AnalysisComponent = useMemo(() => {
      const components = {
        ecm: ECMAnalysis,
        priceDiff: PriceDifferentialAnalysis,
        spatial: SpatialAnalysis,
        tutorials: Tutorials,
      };
      return components[selectedAnalysis] || null;
    }, [selectedAnalysis]);

    // Render the interactive chart component
    const renderInteractiveChart = useCallback(() => {
      if (!selectedCommodity || selectedRegimes.length === 0) {
        return (
          <ErrorMessage message="Please select at least one regime and a commodity from the sidebar." />
        );
      }

      if (!processedData || processedData.length === 0) {
        return <LoadingSpinner />;
      }

      return (
        <InteractiveChart
          data={processedData}
          selectedCommodity={selectedCommodity}
          selectedRegimes={selectedRegimes}
        />
      );
    }, [processedData, selectedCommodity, selectedRegimes]);

    // Render the analysis component
    const renderAnalysisComponent = useCallback(() => {
      if (selectedAnalysis && AnalysisComponent) {
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AnalysisWrapper>
              <AnalysisComponent
                selectedCommodity={selectedCommodity}
                windowWidth={windowWidth}
              />
            </AnalysisWrapper>
          </Suspense>
        );
      }
      return null;
    }, [selectedAnalysis, AnalysisComponent, selectedCommodity, windowWidth]);

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <Grid container spacing={2} sx={{ flexGrow: 1, overflow: 'auto' }}>
          {/* Interactive Chart Section */}
          <Grid item xs={12}>
            <Box
              sx={{
                width: '100%',
                height: { xs: '300px', sm: '400px', md: '500px' }, // Responsive height
                position: 'relative',
                mb: 2 // Add bottom margin
              }}
            >
              {renderInteractiveChart()}
            </Box>
          </Grid>

          {/* Analysis Components Section */}
          {selectedAnalysis && AnalysisComponent && (
            <Grid item xs={12}>
              {renderAnalysisComponent()}
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
        usdprice: PropTypes.number,
        conflict_intensity: PropTypes.number,
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
  windowWidth: PropTypes.number.isRequired,
};

export default Dashboard;