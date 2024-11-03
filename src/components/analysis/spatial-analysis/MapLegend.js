// src/components/analysis/spatial-analysis/MapLegend.js

import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Box, Typography } from '@mui/material';

const MapLegend = ({ colorScale, variable, position = 'bottomright' }) => {
  if (!colorScale) return null;

  // Generate legend steps
  const domain = colorScale.domain();
  const steps = 5; // Number of color boxes in the legend
  const values = Array.from({ length: steps }, (_, i) =>
    domain[0] + ((domain[1] - domain[0]) * i) / (steps - 1)
  );

  // Positioning styles based on the 'position' prop
  const getPositionStyle = () => {
    const styles = {
      position: 'absolute',
      zIndex: 1000,
    };

    switch (position) {
      case 'topleft':
        styles.top = 10;
        styles.left = 10;
        break;
      case 'topright':
        styles.top = 10;
        styles.right = 10;
        break;
      case 'bottomleft':
        styles.bottom = 10;
        styles.left = 10;
        break;
      case 'bottomright':
        styles.bottom = 10;
        styles.right = 10;
        break;
      default:
        styles.bottom = 10;
        styles.right = 10;
    }

    return styles;
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 1,
        minWidth: 150,
        bgcolor: 'background.paper',
        ...getPositionStyle(),
      }}
    >
      <Typography variant="caption" gutterBottom>
        {variable}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
        {values.map((value, i) => (
          <Box
            key={i}
            sx={{
              width: 20,
              height: 20,
              bgcolor: colorScale(value),
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption">{domain[0].toFixed(1)}</Typography>
        <Typography variant="caption">{domain[1].toFixed(1)}</Typography>
      </Box>
    </Paper>
  );
};

MapLegend.propTypes = {
  colorScale: PropTypes.func.isRequired,
  variable: PropTypes.string.isRequired,
  position: PropTypes.oneOf(['topleft', 'topright', 'bottomleft', 'bottomright']),
};

export default MapLegend;
