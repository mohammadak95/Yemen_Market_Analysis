// src/Dashboard.js

import React, { Suspense, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid } from '@mui/material';
import InteractiveChart from './components/interactive_graph/InteractiveChart';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import AnalysisWrapper from './utils/debugUtils';
import { useMarketAnalysis } from './hooks/usePrecomputedData';
import { backgroundMonitor } from './utils/backgroundMonitor';

// Import the new SpatialAnalysis component
import SpatialAnalysis from './components/analysis/spatial-analysis/SpatialAnalysis';

// Lazy loaded components
const ECMAnalysis = React.lazy(() =>
  import('./components/analysis/ecm/ECMAnalysis')
);
const PriceDifferentialAnalysis = React.lazy(() =>
  import('./components/analysis/price-differential/PriceDifferentialAnalysis')
);
const TVMIIAnalysis = React.lazy(() =>
  import('./components/analysis/tvmii/TVMIIAnalysis')
);

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

const Dashboard = React.memo(({
  data,
  selectedAnalysis,
  selectedCommodity,
  selectedDate,
  selectedRegimes,
  windowWidth,
  spatialViewConfig,
  onSpatialViewChange,
}) => {
  // Get market analysis from precomputed data
  const { marketMetrics, timeSeriesAnalysis, spatialAnalysis } = useMarketAnalysis(data);

  // Process time series data for visualization
  const processedData = useMemo(() => {
    if (!data?.timeSeriesData) return [];

    const metric = backgroundMonitor.startMetric('process-timeseries');
    try {
      const processed = data.timeSeriesData.map(entry => ({
        date: new Date(entry.month),
        price: entry.avgUsdPrice,
        volatility: entry.volatility,
        sampleSize: entry.sampleSize,
        regime: 'unified',
        commodity: selectedCommodity
      }));

      metric.finish({ status: 'success', dataPoints: processed.length });
      return processed;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      console.error('Error processing time series data:', error);
      return [];
    }
  }, [data, selectedCommodity]);

  // Determine which analysis component to render
  const AnalysisComponent = useMemo(() => {
    const components = {
      ecm: ECMAnalysis,
      priceDiff: PriceDifferentialAnalysis,
      spatial: SpatialAnalysis,
      tvmii: TVMIIAnalysis,
    };

    if (selectedAnalysis === 'spatial') {
      return () => (
        <SpatialAnalysis
          data={data}
          selectedCommodity={selectedCommodity}
          selectedDate={selectedDate}
          viewConfig={spatialViewConfig}
          onViewChange={onSpatialViewChange}
          spatialMetrics={spatialAnalysis}
        />
      );
    }

    return components[selectedAnalysis] || null;
  }, [
    selectedAnalysis,
    data,
    selectedCommodity,
    selectedDate,
    spatialViewConfig,
    spatialAnalysis,
  ]);

  // Render interactive chart
  const renderInteractiveChart = useCallback(() => {
    if (!selectedCommodity || selectedRegimes.length === 0) {
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
        marketMetrics={marketMetrics}
        timeSeriesAnalysis={timeSeriesAnalysis}
      />
    );
  }, [
    processedData,
    selectedCommodity,
    selectedRegimes,
    marketMetrics,
    timeSeriesAnalysis,
  ]);

  // Render analysis component
  const renderAnalysisComponent = useCallback(() => {
    if (!selectedAnalysis || !AnalysisComponent || !selectedCommodity) {
      return null;
    }

    const commonProps = {
      selectedCommodity,
      windowWidth,
      timeSeriesAnalysis,
      marketMetrics,
    };

    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AnalysisWrapper>
          <AnalysisComponent {...commonProps} />
        </AnalysisWrapper>
      </Suspense>
    );
  }, [
    selectedAnalysis,
    AnalysisComponent,
    selectedCommodity,
    windowWidth,
    timeSeriesAnalysis,
    marketMetrics,
  ]);

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
              height: { xs: '300px', sm: '400px', md: '500px' },
              position: 'relative',
              mb: 2,
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
});

Dashboard.displayName = 'Dashboard';

Dashboard.propTypes = {
  data: PropTypes.shape({
    timeSeriesData: PropTypes.arrayOf(PropTypes.shape({
      month: PropTypes.string.isRequired,
      avgUsdPrice: PropTypes.number.isRequired,
      volatility: PropTypes.number,
      sampleSize: PropTypes.number
    })),
    marketClusters: PropTypes.array,
    detectedShocks: PropTypes.array,
    flowAnalysis: PropTypes.array,
    spatialAutocorrelation: PropTypes.object,
    metadata: PropTypes.object
  }),
  selectedAnalysis: PropTypes.string.isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedDate: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  windowWidth: PropTypes.number.isRequired,
  spatialViewConfig: PropTypes.shape({
    center: PropTypes.arrayOf(PropTypes.number).isRequired,
    zoom: PropTypes.number.isRequired,
  }),
  onSpatialViewChange: PropTypes.func,
};

export default Dashboard;