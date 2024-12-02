//src/components/common/ErrorBoundary.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);

    // Call error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <Box
          sx={{
            p: 3,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%'
            }}
          >
            <Alert
              severity="error"
              variant="filled"
              sx={{ mb: 3 }}
            >
              <AlertTitle>An Error Has Occurred</AlertTitle>
              {this.props.message || 'Something went wrong while rendering this component.'}
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Actions:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReset}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>
              </Box>
            </Box>

            {isDevelopment && this.state.error && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" color="error" gutterBottom>
                    <BugReportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Error Details:
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: 'grey.100',
                      maxHeight: 200,
                      overflow: 'auto'
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{ 
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {this.state.error.toString()}
                    </Typography>
                  </Paper>
                </Box>

                <Box>
                  <Typography variant="subtitle1" color="error" gutterBottom>
                    <BugReportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Stack Trace:
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: 'grey.100',
                      maxHeight: 300,
                      overflow: 'auto'
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{ 
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {this.state.errorInfo?.componentStack}
                    </Typography>
                  </Paper>
                </Box>
              </>
            )}

            {this.props.children && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Fallback UI:
                </Typography>
                {this.props.children}
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
  message: PropTypes.string,
  onError: PropTypes.func
};

export default ErrorBoundary;
