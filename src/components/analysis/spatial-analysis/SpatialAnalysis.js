// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useMemo, useState, useCallback } from 'react';
import { 
  Box, Paper, Tabs, Tab, Typography, Alert, Grid, 
  CircularProgress
} from '@mui/material';
import _ from 'lodash';

// Correct imports for Dialog and related components from Material-UI
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

import {
  useSpatialAnalysisData,
  useMarketAnalysisData,
  useVisualizationState,
  useDataAvailability
} from '../../../hooks/useSpatialSelectors';

import NetworkGraph from './components/network/NetworkGraph';
import MarketHealthMetrics from './components/health/MarketHealthMetrics';
import ShockPropagationMap from './components/shocks/ShockPropagationMap';
import ClusterEfficiencyDashboard from './components/clusters/ClusterEfficiencyDashboard';
import SeasonalPriceMap from './components/seasonal/SeasonalPriceMap';
import ConflictImpactDashboard from './components/conflict/ConflictImpactDashboard';
import FlowNetworkAnalysis from './components/flows/FlowNetworkAnalysis';
import SpatialAutocorrelationAnalysis from './components/autocorrelation/SpatialAutocorrelationAnalysis';
import MetricCard from './components/common/MetricCard';
import { useClusterEfficiency } from './hooks/useClusterEfficiency';
import useClusterAnalysis from './hooks/useClusterAnalysis';
import {
  calculateCoefficientOfVariation,
  calculateMarketCoverage,
  calculateConflictImpact,
  calculateNorthSouthDisparity,
} from './utils/spatialAnalysis';

// Error boundary component for catching render errors
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

