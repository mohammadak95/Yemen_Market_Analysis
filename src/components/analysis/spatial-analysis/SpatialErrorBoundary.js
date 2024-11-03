// src/components/analysis/spatial-analysis/SpatialErrorBoundary.js

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import ErrorDisplay from '../../common/ErrorDisplay'; // Adjust the import path as needed

class SpatialErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service here
    console.error('Spatial analysis error:', error);
    this.setState({ errorInfo });

    // Example: Sending error details to Sentry
    if (process.env.NODE_ENV === 'production' && window?.Sentry) {
      window.Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack,
          analysisType: 'spatial',
        },
      });
    }
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    try {
      await this.props.onRetry?.();
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null, 
        isRetrying: false,
      });
    } catch (error) {
      this.setState({ 
        hasError: true, 
        error, 
        isRetrying: false,
      });
    }
  };

  render() {
    if (!this.state.hasError) {
      // If no error, render children components
      return this.props.children;
    }

    // Fallback UI when an error is caught
    return (
      <Box sx={{ p: 2 }}>
        <ErrorDisplay
          error={{
            message: this.state.error?.message || 'An error occurred in the spatial analysis component.',
            details: process.env.NODE_ENV !== 'production' ? this.state.errorInfo?.componentStack : undefined,
          }}
          title="Spatial Analysis Error"
          showDetails={true}
          action={
            <Button
              onClick={this.handleRetry}
              disabled={this.state.isRetrying}
              startIcon={<RefreshCw />}
              variant="contained"
              size="small"
            >
              {this.state.isRetrying ? 'Retrying...' : 'Retry Analysis'}
            </Button>
          }
        />
      </Box>
    );
  }
}

SpatialErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onRetry: PropTypes.func,
};

export default SpatialErrorBoundary;
