//src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useMemo, useState, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Tabs, 
  Tab, 
  Typography, 
  Alert, 
  Grid, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent
} from '@mui/material';
import _ from 'lodash';

import {
  useSpatialAnalysisData,
  useMarketAnalysisData,
  useVisualizationState,
  useDataAvailability
} from '../../../hooks/useSpatialSelectors';

import {
  ClusterMap,
  ClusterMetricsPanel,
  ClusterComparisonTable,
  EfficiencyRadarChart,
  ClusterEfficiencyDashboard
} from './components/clusters';

import NetworkGraph from './components/network/NetworkGraph';
import MarketHealthMetrics from './components/health/MarketHealthMetrics';
import ShockPropagationMap from './components/shocks/ShockPropagationMap';
import SeasonalPriceMap from './components/seasonal/SeasonalPriceMap';
import ConflictImpactDashboard from './components/conflict/ConflictImpactDashboard';
import FlowNetworkAnalysis from './components/flows/FlowNetworkAnalysis';
import SpatialAutocorrelationAnalysis from './components/autocorrelation/SpatialAutocorrelationAnalysis';
import MetricCard from './components/common/MetricCard';
import { useClusterEfficiency } from './hooks/useClusterEfficiency';
import useClusterAnalysis from './hooks/useClusterAnalysis';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Spatial Analysis Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          <Typography variant="h6">Component Error</Typography>
          <Typography>{this.state.error?.message || 'An unexpected error occurred'}</Typography>
        </Alert>
      );
    }
    return this.props.children;
  }
}

const WelcomeDialog = ({ open, onClose }) => (
  <Dialog 
    open={open} 
    onClose={onClose}
    maxWidth="md"
    fullWidth
  >
    <DialogTitle>
      Welcome to the Yemen Market Analysis Dashboard
    </DialogTitle>
    <DialogContent>
      <Typography paragraph>
        This dashboard provides comprehensive spatial analysis of market dynamics in Yemen,
        integrating price data, conflict intensity, and market integration metrics.
      </Typography>
      <Typography variant="h6" gutterBottom>
        Key Features:
      </Typography>
      <ul>
        <li>Market Integration Analysis</li>
        <li>Spatial Autocorrelation Patterns</li>
        <li>Price Shock Propagation</li>
        <li>Conflict Impact Assessment</li>
        <li>Seasonal Price Variations</li>
        <li>Market Network Analysis</li>
      </ul>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="contained" color="primary">
        Get Started
      </Button>
    </DialogActions>
  </Dialog>
);

const LoadingState = ({ progress }) => (
  <Box 
    display="flex" 
    flexDirection="column" 
    justifyContent="center" 
    alignItems="center" 
    height="100vh"
    sx={{ bgcolor: 'background.paper' }}
  >
    <CircularProgress 
      size={60} 
      thickness={4} 
      variant={progress ? "determinate" : "indeterminate"}
      value={progress}
    />
    <Typography variant="h6" sx={{ mt: 2 }}>
      Loading Market Analysis Data...
    </Typography>
    {progress > 0 && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {Math.round(progress)}% Complete
      </Typography>
    )}
  </Box>
);

const ErrorState = ({ message }) => (
  <Alert 
    severity="error" 
    sx={{ 
      m: 2,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start'
    }}
  >
    <Typography variant="h6" gutterBottom>
      Error Loading Data
    </Typography>
    <Typography>
      {message}
    </Typography>
  </Alert>
);

