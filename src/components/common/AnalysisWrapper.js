import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import { Box, CircularProgress } from '@mui/material';

// Simple loading fallback component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
    <CircularProgress />
  </Box>
);

// Enhanced Analysis Wrapper component
const AnalysisWrapper = ({ children }) => {
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </Box>
  );
};

AnalysisWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AnalysisWrapper;