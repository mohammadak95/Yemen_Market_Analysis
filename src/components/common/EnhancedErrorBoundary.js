// src/components/common/EnhancedErrorBoundary.js
import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Button } from '@mui/material';
import { CircularProgress } from '@mui/material';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error);
    this.setState({ errorInfo });

    if (process.env.NODE_ENV === 'production' && window?.Sentry) {
      window.Sentry.captureException(error, { extra: errorInfo });
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
        isRetrying: false 
      });
    } catch (error) {
      this.setState({ 
        hasError: true, 
        error, 
        isRetrying: false 
      });
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

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
          <AlertTriangle size={24} color="error" />
          <Typography variant="h6" color="error">
            Application Error
          </Typography>
        </Box>

        <Typography variant="body1" gutterBottom color="text.primary">
          {this.state.error?.message || 'An unexpected error occurred'}
        </Typography>

        {process.env.NODE_ENV !== 'production' && this.state.errorInfo && (
          <Box 
            component="pre"
            sx={{ 
              mt: 2,
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