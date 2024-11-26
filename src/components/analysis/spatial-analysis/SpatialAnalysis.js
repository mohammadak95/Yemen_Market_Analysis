// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useMemo, useState } from 'react';
import { 
  Box, Paper, Tabs, Tab, Typography, Alert, Grid, 
  Card, CardContent, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import _ from 'lodash';

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
import {
  calculateCoefficientOfVariation,
  calculateMarketCoverage,
  calculateConflictImpact,
  calculateNorthSouthDisparity,
} from './utils/spatialAnalysis';

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

  // Process clusters with error handling
  const { clusters: processedClusters, metrics: clusterMetrics } = useClusterEfficiency();

  // Calculate key economic indicators with safety checks
  const economicIndicators = useMemo(() => {
    if (!spatialData || !timeSeriesData) return null;

    try {
      const calculatePriceDispersion = () => {
        if (!timeSeriesData?.length) return 0;
        const latestData = _.last(timeSeriesData);
        const prices = Object.values(latestData?.prices || {}).filter(price => !isNaN(price));
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
          flows={marketFlows}
          spatialAutocorrelation={spatialData?.spatialAutocorrelation?.local}
          marketIntegration={marketIntegration}
          geometry={geometryData}
          marketClusters={marketClusters}
        />
      )
    }
  ], [
    economicIndicators, timeSeriesData, spatialData, geometryData, marketFlows,
    marketIntegration, processedClusters, clusterMetrics, timeWindow, marketClusters
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
