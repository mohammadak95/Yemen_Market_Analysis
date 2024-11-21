//src/Dashboard.js

import React, { Suspense, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid } from '@mui/material';
import { useSelector } from 'react-redux';
import InteractiveChart from './components/interactive_graph/InteractiveChart';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import AnalysisWrapper from './components/common/AnalysisWrapper';
import SpatialAnalysis from './components/analysis/spatial-analysis/SpatialAnalysis';
import _ from 'lodash';

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
  selectSpatialData, 
  selectFlowData,
  selectTimeSeriesData,
  selectMarketClusters,
  selectVisualizationMode
} from './slices/spatialSlice';

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

// Split lazy imports for better error handling
const ECMAnalysisLazy = React.lazy(() =>
  import('./components/analysis/ecm/ECMAnalysis').then((module) => {
    if (!module.default) {
      throw new Error('ECMAnalysis component not found');
    }
    return module;
  })
);

const PriceDifferentialAnalysisLazy = React.lazy(() =>
  import('./components/analysis/price-differential/PriceDifferentialAnalysis').then(
    (module) => {
      if (!module.default) {
        throw new Error('PriceDifferentialAnalysis component not found');
      }
      return module;
    }
  )
);

const TVMIIAnalysisLazy = React.lazy(() =>
  import('./components/analysis/tvmii/TVMIIAnalysis').then((module) => {
    if (!module.default) {
      throw new Error('TVMIIAnalysis component not found');
    }
    return module;
  })
);

// Create stable selectors
const selectDashboardData = state => ({
  timeSeriesData: state.spatial?.data?.timeSeriesData || [],
  loading: state.spatial?.status?.loading || false,
  error: state.spatial?.status?.error || null,
  visualizationMode: state.spatial?.ui?.visualizationMode || null,
  spatialData: state.spatial?.data || {}
});

const Dashboard = React.memo(({
  selectedAnalysis,
  selectedCommodity,
  selectedRegimes,
  windowWidth,
  spatialViewConfig,
  onSpatialViewChange,
}) => {
  // Use single selector for all needed data to prevent multiple re-renders
  const {
    timeSeriesData,
    loading,
    error,
    visualizationMode,
    spatialData
  } = useSelector(selectDashboardData, _.isEqual);

  // Memoize data processing
  const processedData = useMemo(() => {
    if (!timeSeriesData?.length || !selectedCommodity || !selectedRegimes?.length) {
      return [];
    }
    
    return timeSeriesData
      .filter(item => 
        item.commodity?.toLowerCase() === selectedCommodity?.toLowerCase() &&
        selectedRegimes.includes(item.regime?.toLowerCase())
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [timeSeriesData, selectedCommodity, selectedRegimes]);

  // Memoize analysis component mapping
  const analysisComponents = useMemo(() => ({
    ecm: ECMAnalysisLazy,
    priceDiff: PriceDifferentialAnalysisLazy,
    spatial: SpatialAnalysis,
    tvmii: TVMIIAnalysisLazy
  }), []);

  // Memoize analysis component selection
  const getAnalysisComponent = useCallback((type) => {
    return analysisComponents[type] || null;
  }, [analysisComponents]);

  // Memoize chart rendering
  const renderInteractiveChart = useCallback(() => {
    if (!selectedCommodity || !selectedRegimes?.length) {
      return (
        <ErrorMessage 
          message="Please select at least one regime and a commodity from the sidebar." 
        />
      );
    }

    if (!processedData?.length) {
      return <ErrorMessage message="No data available for the selected criteria." />;
    }

    return (
      <InteractiveChart
        data={processedData}
        selectedCommodity={selectedCommodity}
        selectedRegimes={selectedRegimes}
      />
    );
  }, [processedData, selectedCommodity, selectedRegimes]);

  // Memoize analysis component rendering
  const renderAnalysisComponent = useCallback(() => {
    if (!selectedAnalysis) return null;

    const AnalysisComponent = getAnalysisComponent(selectedAnalysis);
    if (!AnalysisComponent) {
      return <ErrorMessage message="Selected analysis type is not available." />;
    }

    const analysisProps = {
      spatialData,
      selectedCommodity,
      windowWidth,
      spatialViewConfig,
      onSpatialViewChange,
      visualizationMode
    };

    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AnalysisWrapper>
          <AnalysisComponent {...analysisProps} />
        </AnalysisWrapper>
      </Suspense>
    );
  }, [
    selectedAnalysis,
    spatialData,
    selectedCommodity,
    windowWidth,
    spatialViewConfig,
    onSpatialViewChange,
    visualizationMode,
    getAnalysisComponent
  ]);

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%' 
        }}
      >
        <LoadingSpinner />
      </Box>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

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
});

Dashboard.displayName = 'Dashboard';

Dashboard.propTypes = {
  selectedAnalysis: PropTypes.string,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  windowWidth: PropTypes.number.isRequired,
  spatialViewConfig: PropTypes.shape({
    center: PropTypes.arrayOf(PropTypes.number).isRequired,
    zoom: PropTypes.number.isRequired,
  }),
  onSpatialViewChange: PropTypes.func
};

export default Dashboard;