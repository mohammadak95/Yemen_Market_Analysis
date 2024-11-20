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

const Dashboard = React.memo(({
  selectedAnalysis,
  selectedCommodity,
  selectedRegimes,
  windowWidth,
  spatialViewConfig,
  onSpatialViewChange,
}) => {
  const spatialData = useSelector(selectSpatialData);
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const marketClusters = useSelector(selectMarketClusters);
  const visualizationMode = useSelector(selectVisualizationMode);

  const processedData = useMemo(() => {
    if (!timeSeriesData) return [];
    
    return timeSeriesData
      .filter(item => 
        item.commodity?.toLowerCase() === selectedCommodity?.toLowerCase() &&
        selectedRegimes.includes(item.regime?.toLowerCase())
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [timeSeriesData, selectedCommodity, selectedRegimes]);

    // Map analysis types to components with explicit null checks
    const getAnalysisComponent = useCallback((type) => {
      const componentMap = {
        ecm: ECMAnalysisLazy,
        priceDiff: PriceDifferentialAnalysisLazy,
        spatial: SpatialAnalysis,
        tvmii: TVMIIAnalysisLazy,
      };

      const Component = componentMap[type];
      if (!Component) {
        console.warn(`No component found for analysis type: ${type}`);
        return null;
      }

      return Component;
    }, []);

    const renderInteractiveChart = useCallback(() => {
      if (!selectedCommodity || selectedRegimes.length === 0) {
        return (
          <ErrorMessage message="Please select at least one regime and a commodity from the sidebar." />
        );
      }

      if (!processedData.length) {
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

    const renderAnalysisComponent = useCallback(() => {
      if (!selectedAnalysis) return null;
  
      const AnalysisComponent = getAnalysisComponent(selectedAnalysis);
      if (!AnalysisComponent) return <ErrorMessage message="Selected analysis type is not available." />;
  
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <AnalysisWrapper>
            <AnalysisComponent
              spatialData={spatialData}
              selectedCommodity={selectedCommodity}
              windowWidth={windowWidth}
              spatialViewConfig={spatialViewConfig}
              onSpatialViewChange={onSpatialViewChange}
              visualizationMode={visualizationMode}
            />
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
      visualizationMode
    ]);
  
    if (!spatialData) return <LoadingSpinner />;
  



    // Add loading state for initial data
    if (!spatialData) {
      return (
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
        >
          <LoadingSpinner />
        </Box>
      );
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
  }
);

Dashboard.displayName = 'Dashboard';

Dashboard.propTypes = {
  data: PropTypes.shape({
    features: PropTypes.arrayOf(
      PropTypes.shape({
        date: PropTypes.string.isRequired,
        commodity: PropTypes.string.isRequired,
        regime: PropTypes.string.isRequired,
        price: PropTypes.number.isRequired,
        usdprice: PropTypes.number.isRequired,
        conflict_intensity: PropTypes.number.isRequired,
      })
    ),
    commodities: PropTypes.arrayOf(PropTypes.string),
    regimes: PropTypes.arrayOf(PropTypes.string),
    dateRange: PropTypes.shape({
      min: PropTypes.instanceOf(Date),
      max: PropTypes.instanceOf(Date)
    })
  }),
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