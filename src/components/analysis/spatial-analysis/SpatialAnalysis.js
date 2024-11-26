// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Paper, Tabs, Tab, Typography, Alert } from '@mui/material';
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
import NetworkGraphLegend from './components/network/NetworkGraphLegend';
import MarketHealthMetrics from './components/health/MarketHealthMetrics';
import ShockPropagationMap from './components/shocks/ShockPropagationMap';
import ClusterEfficiencyDashboard from './components/network/ClusterEfficiencyDashboard';
import ClusterMap from './components/network/ClusterMap';
import SeasonalPriceMap from './components/seasonal/SeasonalPriceMap';
import ConflictImpactDashboard from './components/conflict/ConflictImpactDashboard';
import FlowNetworkAnalysis from './components/flows/FlowNetworkAnalysis';
import { useClusterEfficiency, useComparativeClusters } from './hooks/useClusterEfficiency';

const DEBUG = process.env.NODE_ENV === 'development';

const UnifiedSpatialDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const spatialData = useSelector(selectSpatialDataOptimized);
  const marketClusters = useSelector(selectMarketClusters);
  const flowData = useSelector(selectMarketFlows);
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const visualizationMode = useSelector(selectVisualizationMode);
  const marketIntegration = useSelector(selectMarketIntegration);
  const geometryData = useSelector(selectGeometryData);

  // Use our new hooks for cluster analysis
  const processedClusters = useClusterEfficiency();
  const comparativeClusters = useComparativeClusters();

  if (DEBUG) {
    console.group('UnifiedSpatialDashboard Render');
    console.log('Spatial Data:', spatialData);
    console.log('Processed Clusters:', processedClusters);
    console.log('Comparative Metrics:', comparativeClusters);
  }

  // Memoized computed metrics
  const marketHealthMetrics = useMemo(() => {
    if (!spatialData) return null;

    const {
      marketIntegration,
      spatialAutocorrelation,
      timeSeriesData: tsData,
      marketShocks,
      uniqueMonths,
    } = spatialData;

    // Compute metrics using actual data
    const averageVolatility = tsData?.reduce((acc, curr) => 
      acc + (curr.volatility || 0), 0) / (tsData?.length || 1);

    const conflictImpact = tsData?.reduce((acc, curr) => 
      acc + (curr.conflict_intensity || 0), 0) / (tsData?.length || 1);

    const shockFrequency = (marketShocks?.length || 0) / (uniqueMonths?.length || 1);

    // Include cluster efficiency from our processed data
    const clusterEfficiency = processedClusters?.reduce((acc, cluster) => 
      acc + cluster.metrics.efficiency_score, 0) / (processedClusters?.length || 1);

    return {
      integration: marketIntegration?.integration_score || 0,
      spatialAutocorrelation: spatialAutocorrelation?.global?.I || 0,
      averageVolatility,
      clusterEfficiency,
      conflictImpact,
      shockFrequency,
    };
  }, [spatialData, processedClusters]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (DEBUG) {
      console.log('Tab changed:', newValue);
    }
  };

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
          Spatial Market Analysis Dashboard
        </Typography>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Market Health" />
          <Tab label="Network Analysis" />
          <Tab label="Cluster Analysis" />
          <Tab label="Price Shocks" />
          <Tab label="Seasonal Patterns" />
          <Tab label="Conflict Impact" />
          <Tab label="Flow Analysis" />
        </Tabs>
      </Paper>

      <Box sx={{ height: 'calc(100% - 120px)', overflow: 'auto', p: 2 }}>
        <TabPanel value={activeTab} index={0}>
          <MarketHealthMetrics
            metrics={marketHealthMetrics}
            timeSeriesData={timeSeriesData}
            spatialPatterns={spatialData.spatialAutocorrelation}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <NetworkGraph
              flows={flowData}
              geometryData={geometryData}
              marketIntegration={marketIntegration}
            />
            <NetworkGraphLegend 
              metrics={marketHealthMetrics}
              flowData={flowData}
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ClusterMap 
              marketClusters={marketClusters}
              geometryData={geometryData}
            />
            <ClusterEfficiencyDashboard 
              clusters={processedClusters}
              comparativeMetrics={comparativeClusters}
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <ShockPropagationMap
            shocks={spatialData.marketShocks}
            spatialAutocorrelation={spatialData.spatialAutocorrelation?.local}
            timeRange={spatialData.uniqueMonths}
            geometry={spatialData.geometry}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <SeasonalPriceMap
            seasonalAnalysis={spatialData.seasonalAnalysis}
            geometry={spatialData.geometry}
            timeSeriesData={timeSeriesData}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <ConflictImpactDashboard
            timeSeriesData={timeSeriesData}
            spatialClusters={spatialData.spatialAutocorrelation?.local}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={6}>
          <FlowNetworkAnalysis
            flows={flowData}
            spatialAutocorrelation={spatialData.spatialAutocorrelation?.local}
            marketIntegration={marketIntegration}
            geometry={geometryData}
            marketClusters={marketClusters}
          />
        </TabPanel>
      </Box>
    </Box>
  );
};

// TabPanel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );
}

export default UnifiedSpatialDashboard;