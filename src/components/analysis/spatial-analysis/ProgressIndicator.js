import React from 'react';
import { Box, Typography, CircularProgress, LinearProgress } from '@mui/material';

export const ProgressIndicator = ({ value, label, variant = 'circular', size = 24 }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1,
      minWidth: variant === 'linear' ? 200 : 'auto'
    }}>
      {variant === 'circular' ? (
        <CircularProgress 
          size={size} 
          variant="determinate" 
          value={value} 
          sx={{ 
            color: theme => value === 100 ? theme.palette.success.main : theme.palette.primary.main 
          }}
        />
      ) : (
        <Box sx={{ width: '100%' }}>
          <LinearProgress 
            variant="determinate" 
            value={value} 
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: theme => theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                bgcolor: theme => value === 100 ? theme.palette.success.main : theme.palette.primary.main,
              }
            }}
          />
        </Box>
      )}
      <Typography variant="body2" color="textSecondary">
        {label ? `${label}: ${Math.round(value)}%` : `${Math.round(value)}%`}
      </Typography>
    </Box>
  );
};