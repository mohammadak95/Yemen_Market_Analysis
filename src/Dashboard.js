// src/Dashboard.js

import React, { Suspense, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid } from '@mui/material';
import InteractiveChart from './components/interactive_graph/InteractiveChart';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import AnalysisWrapper from './components/common/AnalysisWrapper';
import SpatialAnalysis from './components/analysis/spatial-analysis/SpatialAnalysis';
import { useMarketAnalysis } from './hooks/useMarketAnalysis';

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

// Register ChartJS components
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

// Lazy load analysis components
const ECMAnalysisLazy = React.lazy(() =>
  import('./components/analysis/ecm/ECMAnalysis')
);
const PriceDifferentialAnalysisLazy = React.lazy(() =>
  import('./components/analysis/price-differential/PriceDifferentialAnalysis')
);
const TVMIIAnalysisLazy = React.lazy(() =>
  import('./components/analysis/tvmii/TVMIIAnalysis')
);

const Dashboard = React.memo(
  ({
    data,
    selectedAnalysis,
    selectedCommodity,
    selectedRegimes,
    selectedDate,
    windowWidth,
  }) => {
    const processedData = useMemo(() => {
      if (!data?.timeSeriesData) return [];
      return data.timeSeriesData.map((entry) => ({
        ...entry,
        date: entry.month,
      }));
    }, [data]);

    const { marketMetrics, timeSeriesAnalysis, spatialAnalysis } = useMarketAnalysis(data);

    const getAnalysisComponent = useCallback((type) => {
      const componentMap = {
        ecm: ECMAnalysisLazy,
        priceDiff: PriceDifferentialAnalysisLazy,
        spatial: SpatialAnalysis,
        tvmii: TVMIIAnalysisLazy,
      };

      return componentMap[type] || null;
    }, []);

    const renderInteractiveChart = useCallback(() => {
      if (!selectedCommodity || !selectedRegimes || selectedRegimes.length === 0) {
        return (
          <ErrorMessage message="Please select at least one regime and a commodity from the sidebar." />
        );
      }

      if (!processedData.length) {
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

    const renderAnalysisComponent = useCallback(() => {
      if (!selectedAnalysis) {
        return null;
      }

      const AnalysisComponent = getAnalysisComponent(selectedAnalysis);
      if (!AnalysisComponent) {
        return <ErrorMessage message="Selected analysis type is not available." />;
      }

      const commonProps = {
        selectedCommodity,
        windowWidth,
        data,
      };

      return (
        <Suspense fallback={<LoadingSpinner />}>
          <AnalysisWrapper>
            <AnalysisComponent {...commonProps} />
          </AnalysisWrapper>
        </Suspense>
      );
    }, [selectedAnalysis, selectedCommodity, windowWidth, data, getAnalysisComponent]);

    if (!data) {
      return (
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
        >
          <LoadingSpinner />
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Grid container spacing={2} sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Grid item xs={12}>
            <Box
              sx={{
                width: '100%',
                height: { xs: '300px', sm: '400px', md: '500px' },
                position: 'relative',
                mb: 2,
              }}
            >
              {renderInteractiveChart()}
            </Box>
          </Grid>

          {selectedAnalysis && (
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
  data: PropTypes.object, // Made optional
  selectedAnalysis: PropTypes.string,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedDate: PropTypes.string,
  windowWidth: PropTypes.number.isRequired,
};

export default Dashboard;