const SpatialAnalysis = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [timeWindow, setTimeWindow] = useState('6M');
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [comparisonClusterId, setComparisonClusterId] = useState(null);

  const { spatialData, loadingStatus, geometryData } = useSpatialAnalysisData();
  const { marketClusters, marketFlows, marketIntegration, timeSeriesData } = useMarketAnalysisData();
  const { mode: visualizationMode } = useVisualizationState();
  const { isLoading, hasData, isError, errorMessage } = useDataAvailability();

  const { 
    clusters: processedClusters, 
    metrics: analysisMetrics, 
    error: analysisError 
  } = useClusterAnalysis(
    spatialData?.marketClusters,
    spatialData?.flowMaps,
    geometryData
  );

  const { 
    clusters: efficiencyClusters, 
    metrics: efficiencyMetrics 
  } = useClusterEfficiency(
    spatialData?.marketClusters,
    spatialData?.flowMaps
  );

  const combinedMetrics = useMemo(() => ({
    averageEfficiency: (analysisMetrics.averageEfficiency + efficiencyMetrics.averageEfficiency) / 2,
    totalCoverage: Math.max(analysisMetrics.totalCoverage, efficiencyMetrics.totalCoverage),
    networkDensity: analysisMetrics.networkDensity,
    clusterCount: processedClusters.length
  }), [analysisMetrics, efficiencyMetrics, processedClusters]);

  const handleClusterSelect = useCallback((clusterId) => {
    if (selectedClusterId === clusterId) {
      setSelectedClusterId(null);
      setComparisonClusterId(null);
    } else if (selectedClusterId === null) {
      setSelectedClusterId(clusterId);
    } else {
      setComparisonClusterId(clusterId);
    }
  }, [selectedClusterId]);

  const selectedCluster = useMemo(() => 
    processedClusters.find(c => c.cluster_id === selectedClusterId),
    [processedClusters, selectedClusterId]
  );

  const comparisonCluster = useMemo(() => 
    processedClusters.find(c => c.cluster_id === comparisonClusterId),
    [processedClusters, comparisonClusterId]
  );

  const tabPanels = useMemo(() => [
    {
      label: "Market Integration Overview",
      component: (
        <MarketHealthMetrics
          metrics={combinedMetrics}
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
          flows={marketFlows}
          geometryData={geometryData}
          marketIntegration={marketIntegration}
        />
      )
    },
    {
      label: "Cluster Analysis",
      component: (
        <ErrorBoundary>
          <ClusterEfficiencyDashboard
            clusters={processedClusters}
            flowMaps={spatialData?.flowMaps}
            geometryData={geometryData}
            selectedClusterId={selectedClusterId}
            comparisonClusterId={comparisonClusterId}
            onClusterSelect={handleClusterSelect}
            metrics={combinedMetrics}
          />
        </ErrorBoundary>
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
    }
  ], [
    processedClusters,
    spatialData,
    geometryData,
    selectedClusterId,
    comparisonClusterId,
    handleClusterSelect,
    combinedMetrics,
    timeSeriesData,
    marketFlows,
    marketIntegration,
    timeWindow
  ]);

  if (isLoading) {
    return <LoadingState progress={loadingStatus.progress} />;
  }

  if (isError) {
    return <ErrorState message={errorMessage} />;
  }

  if (!hasData) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No spatial data available. Please ensure data is properly loaded.
      </Alert>
    );
  }

  return (
    <>
      <WelcomeDialog 
        open={showWelcome} 
        onClose={() => setShowWelcome(false)} 
      />
      
      <Box sx={{ flexGrow: 1, height: '100%', overflow: 'hidden' }}>
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h5" gutterBottom>
            Yemen Market Spatial Analysis Dashboard
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Market Efficiency"
                value={combinedMetrics.averageEfficiency}
                format="percentage"
                description="Overall market integration and efficiency"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Coverage"
                value={combinedMetrics.totalCoverage}
                format="percentage"
                description="Market coverage across regions"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Network Density"
                value={combinedMetrics.networkDensity}
                format="percentage"
                description="Inter-market connection density"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Total Clusters"
                value={combinedMetrics.clusterCount}
                format="number"
                description="Number of active market clusters"
              />
            </Grid>
          </Grid>

          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            {tabPanels.map((panel, index) => (
              <Tab 
                key={index} 
                label={panel.label}
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  '&.Mui-selected': {
                    color: 'primary.main'
                  }
                }}
              />
            ))}
          </Tabs>
        </Paper>

        <Box sx={{ 
          height: 'calc(100% - 120px)', 
          overflow: 'auto', 
          p: 2,
          bgcolor: 'background.default',
          '& > *': {
            minHeight: '400px',
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 1
          }
        }}>
          <ErrorBoundary>
            {tabPanels[activeTab].component}
          </ErrorBoundary>
        </Box>
      </Box>
    </>
  );
};

export default React.memo(SpatialAnalysis);