// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Grid } from '@mui/material';
import MapControls from './MapControls';
import MapLegend from './MapLegend';
import TimeControls from './TimeControls';
import { 
  selectSpatialData, 
  fetchSpatialData,
  setSelectedRegion 
} from '../../../slices/spatialSlice';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorDisplay from  '../../common/ErrorDisplay';
import SpatialMap from './SpatialMap';
import SpatialDiagnostics from './SpatialDiagnostics';
import DynamicInterpretation from './DynamicInterpretation';
import ErrorBoundary from './SpatialErrorBoundary';
import { memoizedComputeClusters, detectMarketShocks } from '../../../utils/spatialUtils';

// Visualization modes
const VISUALIZATION_MODES = {
  PRICES: 'prices',
  MARKET_INTEGRATION: 'integration',
  CLUSTERS: 'clusters',
  SHOCKS: 'shocks'
};

const SpatialAnalysis = ({
  selectedCommodity,
  selectedDate = ''
}) => {
  const dispatch = useDispatch();
  const {
    geoData,
    analysis,
    flows,
    weights,
    uniqueMonths,
    commodities,
    status,
    error,
    loadingProgress
  } = useSelector(selectSpatialData);

  const [visualizationMode, setVisualizationMode] = useState(VISUALIZATION_MODES.PRICES);
  const [showFlows, setShowFlows] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(null);

  useEffect(() => {
    if (selectedCommodity && selectedDate) {
      dispatch(fetchSpatialData({ selectedCommodity, selectedDate }));
    }
  }, [selectedCommodity, selectedDate, dispatch]);

  const handleCommodityChange = useCallback((commodity) => {
    dispatch(fetchSpatialData({ selectedCommodity: commodity, selectedDate }));
  }, [dispatch, selectedDate]);

  const handleDateChange = useCallback((date) => {
    dispatch(fetchSpatialData({ selectedCommodity, selectedDate: date }));
  }, [dispatch, selectedCommodity]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchSpatialData({ selectedCommodity, selectedDate }));
  }, [dispatch, selectedCommodity, selectedDate]);

  const handleRegionSelect = useCallback((region) => {
    dispatch(setSelectedRegion(region));
  }, [dispatch]);

  const handleMonthChange = useCallback((newMonth) => {
    if (selectedCommodity) {
      dispatch(fetchSpatialData({ 
        selectedCommodity, 
        selectedDate: newMonth 
      }));
    }
  }, [selectedCommodity, dispatch]);

  const marketClusters = useMemo(() => {
    if (!flows || !weights) return [];
    return memoizedComputeClusters(flows, weights);
  }, [flows, weights]);

  const detectedShocks = useMemo(() => {
    if (!geoData?.features) return [];
    return detectMarketShocks(geoData.features, selectedDate);
  }, [geoData?.features, selectedDate]);

  const colorScales = useMemo(() => {
    if (!geoData) return {};

    const scales = {};

    if (visualizationMode === VISUALIZATION_MODES.PRICES) {
      const prices = geoData.features
        .map(feature => parseFloat(feature.properties.price))
        .filter(price => !isNaN(price));

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      scales.getColor = feature => {
        const price = parseFloat(feature.properties.price);
        if (isNaN(price)) return '#ccc';
        const ratio = (price - minPrice) / (maxPrice - minPrice || 1);
        const red = Math.floor(255 * (1 - ratio));
        const green = Math.floor(255 * ratio);
        const blue = 0;
        return `rgb(${red},${green},${blue})`;
      };
    } else if (visualizationMode === VISUALIZATION_MODES.MARKET_INTEGRATION) {
      const residuals = geoData.features
        .map(feature => parseFloat(feature.properties.residual))
        .filter(residual => !isNaN(residual));

      const minResidual = Math.min(...residuals);
      const maxResidual = Math.max(...residuals);

      scales.getColor = feature => {
        const residual = parseFloat(feature.properties.residual);
        if (isNaN(residual)) return '#ccc';
        const ratio = (residual - minResidual) / (maxResidual - minResidual || 1);
        const red = Math.floor(255 * ratio);
        const green = 0;
        const blue = Math.floor(255 * (1 - ratio));
        return `rgb(${red},${green},${blue})`;
      };
    } else if (visualizationMode === VISUALIZATION_MODES.CLUSTERS) {
      const clusterColors = [
        '#e41a1c',
        '#377eb8',
        '#4daf4a',
        '#984ea3',
        '#ff7f00',
        '#ffff33',
        '#a65628',
        '#f781bf',
        '#999999'
      ];
      const clusterMap = new Map();
      marketClusters.forEach((cluster, index) => {
        cluster.connectedMarkets.forEach(market => {
          clusterMap.set(market, clusterColors[index % clusterColors.length]);
        });
      });

      scales.getColor = feature => {
        const region = feature.properties.region_id || feature.properties.region;
        return clusterMap.get(region) || '#ccc';
      };
    } else if (visualizationMode === VISUALIZATION_MODES.SHOCKS) {
      const shockedRegions = new Set(detectedShocks.map(shock => shock.region));

      scales.getColor = feature => {
        const region = feature.properties.region_id || feature.properties.region;
        if (shockedRegions.has(region)) {
          return 'red';
        } else {
          return '#ccc';
        }
      };
    }

    return scales;
  }, [geoData, marketClusters, detectedShocks, visualizationMode]);

  const renderAnalysisPanel = useCallback(() => {
    if (!analysis) return null;

    return (
      <ErrorBoundary fallback={<ErrorDisplay error="An error occurred" />}>
        <>
          <Grid item xs={12} md={6}>
            <SpatialDiagnostics
              data={analysis?.[`${selectedCommodity}_unified`] || {}}
              selectedMonth={selectedDate}
              selectedRegion={selectedRegion}
              marketClusters={marketClusters}
              shocks={detectedShocks}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <DynamicInterpretation
              data={analysis?.[`${selectedCommodity}_unified`] || {}}
              spatialWeights={weights}
              selectedRegion={selectedRegion}
              marketMetrics={{
                marketCoverage: marketClusters.length / (Object.keys(weights || {}).length || 1),
                integrationLevel: analysis?.[`${selectedCommodity}_unified`]?.r_squared || 0,
                transmissionEfficiency: analysis?.[`${selectedCommodity}_unified`]?.coefficients?.spatial_lag_price || 0
              }}
              timeSeriesData={geoData?.features || []}
            />
          </Grid>
        </>
      </ErrorBoundary>
    );
  }, [analysis, selectedCommodity, selectedDate, selectedRegion, marketClusters, detectedShocks, weights, geoData]);

  const renderMap = useCallback(() => (
    <ErrorBoundary
      fallback={
        <ErrorDisplay 
          error="Failed to render map component" 
          title="Map Error"
        />
      }
    >
      <Box sx={{ height: 500, position: 'relative' }}>
        <SpatialMap
          geoData={geoData}
          flowMaps={flows}
          selectedMonth={selectedDate}
          onMonthChange={handleMonthChange}
          availableMonths={uniqueMonths}
          spatialWeights={weights}
          showFlows={showFlows}
          onToggleFlows={() => setShowFlows(prev => !prev)}
          analysisResults={analysis?.[`${selectedCommodity}_unified`] || null}
          selectedCommodity={selectedCommodity}
          marketClusters={marketClusters}
          detectedShocks={detectedShocks}
          visualizationMode={visualizationMode}
          colorScales={colorScales}
          onRegionSelect={setSelectedRegion}
        />
      </Box>
    </ErrorBoundary>
  ), [
    geoData,
    flows,
    selectedDate,
    uniqueMonths,
    weights,
    showFlows,
    analysis,
    selectedCommodity,
    marketClusters,
    detectedShocks,
    visualizationMode,
    colorScales
  ]);

  if (status === 'loading' || status === 'idle') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <LoadingSpinner progress={loadingProgress} />
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <ErrorDisplay
        error={error || 'Failed to load spatial analysis data'}
        title="Analysis Error"
      />
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <ErrorBoundary fallback={<ErrorDisplay error="An unknown error occurred" />}>
        <Grid container spacing={2}>
          {/* Map Controls */}
          <Grid item xs={12}>
            <MapControls
              selectedCommodity={selectedCommodity}
              selectedDate={selectedDate}
              uniqueMonths={uniqueMonths}
              commodities={commodities}
              analysisResults={analysis}
              onCommodityChange={handleCommodityChange}
              onDateChange={handleDateChange}
              onRefresh={handleRefresh}
            />
          </Grid>

          {/* Map Component */}
          <Grid item xs={12}>
            {renderMap()}
          </Grid>

          {/* Analysis Panels */}
          {renderAnalysisPanel()}

          {/* Map Legend */}
          {colorScales && (
            <MapLegend
              title={`${selectedCommodity} Distribution`}
              colorScale={colorScales.getColor}
              unit={analysis?.[`${selectedCommodity}_unified`]?.units || ''}
              description="Spatial distribution of values"
              position="bottomright"
              statistics={{
                'Spatial Effect': analysis?.[`${selectedCommodity}_unified`]?.coefficients?.spatial_lag_price,
                'Integration': analysis?.[`${selectedCommodity}_unified`]?.r_squared,
                'Correlation': analysis?.[`${selectedCommodity}_unified`]?.moran_i?.I
              }}
            />
          )}

          {/* Time Controls */}
          <TimeControls
            availableMonths={uniqueMonths}
            selectedMonth={selectedDate}
            onMonthChange={handleMonthChange}
            analysisResults={analysis}
            spatialWeights={weights}
          />
        </Grid>
      </ErrorBoundary>
    </Box>
  );
};

export default React.memo(SpatialAnalysis);