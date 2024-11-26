// src/components/analysis/spatial-analysis/components/shocks/ShockLegend.js

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';

const ShockLegend = ({ maxMagnitude, colorScale }) => {
  const steps = 5;
  const values = Array.from({ length: steps }, (_, i) => (maxMagnitude * i) / (steps - 1));

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Shock Magnitude
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {values.map((value, i) => (
          <Box key={i} sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                backgroundColor: colorScale(value),
                border: '1px solid rgba(0,0,0,0.1)',
              }}
            />
            <Typography variant="caption">{(value * 100).toFixed(0)}%</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

ShockLegend.propTypes = {
  maxMagnitude: PropTypes.number.isRequired,
  colorScale: PropTypes.func.isRequired,
};

export default ShockLegend;