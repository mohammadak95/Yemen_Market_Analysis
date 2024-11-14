// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import useSpatialData from '../../../hooks/useSpatialData';
import {
  setSelectedCommodity,
  setSelectedDate,
  setSelectedRegion,
  loadSpatialData,
} from '../../../slices/spatialSlice';

import {
  Box,
  Typography,
  Grid,
  IconButton,
  Tabs,
  Tab,
  Alert,
  AlertTitle,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Download,
  Timeline,
  TrendingUp,
  GroupWork,
  CompareArrows,
} from '@mui/icons-material';

import MapControls from './MapControls';
import SpatialMap from './SpatialMap';
import SpatialErrorBoundary from './SpatialErrorBoundary';
import MapLegend from './MapLegend';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorDisplay from '../../common/ErrorDisplay';
import DynamicInterpretation from './DynamicInterpretation';
import TimeSeriesChart from './TimeSeriesChart';
import ShocksPanel from './ShocksPanel';
import ClustersPanel from './ClustersPanel';
// Removed redundant import of EnhancedSpatialProcessor if using singleton
// import { EnhancedSpatialProcessor } from '../../../utils/spatialProcessor';

import { spatialProcessor } from '../../../utils/spatialProcessors'; // Ensure singleton instance

const DEFAULT_UI_STATE = {
  mode: 'prices',
  showFlows: true,
  selectedRegion: null,
  analysisTab: 0,
  dateError: null,
};

