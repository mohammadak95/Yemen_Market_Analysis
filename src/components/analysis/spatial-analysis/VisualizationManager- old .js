import React from 'react';
import NetworkGraph from './components/network/NetworkGraph';
import MarketHealthMetrics from './components/health/MarketHealthMetrics';
import ShockPropagationMap from './components/shocks/ShockPropagationMap';
import ClusterEfficiencyDashboard from './components/clusters/ClusterEfficiencyDashboard';
import SeasonalPriceMap from './components/seasonal/SeasonalPriceMap';
import ConflictImpactDashboard from './components/conflict/ConflictImpactDashboard';
import FlowNetworkAnalysis from './components/flows/FlowNetworkAnalysis';

const VisualizationManager = ({
  mode,
  spatialData,
  marketClusters,
  marketIntegration,
  timeSeriesData,
  geometry,
  flowData,
}) => {
  switch (mode) {
    case 'network':
      return (
        <NetworkGraph
          correlationMatrix={marketIntegration?.price_correlation}
          accessibility={marketIntegration?.accessibility}
          flowDensity={marketIntegration?.flow_density}
        />
      );
    case 'health':
      return (
        <MarketHealthMetrics
          metrics={spatialData?.metrics}
          timeSeriesData={timeSeriesData}
          spatialPatterns={spatialData?.spatialAutocorrelation}
        />
      );
    case 'shocks':
      return (
        <ShockPropagationMap
          shocks={spatialData?.marketShocks}
          spatialAutocorrelation={spatialData?.spatialAutocorrelation?.local}
          geometry={geometry}
        />
      );
    case 'clusters':
      return (
        <ClusterEfficiencyDashboard
          clusterEfficiency={spatialData?.cluster_efficiency}
          marketClusters={marketClusters}
        />
      );
    case 'seasonal':
      return (
        <SeasonalPriceMap
          seasonalAnalysis={spatialData?.seasonal_analysis}
          geometry={geometry}
          timeSeriesData={timeSeriesData}
        />
      );
    case 'conflict':
      return (
        <ConflictImpactDashboard
          timeSeriesData={timeSeriesData}
          spatialClusters={spatialData?.spatialAutocorrelation?.local}
        />
      );
    case 'flows':
      return (
        <FlowNetworkAnalysis
          flows={flowData}
          spatialAutocorrelation={spatialData?.spatialAutocorrelation?.local}
          marketIntegration={marketIntegration}
          geometry={geometry}
          marketClusters={marketClusters}
        />
      );
    default:
      return null;
  }
};

export default VisualizationManager;