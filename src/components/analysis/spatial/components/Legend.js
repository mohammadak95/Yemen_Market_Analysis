//src/components/analysis/spatial/components/Legend.js

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const Legend = ({ min, max, colorScale, position = 'bottomright' }) => {
  const theme = useTheme();

  const getPositionStyle = () => {
    switch (position) {
      case 'bottomright':
        return { bottom: 16, right: 16 };
      case 'bottomleft':
        return { bottom: 16, left: 16 };
      case 'topright':
        return { top: 16, right: 16 };
      case 'topleft':
        return { top: 16, left: 16 };
      default:
        return { bottom: 16, right: 16 };
    }
  };

  if (!colorScale || min == null || max == null) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        ...getPositionStyle(),
        bgcolor: 'background.paper',
        p: 1,
        borderRadius: 1,
        boxShadow: 1,
        zIndex: 1000
      }}
    >
      <Typography variant="caption" gutterBottom>
        Residuals
      </Typography>
      <Box
        sx={{
          width: 150,
          height: 10,
          mt: 1,
          background: `linear-gradient(to right, ${colorScale(min)}, ${colorScale(0)}, ${colorScale(max)})`
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption">
          {min.toFixed(2)}
        </Typography>
        <Typography variant="caption">
          0
        </Typography>
        <Typography variant="caption">
          {max.toFixed(2)}
        </Typography>
      </Box>
    </Box>
  );
};

Legend.propTypes = {
  min: PropTypes.number,
  max: PropTypes.number,
  colorScale: PropTypes.func,
  position: PropTypes.oneOf(['bottomright', 'bottomleft', 'topright', 'topleft'])
};

export default Legend;