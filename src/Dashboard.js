import React, { Suspense, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid } from '@mui/material';
import { useUnifiedData } from './hooks/useUnifiedData';
import InteractiveChart from './components/interactive_graph/InteractiveChart';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import AnalysisWrapper from './components/common/AnalysisWrapper';
import { SpatialAnalysis } from './components/spatialAnalysis';
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
  import('./components/analysis/ecm/ECMAnalysis').then((module) => {
    if (!module.default) throw new Error('ECMAnalysis component not found');
    return module;
  })
);

const PriceDifferentialAnalysisLazy = React.lazy(() =>
  import('./components/analysis/price-differential/PriceDifferentialAnalysis').then(
    (module) => {
      if (!module.default) throw new Error('PriceDifferentialAnalysis component not found');
      return module;
    }
  )
);

const TVMIIAnalysisLazy = React.lazy(() =>
  import('./components/analysis/tvmii/TVMIIAnalysis').then((module) => {
    if (!module.default) throw new Error('TVMIIAnalysis component not found');
    return module;
  })
);

// Import existing spatial analysis for spatial model
const SpatialModelAnalysis = React.lazy(() =>
  import('./components/analysis/spatial/SpatialAnalysis').then((module) => {
    if (!module.default) throw new Error('SpatialAnalysis component not found');
    return module;
  })
);

const Dashboard = React.memo(({
  selectedAnalysis = 'spatial', // Set spatial as default analysis
  selectedCommodity,
  selectedRegimes,
  windowWidth,
  spatialViewConfig,
  onSpatialViewChange,
}) => {
  const { data, loading, error, getFilteredData } = useUnifiedData();
  const chartData = useMemo(() => {
    return getFilteredData(selectedCommodity, selectedRegimes);
  }, [getFilteredData, selectedCommodity, selectedRegimes]);

  // Reordered analysis components with spatial first
  const analysisComponents = useMemo(() => ({
    spatial: SpatialAnalysis,
    ecm: ECMAnalysisLazy,
    priceDiff: PriceDifferentialAnalysisLazy,
    spatial_model: SpatialModelAnalysis, // Use existing spatial analysis
    tvmii: TVMIIAnalysisLazy
  }), []);

  // Get analysis component
  const getAnalysisComponent = useCallback((type) => {
    return analysisComponents[type] || null;
  }, [analysisComponents]);

  // Render interactive chart
  const renderInteractiveChart = useCallback(() => {
    if (!selectedCommodity || !selectedRegimes?.length) {
      return (
        <ErrorMessage 
          message="Please select at least one regime and a commodity from the sidebar." 
        />
      );
    }

    if (!chartData?.length) {
      return <ErrorMessage message="No data available for the selected criteria." />;
    }

    return (
      <InteractiveChart
        data={chartData}
        selectedCommodity={selectedCommodity}
        selectedRegimes={selectedRegimes}
      />
    );
  }, [chartData, selectedCommodity, selectedRegimes]);

  // Render analysis component
  const renderAnalysisComponent = useCallback(() => {
    if (!selectedAnalysis) return null;

    const AnalysisComponent = getAnalysisComponent(selectedAnalysis);
    if (!AnalysisComponent) {
      return <ErrorMessage message="Selected analysis type is not available." />;
    }

    // Special props for spatial analysis and spatial model
    const analysisProps = (selectedAnalysis === 'spatial' || selectedAnalysis === 'spatial_model') ? {
      timeSeriesData: data,
      selectedCommodity,
      windowWidth,
      spatialViewConfig,
      onSpatialViewChange,
      // Add mode prop to differentiate between spatial analysis and spatial model
      mode: selectedAnalysis === 'spatial_model' ? 'model' : 'analysis'
    } : {
      data,
      selectedCommodity,
      windowWidth
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
    data,
    selectedCommodity,
    windowWidth,
    spatialViewConfig,
    onSpatialViewChange,
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
              height: { xs: '300px', sm: '400px', md: '400px' },
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
