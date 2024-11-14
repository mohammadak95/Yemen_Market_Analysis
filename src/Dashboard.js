// src/Dashboard.js

import React, { Suspense, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid } from '@mui/material';
import InteractiveChart from './components/interactive_graph/InteractiveChart';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import AnalysisWrapper from './components/common/AnalysisWrapper';
import SpatialAnalysis from './components/analysis/spatial-analysis/SpatialAnalysis';

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
    windowWidth,
    spatialViewConfig,
    onSpatialViewChange,
  }) => {
    const processedData = useMemo(() => {
      if (!data?.features) return [];
      return data.features.map((feature) => ({
        ...feature,
        date: feature.date instanceof Date ? feature.date.toISOString() : feature.date,
      }));
    }, [data]);

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
        spatialViewConfig,
        onSpatialViewChange,
        data: processedData,
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
      selectedCommodity,
      windowWidth,
      spatialViewConfig,
      onSpatialViewChange,
      processedData,
      getAnalysisComponent,
    ]);

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
  data: PropTypes.shape({
    features: PropTypes.arrayOf(
      PropTypes.shape({
        date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired,
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
      min: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      max: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    }),
  }),
  selectedAnalysis: PropTypes.string,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  windowWidth: PropTypes.number.isRequired,
  spatialViewConfig: PropTypes.shape({
    center: PropTypes.arrayOf(PropTypes.number).isRequired,
    zoom: PropTypes.number.isRequired,
  }),
  onSpatialViewChange: PropTypes.func,
};

export default Dashboard;