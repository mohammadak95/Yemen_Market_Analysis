// src/Dashboard.js

import React, { Suspense, useMemo, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Grid, Paper, Alert, AlertTitle } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';

import InteractiveChart from './components/interactive_graph/InteractiveChart';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import AnalysisWrapper from './components/common/AnalysisWrapper';
import SpatialAnalysis from './components/analysis/spatial-analysis/SpatialAnalysis';
import { useMarketAnalysis } from './hooks/useMarketAnalysis';
import { monitoringSystem } from './utils/MonitoringSystem';
import { dataTransformationSystem } from './utils/DataTransformationSystem';
import { unifiedDataManager } from './utils/UnifiedDataManager';

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
  ECMAnalysis,
  PriceDifferentialAnalysis,
  TVMIIAnalysis,
} from './utils/dynamicImports';

import { generateAnalysis } from './slices/analysisSlice';

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

const preloadNextDataset = async (currentCommodity, currentDate) => {
  const metric = monitoringSystem.startMetric('preload-next-dataset');
  
  try {
    // Get next commodity or date based on current selection
    const nextDataset = await unifiedDataManager.getNextDataset(currentCommodity, currentDate);
    
    if (nextDataset) {
      await unifiedDataManager.prefetchData(nextDataset.commodity, nextDataset.date, {
        priority: 'low',
        useCache: true
      });
    }
    
    metric.finish({ status: 'success' });
  } catch (error) {
    metric.finish({ status: 'error', error: error.message });
    // Silently fail preloading - it's not critical
    console.warn('Failed to preload next dataset:', error);
  }
};

const Dashboard = React.memo(
  ({
    selectedAnalysis,
    selectedCommodity,
    selectedRegimes,
    selectedDate,
    windowWidth,
  }) => {
    const dispatch = useDispatch();

    // Redux selectors
    const validationStatus = useSelector((state) => state?.spatial?.validation || {});
    const spatialStatus = useSelector((state) => state?.spatial?.status || {});

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Determine if data can be loaded
    const canLoadData = useMemo(() => {
      return Boolean(
        selectedCommodity &&
          Array.isArray(selectedRegimes) &&
          selectedRegimes.length > 0 &&
          !spatialStatus.loading
      );
    }, [selectedCommodity, selectedRegimes, spatialStatus.loading]);

    // Error handling function
    const handleError = (err, metric) => {
      console.error('Error loading dashboard data:', err);
      metric.finish({ status: 'error', error: err.message });
      setError(err.message);
    };

    // Load dashboard data
    const loadDashboardData = useCallback(async () => {
      if (!canLoadData) {
        setLoading(false);
        return;
      }
    
      const metric = monitoringSystem.startMetric('load-dashboard-data');
      setLoading(true);
      setError(null);
    
      try {
        // Load spatial data with optimized caching
        const result = await unifiedDataManager.loadSpatialData(
          selectedCommodity, 
          selectedDate,
          {
            regimes: selectedRegimes,
            validateData: true,
            useCache: true,
            batchSize: 100
          }
        );
    
        if (!result) {
          throw new Error('No data available for the selected parameters');
        }
    
        setDashboardData(result);
    
        // Generate analysis in parallel if we have data
        if (result) {
          await Promise.all([
            dispatch(
              generateAnalysis({
                commodity: selectedCommodity,
                date: selectedDate,
                options: {
                  timeframe: 'monthly',
                  includeValidation: true,
                },
              })
            ),
            preloadNextDataset(selectedCommodity, selectedDate)
          ]);
        }
    
        metric.finish({
          status: 'success',
          dataPoints: result?.timeSeriesData?.length || 0,
        });
      } catch (err) {
        handleError(err, metric);
      } finally {
        setLoading(false);
      }
    }, [canLoadData, selectedCommodity, selectedDate, selectedRegimes, dispatch]);

    // Load data when dependencies change
    useEffect(() => {
      let mounted = true;

      if (mounted) {
        loadDashboardData();
      }

      return () => {
        mounted = false;
      };
    }, [loadDashboardData]);

    // Process data for the chart
    const processedData = useMemo(() => {
      if (!dashboardData?.timeSeriesData) {
        monitoringSystem.log('No time series data available', {
          hasData: Boolean(dashboardData),
          commodity: selectedCommodity,
          regimes: selectedRegimes,
        });
        return [];
      }

      try {
        return dataTransformationSystem.transformTimeSeriesData(dashboardData.timeSeriesData, {
          timeUnit: 'month',
          aggregationType: 'mean',
          includeGarch: true,
          includeConflict: true,
          validate: true,
        });
      } catch (err) {
        monitoringSystem.error('Time series data processing error:', err);
        return [];
      }
    }, [dashboardData, selectedCommodity, selectedRegimes]);

    // Get market analysis data
    const { marketMetrics, timeSeriesAnalysis, spatialAnalysis } = useMarketAnalysis(dashboardData);

    // Map analysis types to components
    const getAnalysisComponent = useCallback((type) => {
      const componentMap = {
        ecm: ECMAnalysis,
        priceDiff: PriceDifferentialAnalysis,
        spatial: SpatialAnalysis,
        tvmii: TVMIIAnalysis,
      };

      return componentMap[type] || null;
    }, []);

    // Render interactive chart
    const renderInteractiveChart = useCallback(() => {
      if (!selectedCommodity || !selectedRegimes?.length) {
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

    // Render analysis component
    const renderAnalysisComponent = useCallback(() => {
      if (!selectedAnalysis) return null;

      const AnalysisComponent = getAnalysisComponent(selectedAnalysis);
      if (!AnalysisComponent) {
        return <ErrorMessage message="Selected analysis type is not available." />;
      }

      const commonProps = {
        selectedCommodity,
        windowWidth,
        data: dashboardData,
        marketMetrics,
        timeSeriesAnalysis,
        spatialAnalysis,
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
      dashboardData,
      marketMetrics,
      timeSeriesAnalysis,
      spatialAnalysis,
      getAnalysisComponent,
    ]);

    // Render loading state
    if (loading) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            gap: 2,
          }}
        >
          <LoadingSpinner />
          <Alert severity="info" sx={{ maxWidth: 400 }}>
            Loading data for {selectedCommodity || 'selected commodity'}...
          </Alert>
        </Box>
      );
    }

    // Render error state
    if (error) {
      return (
        <ErrorMessage
          message={error}
          retry={loadDashboardData}
          details={`Commodity: ${selectedCommodity}, Markets: ${selectedRegimes?.join(', ')}`}
        />
      );
    }

    // Show initial state message
    if (!canLoadData) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="info">
            <AlertTitle>Select Parameters</AlertTitle>
            Please select a commodity and at least one market from the sidebar to view analysis.
          </Alert>
        </Box>
      );
    }

    // Show validation warnings
    const showValidationWarnings = validationStatus?.warnings?.length > 0;

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
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
              <Box
                sx={{
                  width: '100%',
                  height: { xs: '300px', sm: '400px', md: '500px' },
                  position: 'relative',
                }}
              >
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
  }
);

Dashboard.displayName = 'Dashboard';

Dashboard.propTypes = {
  selectedAnalysis: PropTypes.string,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedDate: PropTypes.string,
  windowWidth: PropTypes.number.isRequired,
};

export default Dashboard;