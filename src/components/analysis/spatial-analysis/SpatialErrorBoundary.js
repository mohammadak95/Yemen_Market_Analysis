// src/components/analysis/spatial-analysis/SpatialErrorBoundary.js

import React from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Button, 
  Alert, 
  AlertTitle, 
  Typography,
  Collapse,
  IconButton,
  Paper
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  Close as CloseIcon 
} from '@mui/icons-material';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';

class SpatialErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorType: null
    };
  }

  static getDerivedStateFromError(error) {
    // Categorize the error
    let errorType = 'UNKNOWN';
    
    if (error.message?.includes('WebGL') || error.message?.includes('canvas')) {
      errorType = 'RENDERING';
    } else if (error.message?.includes('GeoJSON') || error.message?.includes('topology')) {
      errorType = 'SPATIAL_DATA';
    } else if (error.message?.includes('projection') || error.message?.includes('coordinate')) {
      errorType = 'PROJECTION';
    }

    return { 
      hasError: true, 
      error,
      errorType
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log to background monitor
    backgroundMonitor.logError('spatial-analysis', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType: this.state.errorType,
      timestamp: new Date().toISOString(),
      metadata: {
        visualizationMode: this.props.visualizationMode,
        dataTimestamp: this.props.dataTimestamp
      }
    });

    this.setState({
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorType: null 
    });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReportError = () => {
    const errorReport = {
      error: this.state.error?.message,
      errorType: this.state.errorType,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      visualizationMode: this.props.visualizationMode
    };

    // Log detailed error report
    backgroundMonitor.logMetric('error-report', errorReport);

    // Notify user
    this.props.onErrorReport?.(errorReport);
  };

  renderErrorMessage() {
    const { errorType, error } = this.state;

    switch (errorType) {
      case 'RENDERING':
        return {
          title: 'Visualization Error',
          message: 'There was a problem rendering the spatial visualization. This might be due to WebGL or browser compatibility issues.',
          suggestion: 'Try using a different browser or updating your current one.'
        };
      case 'SPATIAL_DATA':
        return {
          title: 'Data Processing Error',
          message: 'There was an error processing the spatial data.',
          suggestion: 'The data might be corrupted or in an unexpected format. Try refreshing or selecting different data.'
        };
      case 'PROJECTION':
        return {
          title: 'Map Projection Error',
          message: 'There was an error with the map projection or coordinates.',
          suggestion: 'This might be due to invalid coordinates or projection settings.'
        };
      default:
        return {
          title: 'Analysis Error',
          message: error?.message || 'An unexpected error occurred in the spatial analysis.',
          suggestion: 'Try refreshing the page or selecting different parameters.'
        };
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorDetails = this.renderErrorMessage();

    return (
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          m: 2, 
          backgroundColor: 'background.default' 
        }}
      >
        <Alert 
          severity="error"
          action={
            <IconButton
              aria-label="close"
              size="small"
              onClick={this.handleRetry}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          <AlertTitle>{errorDetails.title}</AlertTitle>
          
          <Typography variant="body2" gutterBottom>
            {errorDetails.message}
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mt: 1 }}
          >
            {errorDetails.suggestion}
          </Typography>

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={this.handleRetry}
              variant="outlined"
            >
              Try Again
            </Button>

            <Button
              size="small"
              startIcon={<BugReportIcon />}
              onClick={this.handleReportError}
              color="secondary"
              variant="outlined"
            >
              Report Issue
            </Button>
          </Box>

          {process.env.NODE_ENV === 'development' && (
            <Collapse in={this.state.showDetails}>
              <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {this.state.error?.stack}
                </Typography>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            </Collapse>
          )}
        </Alert>
      </Paper>
    );
  }
}

SpatialErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onRetry: PropTypes.func,
  onErrorReport: PropTypes.func,
  visualizationMode: PropTypes.string,
  dataTimestamp: PropTypes.string,
  showDetailedErrors: PropTypes.bool
};

SpatialErrorBoundary.defaultProps = {
  showDetailedErrors: process.env.NODE_ENV === 'development'
};

export default SpatialErrorBoundary;