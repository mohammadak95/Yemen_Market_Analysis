import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Alert,
  Button
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MapIcon from '@mui/icons-material/Map';
import TimelineIcon from '@mui/icons-material/Timeline';
import HubIcon from '@mui/icons-material/Hub';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';

import { ClusterAnalysis } from './features/clusters';
import { SpatialAutocorrelationAnalysis } from './features/autocorrelation';
import { FlowNetworkAnalysis } from './features/flows';
import { ShockPropagationMap } from './features/shocks';
import { ConflictImpactDashboard } from './features/conflict';
import { SeasonalPriceMap } from './features/seasonal';
import { MarketHealthMetrics } from './features/health';
import { clearFlowData } from '../../slices/flowSlice';

import ErrorBoundary from '../common/ErrorBoundary';
import LoadingIndicator from '../common/LoadingIndicator';

import {
  selectTimeSeriesData,
  selectGeometryData,
  selectMarketIntegration,
  selectLoadingStatus,
  selectStatus
} from '../../selectors/optimizedSelectors';

const FEATURES = [
  {
    id: 'clusters',
    label: 'Market Clusters',
    icon: <MapIcon />,
    component: ClusterAnalysis,
    description: 'Analyze market clustering patterns and relationships'
  },
  {
    id: 'autocorrelation',
    label: 'Spatial Patterns',
    icon: <TimelineIcon />,
    component: SpatialAutocorrelationAnalysis,
    description: 'Examine spatial price dependencies and patterns'
  },
  {
    id: 'flows',
    label: 'Market Flows',
    icon: <HubIcon />,
    component: FlowNetworkAnalysis,
    description: 'Visualize and analyze market flow networks'
  },
  {
    id: 'shocks',
    label: 'Price Shocks',
    icon: <TrendingUpIcon />,
    component: ShockPropagationMap,
    description: 'Track and analyze price shock propagation'
  },
  {
    id: 'conflict',
    label: 'Conflict Impact',
    icon: <WarningIcon />,
    component: ConflictImpactDashboard,
    description: 'Assess conflict impact on market dynamics'
  },
  {
    id: 'seasonal',
    label: 'Seasonal Patterns',
    icon: <CalendarTodayIcon />,
    component: SeasonalPriceMap,
    description: 'Analyze seasonal price patterns and variations'
  },
  {
    id: 'health',
    label: 'Market Health',
    icon: <HealthAndSafetyIcon />,
    component: MarketHealthMetrics,
    description: 'Monitor overall market system health'
  }
];

const SpatialAnalysis = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [activeFeature, setActiveFeature] = useState('clusters');
  const [error, setError] = useState(null);

  // Get data from Redux store
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const geometryData = useSelector(selectGeometryData);
  const marketIntegration = useSelector(selectMarketIntegration);
  const loadingStatus = useSelector(selectLoadingStatus);
  const status = useSelector(selectStatus);

  // Handle feature change with event prevention
  const handleFeatureChange = (event, newValue) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (newValue === activeFeature) return; // Prevent unnecessary re-renders
    
    // Only clear flow data when switching away from flows feature
    if (activeFeature === 'flows') {
      dispatch(clearFlowData());
    }
    
    setActiveFeature(newValue);
    setError(null); // Reset error state on feature change
  };

  // Handle component errors
  const handleError = (error) => {
    setError(error);
    console.error('Feature error:', error);
  };

  // Get active feature component
  const ActiveFeatureComponent = FEATURES.find(f => 
    f.id === activeFeature
  )?.component;

  // Show loading state
  if (loadingStatus.loading) {
    return (
      <LoadingIndicator
        message={loadingStatus.stage || 'Loading spatial analysis...'}
        progress={loadingStatus.progress}
        variant="linear"
      />
    );
  }

  // Show error if status indicates error
  if (status === 'error') {
    return (
      <Alert
        severity="error"
        sx={{ m: 2 }}
        action={
          <Button color="inherit" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      >
        An error occurred while loading spatial analysis data.
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Feature Navigation */}
      <Paper 
        sx={{ 
          borderRadius: 0,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
        elevation={0}
      >
        <Tabs
          value={activeFeature}
          onChange={handleFeatureChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2 }}
          TabIndicatorProps={{
            style: {
              transition: 'none' // Prevent animation that might cause refresh
            }
          }}
        >
          {FEATURES.map(feature => (
            <Tab
              key={feature.id}
              value={feature.id}
              label={feature.label}
              icon={feature.icon}
              iconPosition="start"
              onClick={(e) => e.stopPropagation()} // Prevent event bubbling
            />
          ))}
        </Tabs>
      </Paper>

      {/* Feature Description */}
      <Paper 
        sx={{ 
          p: 2,
          borderRadius: 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.grey[50]
        }}
        elevation={0}
      >
        <Typography variant="body2" color="textSecondary">
          {FEATURES.find(f => f.id === activeFeature)?.description}
        </Typography>
      </Paper>

      {/* Active Feature */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <ErrorBoundary
          message={`An error occurred while rendering the ${
            FEATURES.find(f => f.id === activeFeature)?.label
          } feature.`}
          onError={handleError}
        >
          {ActiveFeatureComponent && (
            <ActiveFeatureComponent
              timeSeriesData={timeSeriesData}
              geometryData={geometryData}
              marketIntegration={marketIntegration}
            />
          )}
        </ErrorBoundary>

        {error && (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
            onClose={() => setError(null)}
          >
            {error.message}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default React.memo(SpatialAnalysis);
