// src/components/analysis/spatial-analysis/components/shocks/ShockLegend.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, useTheme } from '@mui/material';

const ShockLegend = ({ maxMagnitude, colorScale, threshold }) => {
  const theme = useTheme();

  const legendSteps = useMemo(() => {
    const steps = 5;
    const values = Array.from({ length: steps }, (_, i) => (maxMagnitude * i) / (steps - 1));
    
    return values.map(value => ({
      value,
      color: colorScale(value),
      percentage: (value * 100).toFixed(0),
      isSignificant: value >= threshold
    }));
  }, [maxMagnitude, colorScale, threshold]);

  return (
    <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        Shock Magnitude
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {legendSteps.map((step, i) => (
          <Box 
            key={i} 
            sx={{ 
              textAlign: 'center',
              position: 'relative'
            }}
          >
            <Box
              sx={{
                width: 24,
                height: 24,
                backgroundColor: step.color,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 0.5,
                position: 'relative',
                '&::after': step.isSignificant ? {
                  content: '""',
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 6,
                  height: 6,
                  bgcolor: theme.palette.warning.main,
                  borderRadius: '50%'
                } : {}
              }}
              role="presentation"
              aria-label={`${step.percentage}% magnitude`}
            />
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block',
                mt: 0.5,
                color: theme.palette.text.secondary,
                fontSize: '0.675rem'
              }}
            >
              {step.percentage}%
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            bgcolor: theme.palette.warning.main,
            borderRadius: '50%'
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Above threshold ({(threshold * 100).toFixed(0)}%)
        </Typography>
      </Box>
    </Box>
  );
};

ShockLegend.propTypes = {
  maxMagnitude: PropTypes.number.isRequired,
  colorScale: PropTypes.func.isRequired,
  threshold: PropTypes.number.isRequired
};

export default React.memo(ShockLegend);