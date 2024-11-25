// src/components/analysis/spatial-analysis/SpatialAnalysis.js.js

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Paper, Tabs, Tab, Typography } from '@mui/material';
import {
  selectSpatialDataOptimized,
  selectMarketClusters,
  selectMarketFlows,
  selectTimeSeriesData,
  selectVisualizationMode,
} from '../../../selectors/optimizedSelectors';
import NetworkGraph from './components/network/NetworkGraph';
import MarketHealthMetrics from './components/health/MarketHealthMetrics';
import ShockPropagationMap from './components/shocks/ShockPropagationMap';
import ClusterEfficiencyDashboard from './components/clusters/ClusterEfficiencyDashboard';
import SeasonalPriceMap from './components/seasonal/SeasonalPriceMap';
import ConflictImpactDashboard from './components/conflict/ConflictImpactDashboard';
import FlowNetworkAnalysis from './components/flows/FlowNetworkAnalysis';

const UnifiedSpatialDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const spatialData = useSelector(selectSpatialDataOptimized);
  const marketClusters = useSelector(selectMarketClusters);
  const flowData = useSelector(selectMarketFlows);
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const visualizationMode = useSelector(selectVisualizationMode);

  // Memoized computed metrics
  const marketHealthMetrics = useMemo(() => {
    const {
      marketIntegration,
      spatialAutocorrelation,
      timeSeriesData: tsData,
      marketShocks,
      uniqueMonths,
    } = spatialData || {};

    // Compute average volatility
    const averageVolatility =
      tsData && tsData.length > 0
        ? tsData.reduce((acc, curr) => acc + (curr.volatility || 0), 0) / tsData.length
        : 0;

    // Compute conflict impact
    const conflictImpact =
      tsData && tsData.length > 0
        ? tsData.reduce((acc, curr) => acc + (curr.conflictIntensity || 0), 0) / tsData.length
        : 0;

    // Compute shock frequency
    const shockFrequency = (marketShocks?.length || 0) / (uniqueMonths?.length || 1);

    return {
      integration: marketIntegration?.integrationScore || 0,
      spatialAutocorrelation: spatialAutocorrelation?.global?.I || 0,
      averageVolatility,
      clusterEfficiency: 0, // Adjust if cluster efficiency data is available
      conflictImpact,
      shockFrequency,
    };
  }, [spatialData]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

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
          <Tab label="Integration Networks" />
          <Tab label="Price Shocks" />
          <Tab label="Cluster Efficiency" />
          <Tab label="Seasonal Patterns" />
          <Tab label="Conflict Impact" />
          <Tab label="Flow Analysis" />
        </Tabs>
      </Paper>

      <Box sx={{ height: 'calc(100% - 120px)', overflow: 'auto' }}>
        <TabPanel value={activeTab} index={0}>
          <MarketHealthMetrics
            metrics={marketHealthMetrics}
            timeSeriesData={timeSeriesData}
            spatialPatterns={spatialData.spatialAutocorrelation}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <NetworkGraph
            correlationMatrix={spatialData.marketIntegration?.priceCorrelation}
            accessibility={spatialData.marketIntegration?.accessibility}
            flowDensity={spatialData.marketIntegration?.flowDensity}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <ShockPropagationMap
            shocks={spatialData.marketShocks}
            spatialAutocorrelation={spatialData.spatialAutocorrelation?.local}
            timeRange={spatialData.uniqueMonths}
            geometry={spatialData.geometry}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <ClusterEfficiencyDashboard
            // Provide cluster efficiency data if available
            clusterEfficiency={spatialData.clusterEfficiency || []}
            marketClusters={marketClusters}
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
            marketIntegration={spatialData.marketIntegration}
            geometry={spatialData.geometry}
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