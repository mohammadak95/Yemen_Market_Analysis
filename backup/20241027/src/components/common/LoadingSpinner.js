// sr./components/common/LoadingSpinner.js

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: 'background.default',
      p: 2,
    }}
  >
    <CircularProgress size={60} color="primary" />
    <Typography variant="h6" sx={{ mt: 2 }}>
      Loading, please wait...
    </Typography>
  </Box>
);

export default LoadingSpinner;