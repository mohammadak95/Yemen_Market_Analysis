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
  Paper,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  Close as CloseIcon,
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
      errorType: null,
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
      errorType,
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
        dataTimestamp: this.props.dataTimestamp,
      },
    });

    this.setState({
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null,
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
      visualizationMode: this.props.visualizationMode,
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
          message: 'An error occurred while rendering the map. Please try refreshing the page.',
        };
      case 'SPATIAL_DATA':
        return {
          title: 'Data Error',
          message:
            'There was an issue processing the spatial data. Please check your data sources.',
        };
      case 'PROJECTION':
        return {
          title: 'Projection Error',
          message: 'A coordinate projection error occurred. Please contact support.',
        };
      default:
        return {
          title: 'Unknown Error',
          message: error?.message || 'An unexpected error occurred.',
        };
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { title, message } = this.renderErrorMessage();
    const { showDetails } = this.state;

    return (
      <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
        <Alert severity="error" action={
          <IconButton size="small" onClick={() => this.setState({ hasError: false })}>
            <CloseIcon fontSize="inherit" />
          </IconButton>
        }>
          <AlertTitle>{title}</AlertTitle>
          {message}
        </Alert>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={this.handleRetry}
            sx={{ mr: 2 }}
          >
            Retry
          </Button>
          <Button
            variant="outlined"
            startIcon={<BugReportIcon />}
            onClick={this.handleReportError}
          >
            Report Error
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            endIcon={<ExpandMoreIcon />}
            onClick={() => this.setState({ showDetails: !showDetails })}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
          <Collapse in={showDetails}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
              {this.state.errorInfo?.componentStack}
            </Typography>
          </Collapse>
        </Box>
      </Paper>
    );
  }
}

SpatialErrorBoundary.propTypes = {
  children: PropTypes.node,
  onRetry: PropTypes.func,
  onErrorReport: PropTypes.func,
  visualizationMode: PropTypes.string,
  dataTimestamp: PropTypes.string,
};

export default SpatialErrorBoundary;