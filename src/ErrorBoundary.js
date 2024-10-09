// src/components/ErrorBoundary.js

import React from 'react';
import { Typography, Box } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, bgcolor: 'error.main', color: 'error.contrastText' }}>
          <Typography variant="h6">Something went wrong.</Typography>
          <Typography variant="body1">{this.state.error.toString()}</Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;