const SpatialAnalysis = () => {
  const dispatch = useDispatch();
  const spatialState = useSpatialData();
  const [visualizationState, setVisualizationState] = useState(DEFAULT_UI_STATE);

  // Initialize processor instance (using singleton)
  // If you prefer using a singleton, ensure only one instance exists
  // const processor = useMemo(() => new EnhancedSpatialProcessor(), []);
  const processor = useMemo(() => spatialProcessor, []);

  // Process data when it changes
  const processedData = useMemo(() => {
    if (!spatialState.data) return null;

    return processor.process(spatialState.data, spatialState.ui.selectedDate);
  }, [processor, spatialState.data, spatialState.ui.selectedDate]);

  // Safe data access with default empty objects to prevent undefined errors
  const {
    status: { loading, error, isInitialized },
    data: {
      geoData,
      flowMaps,
      marketClusters: marketClustersData,
      detectedShocks: detectedShocksData,
      timeSeriesData,
      analysisResults,
      analysisMetrics,
    } = {}, // Provide empty default
    ui: { selectedCommodity, selectedDate },
  } = spatialState;

  useEffect(() => {
    if (selectedCommodity && !processedData?.availableMonths?.length) {
      dispatch(loadSpatialData({
        selectedCommodity,
        selectedDate: null // Will be set after data loads
      }));
    }
  }, [selectedCommodity, processedData?.availableMonths?.length]);

  // Data validation with more specific checks
  const isDataValid = useCallback(() => {
    return Boolean(
      processedData?.geoData?.features?.length > 0 &&
      selectedCommodity &&
      selectedDate &&
      isInitialized &&
      !error &&
      processedData?.availableMonths?.length > 0
    );
  }, [processedData, selectedCommodity, selectedDate, isInitialized, error]);

  const showLoading = loading || !isInitialized;

  const handleCommodityChange = useCallback(
    (commodity) => {
      dispatch(setSelectedCommodity(commodity));
    },
    [dispatch]
  );

  const handleDateChange = useCallback(
    (date) => {
      dispatch(setSelectedDate(date));
    },
    [dispatch]
  );

  const handleVisualizationUpdate = useCallback((updates) => {
    setVisualizationState((prevState) => ({
      ...prevState,
      ...updates,
    }));
  }, []);

  const handleRegionSelect = useCallback(
    (region) => {
      handleVisualizationUpdate({ selectedRegion: region });
      dispatch(setSelectedRegion(region));
    },
    [dispatch, handleVisualizationUpdate]
  );

  // Map controls props with safe data handling
  const mapControlsProps = useMemo(() => ({
    selectedCommodity,
    selectedDate,
    uniqueMonths: processedData?.availableMonths || [],
    commodities: processedData?.metadata?.availableCommodities || [],
    onDateChange: handleDateChange,
    onCommodityChange: handleCommodityChange,
    onRefresh: () => dispatch(loadSpatialData()),
    visualizationMode: visualizationState.mode,
    onVisualizationModeChange: (mode) => handleVisualizationUpdate({ mode }),
    showFlows: visualizationState.showFlows,
    onToggleFlows: () => handleVisualizationUpdate({
      showFlows: !visualizationState.showFlows,
    }),
  }), [
    selectedCommodity,
    selectedDate,
    processedData,
    handleDateChange,
    handleCommodityChange,
    dispatch,
    visualizationState.mode,
    visualizationState.showFlows,
  ]);

  // Map props with processed data
  const mapProps = useMemo(
    () => ({
      geoData: processedData?.geoData,
      flowMaps: visualizationState.showFlows ? processedData?.flowMaps : [],
      selectedDate,
      showFlows: visualizationState.showFlows,
      selectedCommodity,
      marketClusters: processedData?.marketClusters,
      detectedShocks: processedData?.detectedShocks,
      visualizationMode: visualizationState.mode,
      colorScales: processor.getColorScales(
        visualizationState.mode,
        processedData?.geoData
      ),
      onRegionSelect: handleRegionSelect,
    }),
    [
      processedData,
      visualizationState.showFlows,
      selectedDate,
      selectedCommodity,
      visualizationState.mode,
      handleRegionSelect,
      processor,
    ]
  );

  // Safe statistics for legend
  const legendStats = useMemo(
    () => ({
      'Integration Score':
        processedData?.spatialMetrics?.global?.moran_i?.toFixed(3) || 'N/A',
      'Price Correlation':
        processedData?.analysisMetrics?.integrationLevel?.toFixed(3) || 'N/A',
      'Market Coverage': `${processedData?.marketClusters?.length || 0} clusters`,
    }),
    [processedData]
  );

  if (showLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <LoadingSpinner />
      </Box>
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        title="Analysis Error"
        onRetry={() => dispatch(loadSpatialData())}
      />
    );
  }

  if (!isDataValid()) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <Typography>Please select a commodity and date to view analysis</Typography>
      </Box>
    );
  }

  return (
    <SpatialErrorBoundary onRetry={() => dispatch(loadSpatialData())}>
      <Box sx={{ width: '100%' }}>
        <Grid container spacing={2}>
          {/* Header Section */}
          <Grid
            item
            xs={12}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h5">
              Market Integration Analysis: {selectedCommodity || 'Select Commodity'}
            </Typography>
            <Tooltip title="Export Analysis">
              <IconButton aria-label="export analysis">
                <Download />
              </IconButton>
            </Tooltip>
          </Grid>

          {/* Warning Alert */}
          {visualizationState.dateError && (
            <Grid item xs={12}>
              <Alert severity="warning">
                <AlertTitle>Warning</AlertTitle>
                {visualizationState.dateError}
              </Alert>
            </Grid>
          )}

          {/* Map Controls */}
          <Grid item xs={12}>
            <MapControls {...mapControlsProps} />
          </Grid>

          {/* Map Component */}
          <Grid item xs={12}>
            <Box sx={{ height: 500, position: 'relative' }}>
              <SpatialMap {...mapProps} />
            </Box>
          </Grid>

          {/* Analysis Tabs */}
          <Grid item xs={12}>
            <Tabs
              value={visualizationState.analysisTab}
              onChange={(e, newValue) =>
                handleVisualizationUpdate({ analysisTab: newValue })
              }
              aria-label="Analysis Tabs"
            >
              <Tab icon={<Timeline />} label="Time Series" />
              <Tab icon={<TrendingUp />} label="Market Shocks" />
              <Tab icon={<GroupWork />} label="Market Clusters" />
              <Tab icon={<CompareArrows />} label="Market Integration" />
            </Tabs>
          </Grid>

          {/* Tab Panels Container */}
          <Grid item xs={12}>
            {/* Time Series Analysis Panel */}
            {visualizationState.analysisTab === 0 && (
              <Paper sx={{ p: 2 }}>
                <TimeSeriesChart timeSeriesData={processedData?.timeSeriesData || []} />
              </Paper>
            )}

            {/* Market Shocks Panel */}
            {visualizationState.analysisTab === 1 && (
              <Paper sx={{ p: 2 }}>
                <ShocksPanel shocksData={processedData?.detectedShocks || []} />
              </Paper>
            )}

            {/* Market Clusters Panel */}
            {visualizationState.analysisTab === 2 && (
              <Paper sx={{ p: 2 }}>
                <ClustersPanel clustersData={processedData?.marketClusters || []} />
              </Paper>
            )}

            {/* Market Integration Panel */}
            {visualizationState.analysisTab === 3 && (
              <Paper sx={{ p: 2 }}>
                <DynamicInterpretation
                  preprocessedData={{
                    analysisMetrics: processedData?.analysisMetrics,
                    timeSeriesData: processedData?.timeSeriesData,
                    detectedShocks: processedData?.detectedShocks,
                  }}
                  selectedRegion={visualizationState.selectedRegion}
                  selectedCommodity={selectedCommodity}
                />
              </Paper>
            )}
          </Grid>

          {/* Map Legend with safe data checks */}
          {processedData?.geoData?.features?.length > 0 && (
            <Grid item xs={12}>
              <MapLegend
                title={`${selectedCommodity || 'Market'} Distribution`}
                colorScale={processor.getColorScales(
                  visualizationState.mode,
                  processedData.geoData
                )}
                unit="USD"
                description="Spatial distribution of prices"
                position="bottomright"
                statistics={legendStats}
              />
            </Grid>
          )}
        </Grid>
      </Box>
    </SpatialErrorBoundary>
  );
};

export default React.memo(SpatialAnalysis);
