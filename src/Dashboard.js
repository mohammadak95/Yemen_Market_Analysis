// src/Dashboard.js

import React, { Suspense, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid, Paper, Alert, AlertTitle } from '@mui/material';
import { useSelector } from 'react-redux';

import InteractiveChart from './components/interactive_graph/InteractiveChart';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import AnalysisWrapper from './components/common/AnalysisWrapper';
import SpatialAnalysis from './components/analysis/spatial-analysis/SpatialAnalysis';
import { useMarketAnalysis } from './hooks/useMarketAnalysis';
import { spatialDebugUtils } from './utils/spatialDebugUtils';
import { spatialIntegrationSystem } from './utils/spatialIntegrationSystem';

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

const Dashboard = React.memo(({
  data,
  selectedAnalysis,
  selectedCommodity,
  selectedRegimes,
  selectedDate,
  windowWidth,
}) => {
  // Get spatial validation status
  const validationStatus = useSelector(state => state.spatial.validation);

  // Process time series data
  const processedData = useMemo(() => {
    if (!data?.timeSeriesData) {
      spatialDebugUtils.log('No time series data available');
      return [];
    }

    const processed = data.timeSeriesData.map(entry => ({
      ...entry,
      date: entry.month,
    }));

    spatialDebugUtils.log('Processed time series data:', { 
      count: processed.length 
    });

    return processed;
  }, [data]);

  // Get market analysis data
  const { 
    marketMetrics, 
    timeSeriesAnalysis, 
    spatialAnalysis 
  } = useMarketAnalysis(data);

  // Handle analysis component selection
  const getAnalysisComponent = useCallback((type) => {
    const componentMap = {
      ecm: ECMAnalysisLazy,
      priceDiff: PriceDifferentialAnalysisLazy,
      spatial: SpatialAnalysis,
      tvmii: TVMIIAnalysisLazy,
    };

    return componentMap[type] || null;
  }, []);

  // Render interactive chart
  const renderInteractiveChart = useCallback(() => {
    if (!selectedCommodity || !selectedRegimes?.length) {
      return (
        <ErrorMessage 
          message="Please select at least one regime and a commodity from the sidebar." 
        />
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

  // Render analysis component
  const renderAnalysisComponent = useCallback(() => {
    if (!selectedAnalysis) return null;

    const AnalysisComponent = getAnalysisComponent(selectedAnalysis);
    if (!AnalysisComponent) {
      return <ErrorMessage message="Selected analysis type is not available." />;
    }

    // Get quality report for the selected analysis
    const getQualityReport = async () => {
      try {
        const report = await spatialIntegrationSystem.getDataQualityReport(
          selectedCommodity,
          selectedDate
        );
        spatialDebugUtils.log('Analysis quality report:', report);
        return report;
      } catch (error) {
        spatialDebugUtils.error('Error getting quality report:', error);
        return null;
      }
    };

    const commonProps = {
      selectedCommodity,
      windowWidth,
      data,
      qualityReport: getQualityReport(),
      marketMetrics,
      timeSeriesAnalysis,
      spatialAnalysis
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
    selectedDate,
    windowWidth,
    data,
    marketMetrics,
    timeSeriesAnalysis,
    spatialAnalysis,
    getAnalysisComponent
  ]);

  // Show loading state
  if (!data) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%' 
      }}>
        <LoadingSpinner />
      </Box>
    );
  }

  // Show validation warnings if any
  const showValidationWarnings = validationStatus?.warnings?.length > 0;

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflow: 'hidden' 
    }}>
      {showValidationWarnings && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Data Quality Warnings</AlertTitle>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            {validationStatus.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </Box>
        </Alert>
      )}

      <Grid container spacing={2} sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Box sx={{
              width: '100%',
              height: { xs: '300px', sm: '400px', md: '500px' },
              position: 'relative'
            }}>
              {renderInteractiveChart()}
            </Box>
          </Paper>
        </Grid>

        {selectedAnalysis && (
          <Grid item xs={12}>
            {renderAnalysisComponent()}
          </Grid>
        )}

        {marketMetrics && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>Market Coverage:</strong> {marketMetrics.marketCoverage}%
                </div>
                <div>
                  <strong>Integration Level:</strong> {marketMetrics.integrationLevel}%
                </div>
                <div>
                  <strong>Stability:</strong> {marketMetrics.stability}%
                </div>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
});

Dashboard.displayName = 'Dashboard';

Dashboard.propTypes = {
  data: PropTypes.object,
  selectedAnalysis: PropTypes.string,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedDate: PropTypes.string,
  windowWidth: PropTypes.number.isRequired,
};

export default Dashboard;