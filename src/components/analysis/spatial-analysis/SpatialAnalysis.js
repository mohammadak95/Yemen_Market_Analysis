// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, shallowEqual } from 'react-redux';
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

import { scaleSequential, scaleLinear, scaleOrdinal } from 'd3-scale';
import {
  interpolateRdYlGn,
  interpolateBlues,
  schemeCategory10,
} from 'd3-scale-chromatic';

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
    },
    ui: { selectedCommodity, selectedDate },
  } = spatialState;

  const isDataValid = useCallback(() => {
    return Boolean(
      geoData?.features?.length &&
        selectedCommodity &&
        selectedDate &&
        isInitialized
    );
  }, [geoData, selectedCommodity, selectedDate, isInitialized]);

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

  const mapControlsProps = useMemo(
    () => ({
      selectedCommodity,
      selectedDate,
      uniqueMonths: timeSeriesData?.map((d) => d.month) || [],
      commodities: ['wheat', 'rice', 'maize'], // Example commodities
      onDateChange: handleDateChange,
      onCommodityChange: handleCommodityChange,
      onRefresh: () => dispatch(loadSpatialData()),
      visualizationMode: visualizationState.mode,
      onVisualizationModeChange: (mode) => handleVisualizationUpdate({ mode }),
      showFlows: visualizationState.showFlows,
      onToggleFlows: () =>
        handleVisualizationUpdate({
          showFlows: !visualizationState.showFlows,
        }),
    }),
    [
      selectedCommodity,
      selectedDate,
      timeSeriesData,
      handleDateChange,
      handleCommodityChange,
      dispatch,
      visualizationState.mode,
      visualizationState.showFlows,
      handleVisualizationUpdate,
    ]
  );

  const mapProps = useMemo(
    () => ({
      geoData,
      flowMaps: visualizationState.showFlows ? flowMaps : [],
      selectedDate,
      showFlows: visualizationState.showFlows,
      selectedCommodity,
      marketClusters: marketClustersData,
      detectedShocks: detectedShocksData,
      visualizationMode: visualizationState.mode,
      colorScales: getColorScales(visualizationState.mode, geoData),
      onRegionSelect: handleRegionSelect,
    }),
    [
      geoData,
      flowMaps,
      visualizationState.showFlows,
      selectedDate,
      selectedCommodity,
      marketClustersData,
      detectedShocksData,
      visualizationState.mode,
      handleRegionSelect,
    ]
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
              Market Integration Analysis: {selectedCommodity}
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
                <TimeSeriesChart timeSeriesData={timeSeriesData} />
              </Paper>
            )}

            {/* Market Shocks Panel */}
            {visualizationState.analysisTab === 1 && (
              <Paper sx={{ p: 2 }}>
                <ShocksPanel shocksData={detectedShocksData} />
              </Paper>
            )}

            {/* Market Clusters Panel */}
            {visualizationState.analysisTab === 2 && (
              <Paper sx={{ p: 2 }}>
                <ClustersPanel clustersData={marketClustersData} />
              </Paper>
            )}

            {/* Market Integration Panel */}
            {visualizationState.analysisTab === 3 && (
              <Paper sx={{ p: 2 }}>
                <DynamicInterpretation
                  preprocessedData={{
                    analysisMetrics,
                    timeSeriesData,
                    detectedShocks: detectedShocksData,
                  }}
                  selectedRegion={visualizationState.selectedRegion}
                  selectedCommodity={selectedCommodity}
                />
              </Paper>
            )}
          </Grid>

          {/* Map Legend */}
          {geoData?.features?.length > 0 && (
            <Grid item xs={12}>
              <MapLegend
                title={`${selectedCommodity} Distribution`}
                colorScale={getColorScales(visualizationState.mode, geoData).getColor}
                unit="USD"
                description="Spatial distribution of prices"
                position="bottomright"
                statistics={{
                  'Integration Score':
                    analysisResults?.spatialAutocorrelation?.moran_i?.toFixed(3),
                  'Price Correlation':
                    analysisMetrics?.integrationLevel?.toFixed(3),
                  'Market Coverage': `${marketClustersData?.length || 0} clusters`,
                }}
              />
            </Grid>
          )}
        </Grid>
      </Box>
    </SpatialErrorBoundary>
  );
};

export default React.memo(SpatialAnalysis);

// Helper function to get color scales
const getColorScales = (mode, geoData) => {
  // Determine the domain based on the data
  let domain;
  if (mode === 'prices') {
    const prices = geoData.features
      .map((feature) => feature.properties.priceData?.avgUsdPrice)
      .filter((value) => value !== undefined);
    domain = [Math.min(...prices), Math.max(...prices)];
    const scale = scaleSequential(interpolateRdYlGn).domain(domain.reverse()); // High prices in red, low in green
    return {
      getColor: (feature) => {
        const value = feature.properties.priceData?.avgUsdPrice;
        return value !== undefined ? scale(value) : '#cccccc';
      },
    };
  } else if (mode === 'integration') {
    const scores = geoData.features
      .map((feature) => feature.properties.integrationScore)
      .filter((value) => value !== undefined);
    domain = [Math.min(...scores), Math.max(...scores)];
    const scale = scaleSequential(interpolateBlues).domain(domain);
    return {
      getColor: (feature) => {
        const value = feature.properties.integrationScore;
        return value !== undefined ? scale(value) : '#cccccc';
      },
    };
  } else if (mode === 'clusters') {
    // Assign colors to clusters
    const clusterIds = [
      ...new Set(
        geoData.features
          .map((feature) => feature.properties.clusterId)
          .filter((id) => id !== undefined)
      ),
    ];
    const colorScale = scaleOrdinal(schemeCategory10).domain(clusterIds);
    return {
      getColor: (feature) => {
        const clusterId = feature.properties.clusterId;
        return clusterId !== undefined ? colorScale(clusterId) : '#cccccc';
      },
    };
  } else if (mode === 'shocks') {
    // Highlight regions with shocks
    return {
      getColor: (feature) => {
        const hasShock = feature.properties.hasShock;
        return hasShock ? '#ff0000' : '#cccccc';
      },
    };
  }

  // Default color scale
  return {
    getColor: () => '#cccccc',
  };
};