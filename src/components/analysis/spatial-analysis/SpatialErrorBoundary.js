// src/components/analysis/spatial-analysis/SpatialErrorBoundary.js

import React from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Button 
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { validateGeoJSON } from '../../../utils/geoJSONProcessor';

class SpatialErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      errorInfo: null,
      errorType: null
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      errorType: error.message?.includes('GeoJSON') ? 'SPATIAL_DATA' : 'RENDERING'
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Spatial Visualization Error:', error, errorInfo);
    
    // Optional: Log to error tracking service
    if (window.errorTracker) {
      window.errorTracker.logError({
        type: 'SpatialVisualizationError',
        context: {
          errorType: this.state.errorType,
          message: error.message
        }
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorInfo: null, errorType: null });
  }

  renderErrorMessage() {
    const { errorType } = this.state;

    const errorMessages = {
      'SPATIAL_DATA': {
        title: 'Geographic Data Visualization Error',
        description: 'There was an issue processing the geographic data. This could be due to invalid or incomplete map data.',
        suggestions: [
          'Verify the integrity of your GeoJSON files',
          'Check that all required properties are present',
          'Ensure consistent region identifiers'
        ]
      },
      'RENDERING': {
        title: 'Map Rendering Error',
        description: 'An unexpected error occurred while rendering the map.',
        suggestions: [
          'Refresh the page',
          'Check your internet connection',
          'Verify data sources'
        ]
      }
    };

    const currentError = errorMessages[errorType] || errorMessages['RENDERING'];

    return (
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          m: 2, 
          textAlign: 'center', 
          backgroundColor: 'error.light',
          color: 'error.contrastText'
        }}
      >
        <ErrorOutlineIcon 
          sx={{ 
            fontSize: 60, 
            color: 'error.contrastText',
            mb: 2 
          }} 
        />
        <Typography variant="h5" gutterBottom>
          {currentError.title}
        </Typography>
        <Typography variant="body1" paragraph>
          {currentError.description}
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Suggested Actions:</Typography>
          <ul style={{ 
            textAlign: 'left', 
            paddingLeft: '20px',
            color: 'error.contrastText' 
          }}>
            {currentError.suggestions.map((suggestion, index) => (
              <li key={index}>
                <Typography variant="body2">{suggestion}</Typography>
              </li>
            ))}
          </ul>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={this.handleRetry}
          >
            Retry Visualization
          </Button>
        </Box>
      </Paper>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorMessage();
    }

    return this.props.children;
  }
}

export default SpatialErrorBoundary;