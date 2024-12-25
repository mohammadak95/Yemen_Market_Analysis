//src/components/common/AnalysisWrapper.js

import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import { Box, CircularProgress, useTheme } from '@mui/material';

// Enhanced loading fallback component with dark mode support
const LoadingFallback = () => {
  const theme = useTheme();
  
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="200px"
      sx={{
        backgroundColor: theme.palette.background.paper,
        borderRadius: 1,
        transition: theme.transitions.create(['background-color', 'box-shadow'], {
          duration: theme.transitions.duration.standard,
        }),
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 2px 4px rgba(0,0,0,0.4)' 
          : '0 1px 3px rgba(0,0,0,0.12)',
      }}
    >
      <CircularProgress 
        sx={{
          color: theme.palette.primary.main,
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          },
        }}
      />
    </Box>
  );
};

// Enhanced Analysis Wrapper component
const AnalysisWrapper = ({ children }) => (
  <div className="analysis-wrapper">
    {children || <div>Loading...</div>}
  </div>
);

AnalysisWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AnalysisWrapper;
