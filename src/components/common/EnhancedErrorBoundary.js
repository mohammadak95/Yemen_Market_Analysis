// src/components/common/EnhancedErrorBoundary.js

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Button, Alert, Collapse } from '@mui/material';
import { CircularProgress } from '@mui/material';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Database, Bug } from 'lucide-react';
import { precomputedDataManager } from '../../utils/PrecomputedDataManager';
import { spatialIntegrationSystem } from '../../utils/spatialIntegrationSystem';
import { backgroundMonitor } from '../../utils/backgroundMonitor';

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
        dataManager: null,
        integrationSystem: null,
        monitor: null
      }
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error);
    
    // Get system status
    const systemStatus = this.checkSystemStatus();
    
    this.setState({ 
      errorInfo,
      systemStatus
    });

    if (process.env.NODE_ENV === 'production' && window?.Sentry) {
      window.Sentry.captureException(error, { 
        extra: {
          ...errorInfo,
          systemStatus
        }
      });
    }

    // Log to background monitor
    backgroundMonitor.logError('error-boundary-catch', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      systemStatus
    });
  }

  checkSystemStatus() {
    return {
      dataManager: {
        isInitialized: precomputedDataManager?._isInitialized || false,
        isCacheInitialized: precomputedDataManager?._cacheInitialized || false,
        cacheSize: precomputedDataManager?.cache?.size || 0
      },
      integrationSystem: {
        isInitialized: spatialIntegrationSystem?._isInitialized || false
      },
      monitor: {
        metrics: backgroundMonitor?.metrics?.length || 0,
        errors: backgroundMonitor?.errors?.length || 0
      }
    };
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    const metric = backgroundMonitor.startMetric('error-boundary-retry');

    try {
      // Reset system states
      if (!precomputedDataManager.isInitialized) {
        await precomputedDataManager.initialize();
      }

      if (!spatialIntegrationSystem._isInitialized) {
        await spatialIntegrationSystem.initialize();
      }

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
      console.error('Retry failed:', error);
      
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
        description: 'The application failed to initialize properly. This might be due to data loading issues.'
      };
    }

    if (error?.message?.includes('spatial')) {
      return {
        icon: <Bug className="w-6 h-6" />,
        title: 'Spatial Data Error',
        description: 'An error occurred while processing spatial data. This might be due to invalid or missing data.'
      };
    }

    return {
      icon: <AlertTriangle className="w-6 h-6" />,
      title: 'Application Error',
      description: 'An unexpected error occurred in the application.'
    };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorTypeInfo = this.getErrorTypeInfo();

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
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
        </Alert>

        <Button
          onClick={this.toggleDetails}
          endIcon={this.state.showDetails ? <ChevronUp /> : <ChevronDown />}
          sx={{ mb: 2 }}
        >
          {this.state.showDetails ? 'Hide Details' : 'Show Details'}
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
              {JSON.stringify(this.state.systemStatus, null, 2)}
            </Box>
          </Box>

          {process.env.NODE_ENV !== 'production' && this.state.errorInfo && (
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
            {this.state.isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outlined"
            color="primary"
          >
            Reload Page
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