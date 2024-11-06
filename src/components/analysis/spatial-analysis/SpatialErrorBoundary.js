// src/components/analysis/spatial-analysis/SpatialErrorBoundary.js

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import ErrorDisplay from '../../common/ErrorDisplay';

class SpatialErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    try {
      await this.props.onRetry?.();
      this.setState({ hasError: false, error: null, isRetrying: false });
    } catch (error) {
      this.setState({ hasError: true, error, isRetrying: false });
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Box sx={{ p: 2 }}>
        <ErrorDisplay
          error={{
            message:
              this.state.error?.message ||
              'An error occurred in the spatial analysis component.',
          }}
          title="Spatial Analysis Error"
          action={
            <Button
              onClick={this.handleRetry}
              disabled={this.state.isRetrying}
              startIcon={<Refresh />}
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