// src/components/analysis/spatial-analysis/UnifiedSpatialDashboard.js

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Grid, Box, Paper, Tabs, Tab, Typography } from '@mui/material';
import { ResponsiveContainer } from 'recharts';
import {
  selectSpatialDataOptimized,
  selectMarketClusters,
  selectMarketFlows,
  selectTimeSeriesData,
  selectVisualizationMode
} from '../../../selectors/optimizedSelectors';
import { NetworkGraph } from './components/NetworkGraph';
import { MarketHealthMetrics } from './components/MarketHealthMetrics';
import { ShockPropagationMap } from './components/ShockPropagationMap';
import { ClusterEfficiencyDashboard } from './components/ClusterEfficiencyDashboard';
import { SeasonalPriceMap } from './components/SeasonalPriceMap';
import { ConflictImpactDashboard } from './components/ConflictImpactDashboard';
import { FlowNetworkAnalysis } from './components/FlowNetworkAnalysis';

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
      market_integration,
      spatialAutocorrelation,
      timeSeriesData,
      cluster_efficiency,
      marketShocks,
      uniqueMonths
    } = spatialData;

    return {
      integration: market_integration?.integration_score || 0,
      spatialAutocorrelation: spatialAutocorrelation?.global?.moran_i || 0,
      averageVolatility: timeSeriesData?.reduce((acc, curr) => acc + curr.volatility, 0) / timeSeriesData?.length || 0,
      clusterEfficiency: cluster_efficiency?.reduce((acc, curr) => acc + curr.efficiency_score, 0) / cluster_efficiency?.length || 0,
      conflictImpact: timeSeriesData?.reduce((acc, curr) => acc + curr.conflict_intensity, 0) / timeSeriesData?.length || 0,
      shockFrequency: (marketShocks?.length || 0) / (uniqueMonths?.length || 1)
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
        <Tabs value={activeTab} onChange={handleTabChange}>
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
            correlationMatrix={spatialData.market_integration?.price_correlation}
            accessibility={spatialData.market_integration?.accessibility}
            flowDensity={spatialData.market_integration?.flow_density}
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
            clusterEfficiency={spatialData.cluster_efficiency}
            marketClusters={marketClusters}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <SeasonalPriceMap 
            seasonalAnalysis={spatialData.seasonal_analysis}
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
            marketIntegration={spatialData.market_integration}
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
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default UnifiedSpatialDashboard;