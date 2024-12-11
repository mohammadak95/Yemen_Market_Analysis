// src/components/common/LoadingSpinner.js

import React from 'react';
import { Box, CircularProgress, Typography, useTheme, keyframes } from '@mui/material';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const pulse = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
`;

const LoadingSpinner = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: theme.palette.background.default,
        p: 2,
        animation: `${fadeIn} 0.3s ease-in`,
        transition: theme.transitions.create(['background-color'], {
          duration: theme.transitions.duration.standard,
        }),
      }}
    >
      <CircularProgress 
        size={60} 
        thickness={4}
        sx={{
          color: theme.palette.primary.main,
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
            transition: theme.transitions.create(['color'], {
              duration: theme.transitions.duration.standard,
            }),
          },
        }} 
      />
      <Typography 
        variant="h6" 
        sx={{ 
          mt: 2,
          color: theme.palette.text.primary,
          fontWeight: 500,
          animation: `${pulse} 2s ease-in-out infinite`,
          transition: theme.transitions.create(['color'], {
            duration: theme.transitions.duration.standard,
          }),
          textAlign: 'center',
          [theme.breakpoints.down('sm')]: {
            fontSize: '1rem',
          },
        }}
      >
        Loading, please wait...
      </Typography>
      <Typography 
        variant="body2" 
        sx={{ 
          mt: 1,
          color: theme.palette.text.secondary,
          opacity: 0.8,
          transition: theme.transitions.create(['color'], {
            duration: theme.transitions.duration.standard,
          }),
          textAlign: 'center',
        }}
      >
        Preparing your analysis dashboard
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;
