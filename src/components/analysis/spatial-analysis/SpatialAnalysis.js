// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  Box, Paper, Tabs, Tab, Typography, Alert, Grid, 
  Card, CardContent 
} from '@mui/material';
import _ from 'lodash';
import {
  selectSpatialDataOptimized,
  selectMarketClusters,
  selectMarketFlows,
  selectTimeSeriesData,
  selectVisualizationMode,
  selectMarketIntegration,
  selectGeometryData
} from '../../../selectors/optimizedSelectors';
import NetworkGraph from './components/network/NetworkGraph';
import MarketHealthMetrics from './components/health/MarketHealthMetrics';
import ShockPropagationMap from './components/shocks/ShockPropagationMap';
import ClusterEfficiencyDashboard from './components/clusters/ClusterEfficiencyDashboard'; // Corrected import path
import SeasonalPriceMap from './components/seasonal/SeasonalPriceMap';
import ConflictImpactDashboard from './components/conflict/ConflictImpactDashboard';
import FlowNetworkAnalysis from './components/flows/FlowNetworkAnalysis';
import SpatialAutocorrelationAnalysis from './components/autocorrelation/SpatialAutocorrelationAnalysis';
import MetricCard from './components/common/MetricCard';
import { useClusterEfficiency } from './hooks/useClusterEfficiency';
import {
  calculateCoefficientOfVariation,
  calculateMarketCoverage,
  calculateConflictImpact,
  calculateNorthSouthDisparity,
} from './utils/spatialAnalysis'; // Corrected imports

const DEBUG = process.env.NODE_ENV === 'development';

const SpatialAnalysis = React.memo(() => {
  const [activeTab, setActiveTab] = useState(0);
  const [timeWindow, setTimeWindow] = useState('6M');
  
  // Selectors
  const spatialData = useSelector(selectSpatialDataOptimized);
  const marketClusters = useSelector(selectMarketClusters);
  const flowData = useSelector(selectMarketFlows);
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const visualizationMode = useSelector(selectVisualizationMode);
  const marketIntegration = useSelector(selectMarketIntegration);
  const geometryData = useSelector(selectGeometryData);

  // Process clusters
  const { clusters: processedClusters, metrics: clusterMetrics } = useClusterEfficiency();

  // Calculate key economic indicators
  const economicIndicators = useMemo(() => {
    if (!spatialData) return null;

    const calculatePriceDispersion = () => {
      if (!timeSeriesData?.length) return 0;
      const latestData = _.last(timeSeriesData);
      const prices = Object.values(latestData?.prices || {});
      return prices.length ? calculateCoefficientOfVariation(prices) : 0;
    };

    const calculateMarketEfficiency = () => {
      const integrationScore = spatialData.marketIntegration?.integration_score || 0;
      const spatialCorrelation = spatialData.spatialAutocorrelation?.global?.moran_i || 0;
      const priceConvergence = calculatePriceDispersion();
      
      return (integrationScore + spatialCorrelation + (1 - priceConvergence)) / 3;
    };

    return {
      marketEfficiency: calculateMarketEfficiency(),
      spatialIntegration: spatialData.marketIntegration?.integration_score || 0,
      spatialAutocorrelation: spatialData.spatialAutocorrelation?.global?.moran_i || 0,
      marketCoverage: calculateMarketCoverage(spatialData),
      priceDispersion: calculatePriceDispersion(),
      conflictImpact: calculateConflictImpact(spatialData),
      northSouthDisparity: calculateNorthSouthDisparity(spatialData),
      seasonalityStrength: spatialData.seasonalAnalysis?.seasonal_strength || 0
    };
  }, [spatialData, timeSeriesData]);

  const tabPanels = useMemo(() => [
    {
      label: "Market Integration Overview",
      component: (
        <MarketHealthMetrics
          metrics={economicIndicators}
          timeSeriesData={timeSeriesData}
          spatialPatterns={spatialData?.spatialAutocorrelation}
        />
      )
    },
    {
      label: "Spatial Autocorrelation",
      component: (
        <SpatialAutocorrelationAnalysis
          spatialData={spatialData}
          geometryData={geometryData}
        />
      )
    },
    {
      label: "Market Network Analysis",
      component: (
        <NetworkGraph
          flows={flowData}
          geometryData={geometryData}
          marketIntegration={marketIntegration}
        />
      )
    },
    {
      label: "Cluster Analysis",
      component: (
        <ClusterEfficiencyDashboard
          clusters={processedClusters}
          metrics={clusterMetrics}
          geometryData={geometryData}
        />
      )
    },
    {
      label: "Price Shock Analysis",
      component: (
        <ShockPropagationMap
          shocks={spatialData?.marketShocks}
          spatialAutocorrelation={spatialData?.spatialAutocorrelation?.local}
          timeRange={spatialData?.uniqueMonths}
          geometry={geometryData}
        />
      )
    },
    {
      label: "Seasonal Patterns",
      component: (
        <SeasonalPriceMap
          seasonalAnalysis={spatialData?.seasonalAnalysis}
          geometry={geometryData}
          timeSeriesData={timeSeriesData}
        />
      )
    },
    {
      label: "Conflict Impact",
      component: (
        <ConflictImpactDashboard
          timeSeriesData={timeSeriesData}
          spatialClusters={spatialData?.spatialAutocorrelation?.local}
          timeWindow={timeWindow}
        />
      )
    },
    {
      label: "Flow Network",
      component: (
        <FlowNetworkAnalysis
          flows={flowData}
          spatialAutocorrelation={spatialData?.spatialAutocorrelation?.local}
          marketIntegration={marketIntegration}
          geometry={geometryData}
          marketClusters={marketClusters}
        />
      )
    }
  ], [
    economicIndicators, timeSeriesData, spatialData, geometryData, flowData,
    marketIntegration, processedClusters, clusterMetrics, timeWindow, marketClusters
  ]);

  if (!spatialData) {
    return (
      <Alert severity="warning">
        No spatial data available. Please ensure data is properly loaded.
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, height: '100%', overflow: 'hidden' }}>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Yemen Market Spatial Analysis Dashboard
        </Typography>
        
        {economicIndicators && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Market Efficiency Score"
                value={economicIndicators.marketEfficiency}
                format="percentage"
                description="Overall market integration and efficiency"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Spatial Integration"
                value={economicIndicators.spatialIntegration}
                format="number"
                description="Market integration strength"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Price Dispersion"
                value={economicIndicators.priceDispersion}
                format="percentage"
                description="Cross-regional price variation"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Conflict Impact"
                value={economicIndicators.conflictImpact}
                format="number"
                description="Conflict-price correlation"
              />
            </Grid>
          </Grid>
        )}

        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabPanels.map((panel, index) => (
            <Tab key={index} label={panel.label} />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ height: 'calc(100% - 120px)', overflow: 'auto', p: 2 }}>
        {tabPanels[activeTab].component}
      </Box>
    </Box>
  );
});

export default SpatialAnalysis;
