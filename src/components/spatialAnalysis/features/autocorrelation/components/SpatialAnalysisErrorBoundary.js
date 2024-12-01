import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Collapse,
  Alert,
  AlertTitle,
  IconButton,
  useTheme
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * Error boundary for spatial analysis components
 * Handles errors gracefully and provides debugging information
 */
class SpatialAnalysisErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      expanded: false,
      errorType: null
    };
  }

  static getDerivedStateFromError(error) {
    // Categorize the error
    let errorType = 'unknown';
    if (error.message?.includes('geometry')) {
      errorType = 'geometry';
    } else if (error.message?.includes('features')) {
      errorType = 'features';
    } else if (error.message?.includes('map')) {
      errorType = 'mapping';
    }

    return { 
      hasError: true, 
      error,
      errorType 
    };
  }

  componentDidCatch(error, errorInfo) {
    // Enhanced error logging
    console.error('Spatial Analysis Error:', {
      error,
      errorInfo,
      errorType: this.state.errorType,
      timestamp: new Date().toISOString()
    });

    this.setState({
      error,
      errorInfo
    });
  }

  handleRefresh = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null
    });
    window.location.reload();
  };

  handleExpand = () => {
    this.setState(prevState => ({
      expanded: !prevState.expanded
    }));
  };

  getErrorMessage = () => {
    const { errorType, error } = this.state;

    switch (errorType) {
      case 'geometry':
        return 'Invalid or missing geometry data. Please ensure the geometry data is properly formatted and available.';
      case 'features':
        return 'Error processing map features. The geometry features may be malformed or missing required properties.';
      case 'mapping':
        return 'Error rendering the map. This might be due to invalid coordinates or feature properties.';
      default:
        return error?.message || 'An unexpected error occurred in the spatial analysis.';
    }
  };

  getErrorSeverity = () => {
    const { errorType } = this.state;
    switch (errorType) {
      case 'geometry':
      case 'features':
        return 'error';
      case 'mapping':
        return 'warning';
      default:
        return 'error';
    }
  };

  render() {
    const { hasError, error, errorInfo, expanded, errorType } = this.state;
    const { fallback } = this.props;

    if (!hasError) {
      return this.props.children;
    }

    // Use fallback if provided
    if (fallback) {
      return fallback;
    }

    // Default error UI
    return (
      <Paper 
        elevation={3}
        sx={{
          p: 3,
          m: 2,
          maxWidth: '100%',
          overflow: 'hidden'
        }}
      >
        <Box display="flex" alignItems="center" mb={2}>
          <ErrorOutlineIcon color="error" sx={{ mr: 2 }} />
          <Typography variant="h6" color="error">
            Spatial Analysis Error
          </Typography>
        </Box>

        <Alert severity={this.getErrorSeverity()} sx={{ mb: 2 }}>
          <AlertTitle>{errorType ? `${errorType.charAt(0).toUpperCase()}${errorType.slice(1)} Error` : 'Error'}</AlertTitle>
          {this.getErrorMessage()}
        </Alert>

        <Box display="flex" gap={2} mb={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={this.handleRefresh}
          >
            Retry Analysis
          </Button>
          <Button
            variant="outlined"
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={this.handleExpand}
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </Button>
        </Box>

        <Collapse in={expanded}>
          {/* Technical Details */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              Technical Details
            </Typography>
            <Typography variant="body2" component="pre" sx={{ 
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
              fontSize: '0.8rem'
            }}>
              Error Type: {errorType}
              {'\n\n'}
              {errorInfo?.componentStack || error?.stack || 'No stack trace available'}
            </Typography>
          </Paper>

          {/* Troubleshooting Tips */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <AlertTitle>Troubleshooting Tips</AlertTitle>
            {errorType === 'geometry' && (
              <Typography variant="body2">
                • Verify that the geometry data is properly loaded{'\n'}
                • Check if the geometry features contain valid coordinates{'\n'}
                • Ensure the geometry follows the GeoJSON specification
              </Typography>
            )}
            {errorType === 'features' && (
              <Typography variant="body2">
                • Check if all features have required properties{'\n'}
                • Verify the feature array is properly structured{'\n'}
                • Ensure feature IDs or names are correctly set
              </Typography>
            )}
            {errorType === 'mapping' && (
              <Typography variant="body2">
                • Verify coordinate values are within valid ranges{'\n'}
                • Check if all required map properties are present{'\n'}
                • Ensure the map container has proper dimensions
              </Typography>
            )}
          </Alert>

          {/* Development Information */}
          {process.env.NODE_ENV === 'development' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>Development Information</AlertTitle>
              <Typography variant="body2">
                This error occurred in development mode. Check the console for more details.
              </Typography>
            </Alert>
          )}
        </Collapse>
      </Paper>
    );
  }
}

export default SpatialAnalysisErrorBoundary;