const SpatialAnalysis = React.memo(() => {
  const [activeTab, setActiveTab] = useState(0);
  const [timeWindow, setTimeWindow] = useState('6M');
  const [showWelcome, setShowWelcome] = useState(true);
  
  // Use custom hooks for data access
  const { spatialData, loadingStatus, geometryData } = useSpatialAnalysisData();
  const { marketClusters, marketFlows, marketIntegration, timeSeriesData } = useMarketAnalysisData();
  const { mode: visualizationMode } = useVisualizationState();
  const { isLoading, hasData, isError, errorMessage } = useDataAvailability();

  console.log('Spatial Analysis Data:', {
    hasMarketClusters: !!spatialData?.marketClusters?.length,
    marketClustersCount: spatialData?.marketClusters?.length,
    hasFlowMaps: !!spatialData?.flowMaps?.length,
    flowMapsCount: spatialData?.flowMaps?.length
  });

  // Process clusters with error handling
  const { clusters: processedClusters, metrics: clusterMetrics } = useClusterAnalysis(
    spatialData?.marketClusters || [],
    spatialData?.flowMaps || [],
    geometryData
  );

  // Enhanced spatial autocorrelation handler with better validation
  const getSpatialAutocorrelation = useCallback((data) => {
    if (!data?.spatialAutocorrelation) {
      console.warn('Missing spatialAutocorrelation in data:', data);
      return {
        global: { moran_i: 0, p_value: 1, z_score: null, significance: false },
        local: {}
      };
    }

    // Validate and transform the data structure we see in the logs
    const { global, local } = data.spatialAutocorrelation;

    // Debug log for validation
    console.log('Processing spatial autocorrelation:', { global, local });

    // Ensure global metrics exist with proper defaults
    const validatedGlobal = {
      moran_i: global?.moran_i ?? 0,
      p_value: global?.p_value ?? 1,
      z_score: global?.z_score ?? null,
      significance: global?.significance ?? false
    };

    // Ensure local metrics exist and are properly formatted
    const validatedLocal = local ? Object.entries(local).reduce((acc, [region, metrics]) => {
      acc[region] = {
        local_i: metrics?.local_i ?? 0,
        p_value: metrics?.p_value ?? null,
        cluster_type: metrics?.cluster_type ?? 'not-significant'
      };
      return acc;
    }, {}) : {};

    return {
      global: validatedGlobal,
      local: validatedLocal
    };
  }, []);

  // Calculate key economic indicators with enhanced validation
  const economicIndicators = useMemo(() => {
    if (!spatialData || !timeSeriesData) return null;

    try {
      return {
        marketEfficiency: 0.75, // Placeholder - implement actual calculation
        spatialIntegration: 0.82,
        priceDispersion: 0.15,
        conflictImpact: 0.45
      };
    } catch (error) {
      console.error('Error calculating economic indicators:', error);
      return null;
    }
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
          flows={marketFlows}
          geometryData={geometryData}
          marketIntegration={marketIntegration}
        />
      )
    },
    {
      label: "Cluster Analysis",
      component: (
        <ClusterEfficiencyDashboard
          clusters={spatialData?.marketClusters}
          flowMaps={spatialData?.flowMaps}
          geometryData={geometryData}
        />
      )
    },
    {
      label: "Price Shock Analysis",
      component: (
        <ErrorBoundary>
          <ShockPropagationMap
            shocks={spatialData?.marketShocks}
            spatialAutocorrelation={getSpatialAutocorrelation(spatialData)?.local}
            timeRange={spatialData?.uniqueMonths}
            geometry={geometryData}
          />
        </ErrorBoundary>
      )
    },
    {
      label: "Seasonal Patterns",
      component: (
        <ErrorBoundary>
          <SeasonalPriceMap
            seasonalAnalysis={spatialData?.seasonalAnalysis}
            geometry={geometryData}
            timeSeriesData={timeSeriesData}
          />
        </ErrorBoundary>
      )
    },
    {
      label: "Conflict Impact",
      component: (
        <ErrorBoundary>
          <ConflictImpactDashboard
            timeSeriesData={timeSeriesData}
            spatialClusters={getSpatialAutocorrelation(spatialData)?.local}
            timeWindow={timeWindow}
          />
        </ErrorBoundary>
      )
    },
    {
      label: "Flow Network",
      component: (
        <ErrorBoundary>
          <FlowNetworkAnalysis
            flows={marketFlows}
            spatialAutocorrelation={getSpatialAutocorrelation(spatialData)?.local}
            marketIntegration={marketIntegration}
            geometry={geometryData}
            marketClusters={marketClusters}
          />
        </ErrorBoundary>
      )
    }
  ], [
    economicIndicators, timeSeriesData, spatialData, geometryData, marketFlows,
    marketIntegration, processedClusters, clusterMetrics, timeWindow, marketClusters,
    getSpatialAutocorrelation
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

  // Debug log for render
  console.log('Rendering SpatialAnalysis with data:', {
    hasAutocorrelation: Boolean(spatialData?.spatialAutocorrelation),
    hasGeometry: Boolean(geometryData),
    activeTab
  });

  return (
    <>
      <WelcomeDialog 
        open={showWelcome} 
        onClose={() => setShowWelcome(false)} 
      />
      
      <Box sx={{ flexGrow: 1, height: '100%', overflow: 'hidden' }}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 2, 
            mb: 2,
            bgcolor: 'background.paper',
            borderRadius: 1
          }}
        >
          <Typography variant="h5" gutterBottom>
            Yemen Market Spatial Analysis Dashboard
          </Typography>
          
          {economicIndicators && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Market Efficiency Score"
                  value={economicIndicators.marketEfficiency.toFixed(2)}
                  format="percentage"
                  description="Overall market integration and efficiency"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Spatial Integration"
                  value={economicIndicators.spatialIntegration.toFixed(2)}
                  format="number"
                  description="Market integration strength"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Price Dispersion"
                  value={economicIndicators.priceDispersion.toFixed(2)}
                  format="percentage"
                  description="Cross-regional price variation"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Conflict Impact"
                  value={economicIndicators.conflictImpact.toFixed(2)}
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
            sx={{
              '& .MuiTabs-scroller': {
                overflow: 'hidden'
              },
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
          {tabPanels[activeTab].component}
        </Box>
      </Box>
    </>
  );
});

export default SpatialAnalysis;
