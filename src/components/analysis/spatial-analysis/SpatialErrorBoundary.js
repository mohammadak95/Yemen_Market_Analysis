// src/components/analysis/spatial-analysis/SpatialErrorBoundary.js
import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Alert, AlertTitle, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';

class SpatialErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Spatial analysis error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error">
          <AlertTitle>Error in Spatial Analysis</AlertTitle>
          <Typography variant="body2">
            {this.state.error?.message || 'An error occurred while processing spatial data.'}
          </Typography>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onRetry) {
                this.props.onRetry();
              }
            }}
            variant="outlined"
            size="small"
            sx={{ mt: 1 }}
            startIcon={<Refresh />}
          >
            Try Again
          </Button>
        </Alert>
      );
    }

    return this.props.children;
  }
}

SpatialErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onRetry: PropTypes.func,
};

export default SpatialErrorBoundary;