// src/Dashboard.js

import React, { Suspense, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid, useTheme, useMediaQuery } from '@mui/material';
import { useUnifiedData } from './hooks/useUnifiedData';
import InteractiveChart from './components/interactive_graph/InteractiveChart';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import AnalysisWrapper from './components/common/AnalysisWrapper';
import { SpatialAnalysis } from './components/spatialAnalysis';
import { backgroundMonitor, MetricTypes } from './utils/backgroundMonitor';
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

// Lazy load analysis components with error handling
const loadComponent = async (importFn, componentName) => {
  const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.PERFORMANCE, {
    action: 'load-component',
    component: componentName
  });

  try {
    const module = await importFn();
    if (!module.default) {
      throw new Error(`${componentName} component not found`);
    }
    metric?.finish({ status: 'success' });
    return module;
  } catch (error) {
    metric?.finish({ 
      status: 'error',
      error: error.message 
    });
    backgroundMonitor.logError(MetricTypes.SYSTEM.ERROR, {
      component: componentName,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

const ECMAnalysisLazy = React.lazy(() =>
  loadComponent(
    () => import('./components/analysis/ecm/ECMAnalysis'),
    'ECMAnalysis'
  )
);

const PriceDifferentialAnalysisLazy = React.lazy(() =>
  loadComponent(
    () => import('./components/analysis/price-differential/PriceDifferentialAnalysis'),
    'PriceDifferentialAnalysis'
  )
);

const TVMIIAnalysisLazy = React.lazy(() =>
  loadComponent(
    () => import('./components/analysis/tvmii/TVMIIAnalysis'),
    'TVMIIAnalysis'
  )
);

const SpatialModelAnalysis = React.lazy(() =>
  loadComponent(
    () => import('./components/analysis/spatial/SpatialAnalysis'),
    'SpatialAnalysis'
  )
);

const Dashboard = React.memo(({
  selectedAnalysis = 'spatial',
  selectedCommodity,
  selectedRegimes,
  windowWidth,
  spatialViewConfig,
  onSpatialViewChange,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm')); // MUI's breakpoint for small screens

  const { data, loading, error, getFilteredData } = useUnifiedData();
  
  const chartData = useMemo(() => {
    const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.PERFORMANCE, {
      action: 'filter-data',
      commodity: selectedCommodity
    });

    try {
      const filtered = getFilteredData(selectedCommodity, selectedRegimes);
      metric?.finish({ 
        status: 'success',
        dataPoints: filtered?.length || 0
      });
      return filtered;
    } catch (err) {
      metric?.finish({ 
        status: 'error',
        error: err.message 
      });
      backgroundMonitor.logError(MetricTypes.SYSTEM.ERROR, {
        component: 'dashboard-filter',
        error: err.message,
        stack: err.stack
      });
      return [];
    }
  }, [getFilteredData, selectedCommodity, selectedRegimes]);

  // Analysis components registry
  const analysisComponents = useMemo(() => ({
    spatial: SpatialAnalysis,
    ecm: ECMAnalysisLazy,
    priceDiff: PriceDifferentialAnalysisLazy,
    spatial_model: SpatialModelAnalysis,
    tvmii: TVMIIAnalysisLazy
  }), []);

  // Get analysis component with monitoring
  const getAnalysisComponent = useCallback((type) => {
    try {
      const component = analysisComponents[type];
      if (!component) {
        backgroundMonitor.logError(MetricTypes.SYSTEM.ERROR, {
          component: 'analysis-loader',
          error: `Unknown analysis type: ${type}`
        });
      }
      return component;
    } catch (error) {
      backgroundMonitor.logError(MetricTypes.SYSTEM.ERROR, {
        component: 'analysis-loader',
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }, [analysisComponents]);

  // Render interactive chart with monitoring
  const renderInteractiveChart = useCallback(() => {
    const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.PERFORMANCE, {
      action: 'render-chart',
      commodity: selectedCommodity
    });

    try {
      if (!selectedCommodity || !selectedRegimes?.length) {
        metric?.finish({ status: 'skipped', reason: 'missing-selection' });
        return (
          <ErrorMessage 
            message="Please select at least one regime and a commodity from the sidebar." 
          />
        );
      }

      if (!chartData?.length) {
        metric?.finish({ status: 'skipped', reason: 'no-data' });
        return <ErrorMessage message="No data available for the selected criteria." />;
      }

      metric?.finish({ 
        status: 'success',
        dataPoints: chartData.length
      });

      return (
        <InteractiveChart
          data={chartData}
          selectedCommodity={selectedCommodity}
          selectedRegimes={selectedRegimes}
        />
      );
    } catch (error) {
      metric?.finish({ 
        status: 'error',
        error: error.message 
      });
      return <ErrorMessage message={error.message} />;
    }
  }, [chartData, selectedCommodity, selectedRegimes]);

  // Render analysis component with monitoring
  const renderAnalysisComponent = useCallback(() => {
    const metric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.PERFORMANCE, {
      action: 'render-analysis',
      type: selectedAnalysis
    });

    try {
      if (!selectedAnalysis) {
        metric?.finish({ status: 'skipped', reason: 'no-selection' });
        return null;
      }

      const AnalysisComponent = getAnalysisComponent(selectedAnalysis);
      if (!AnalysisComponent) {
        metric?.finish({ status: 'error', reason: 'component-not-found' });
        return <ErrorMessage message="Selected analysis type is not available." />;
      }

      const analysisProps = (selectedAnalysis === 'spatial' || selectedAnalysis === 'spatial_model') 
        ? {
            timeSeriesData: data,
            selectedCommodity,
            windowWidth,
            spatialViewConfig,
            onSpatialViewChange,
            mode: selectedAnalysis === 'spatial_model' ? 'model' : 'analysis'
          } 
        : {
            data,
            selectedCommodity,
            windowWidth
          };

      metric?.finish({ status: 'success' });

      return (
        <Suspense fallback={<LoadingSpinner />}>
          <AnalysisWrapper>
            <AnalysisComponent {...analysisProps} />
          </AnalysisWrapper>
        </Suspense>
      );
    } catch (error) {
      metric?.finish({ 
        status: 'error',
        error: error.message 
      });
      return <ErrorMessage message={error.message} />;
    }
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
        p: isSmallScreen ? 1 : 2, // Adjust padding based on screen size
      }}
    >
      <Grid container spacing={2} sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* Interactive Chart Section */}
        <Grid item xs={12} md={selectedAnalysis ? 12 : 12}>
          <Box
            sx={{
              width: '100%',
              height: isSmallScreen ? '250px' : { xs: '300px', sm: '400px', md: '400px' }, // Dynamic height
              position: 'relative',
              mb: 2,
            }}
          >
            {renderInteractiveChart()}
          </Box>
        </Grid>

        {/* Analysis Component Section */}
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