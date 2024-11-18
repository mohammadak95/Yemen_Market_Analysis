// src/components/common/EnhancedErrorBoundary.js

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Button, Alert, Collapse } from '@mui/material';
import { CircularProgress } from '@mui/material';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Database, Bug } from 'lucide-react';
import { unifiedDataManager } from '../../utils/UnifiedDataManager';
import { spatialSystem } from '../../utils/SpatialSystem';
import { monitoringSystem } from '../../utils/MonitoringSystem';
import { dataTransformationSystem } from '../../utils/DataTransformationSystem';

class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      isRetrying: false,
      showDetails: false,
      systemStatus: {
        unifiedManager: null,
        spatialSystem: null,
        dataTransformation: null,
        monitoring: null
      }
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Get system status
    const systemStatus = this.checkSystemStatus();
    
    this.setState({ 
      errorInfo,
      systemStatus
    });

    // Log to monitoring system
    monitoringSystem.error('Error caught by boundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      systemStatus
    });

    // Production error reporting
    if (process.env.NODE_ENV === 'production' && window?.Sentry) {
      window.Sentry.captureException(error, { 
        extra: {
          ...errorInfo,
          systemStatus
        }
      });
    }
  }

  checkSystemStatus() {
    return {
      unifiedManager: {
        isInitialized: unifiedDataManager?._isInitialized || false,
        cacheStats: unifiedDataManager?.getCacheStats() || {},
      },
      spatialSystem: {
        isInitialized: spatialSystem?._isInitialized || false,
        validation: spatialSystem?.getValidationStatus() || {}
      },
      dataTransformation: {
        batchSize: dataTransformationSystem?.batchSize || 0,
        streamingThreshold: dataTransformationSystem?.streamingThreshold || 0
      },
      monitoring: {
        metrics: monitoringSystem?.getPerformanceReport() || {},
        errors: monitoringSystem?.errors?.size || 0
      }
    };
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    const metric = monitoringSystem.startMetric('error-boundary-retry');

    try {
      // Reset and reinitialize core systems
      if (!unifiedDataManager._isInitialized) {
        await unifiedDataManager.init();
      }

      if (!spatialSystem._isInitialized) {
        await spatialSystem.initialize();
      }

      // Clear caches
      unifiedDataManager.clearCache();

      // Call provided retry handler
      if (this.props.onRetry) {
        await this.props.onRetry();
      }

      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null, 
        isRetrying: false,
        systemStatus: this.checkSystemStatus()
      });

      metric.finish({ status: 'success' });
    } catch (error) {
      monitoringSystem.error('Retry failed:', error);
      
      this.setState({ 
        hasError: true, 
        error, 
        isRetrying: false,
        systemStatus: this.checkSystemStatus()
      });

      metric.finish({ status: 'error', error: error.message });
    }
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  getErrorTypeInfo() {
    const { error } = this.state;
    
    if (error?.message?.includes('initialization')) {
      return {
        icon: <Database className="w-6 h-6" />,
        title: 'System Initialization Error',
        description: 'The application failed to initialize core systems. This might be due to data loading or configuration issues.'
      };
    }

    if (error?.message?.includes('spatial')) {
      return {
        icon: <Bug className="w-6 h-6" />,
        title: 'Spatial Analysis Error',
        description: 'An error occurred while processing spatial market data. This might be due to invalid data or analysis configuration.'
      };
    }

    return {
      icon: <AlertTriangle className="w-6 h-6" />,
      title: 'Application Error',
      description: 'An unexpected error occurred while analyzing market data.'
    };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorTypeInfo = this.getErrorTypeInfo();
    const { systemStatus } = this.state;

    return (
      <Box 
        sx={{ 
          p: 3, 
          maxWidth: '100%',
          backgroundColor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {errorTypeInfo.icon}
          <Typography variant="h6" color="error">
            {errorTypeInfo.title}
          </Typography>
        </Box>

        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            {errorTypeInfo.description}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Error: {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
        </Alert>

        <Button
          onClick={this.toggleDetails}
          endIcon={this.state.showDetails ? <ChevronUp /> : <ChevronDown />}
          sx={{ mb: 2 }}
        >
          {this.state.showDetails ? 'Hide Technical Details' : 'Show Technical Details'}
        </Button>

        <Collapse in={this.state.showDetails}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              System Status:
            </Typography>
            <Box 
              component="pre"
              sx={{ 
                p: 2, 
                backgroundColor: 'grey.100',
                borderRadius: 1,
                fontSize: '0.875rem',
                fontFamily: 'monospace'
              }}
            >
              {JSON.stringify(systemStatus, null, 2)}
            </Box>
          </Box>

          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Component Stack:
              </Typography>
              <Box 
                component="pre"
                sx={{ 
                  p: 2, 
                  backgroundColor: 'grey.100',
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {this.state.errorInfo.componentStack}
              </Box>
            </Box>
          )}
        </Collapse>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            onClick={this.handleRetry}
            disabled={this.state.isRetrying}
            startIcon={this.state.isRetrying ? (
              <CircularProgress size={16} />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            variant="contained"
            color="primary"
          >
            {this.state.isRetrying ? 'Retrying...' : 'Retry Analysis'}
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outlined"
            color="primary"
          >
            Reload Application
          </Button>
        </Box>
      </Box>
    );
  }
}

EnhancedErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onRetry: PropTypes.func
};

export default EnhancedErrorBoundary;