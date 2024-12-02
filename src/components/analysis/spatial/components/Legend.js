// src/components/analysis/spatial/components/Legend.js

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { formatNumber } from '../utils/mapUtils';

const Legend = ({ min, max, colorScale, position = 'bottomright', title = 'Residuals' }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const getPositionStyle = () => {
    const base = isSmallScreen ? 8 : 16;
    switch (position) {
      case 'bottomright':
        return { bottom: base, right: base };
      case 'bottomleft':
        return { bottom: base, left: base };
      case 'topright':
        return { top: base, right: base };
      case 'topleft':
        return { top: base, left: base };
      default:
        return { bottom: base, right: base };
    }
  };

  if (!colorScale || min == null || max == null) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        ...getPositionStyle(),
        bgcolor: 'background.paper',
        p: isSmallScreen ? 1 : 1.5,
        borderRadius: 1,
        boxShadow: theme.shadows[2],
        zIndex: 1000,
        minWidth: isSmallScreen ? 100 : 150,
        maxWidth: isSmallScreen ? 120 : 180,
        opacity: 0.9,
        '&:hover': {
          opacity: 1,
          boxShadow: theme.shadows[4]
        }
      }}
    >
      <Typography 
        variant="caption" 
        gutterBottom 
        sx={{ 
          display: 'block',
          fontSize: isSmallScreen ? '0.7rem' : '0.75rem',
          fontWeight: 500,
          mb: 0.5
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          width: '100%',
          height: isSmallScreen ? 8 : 10,
          mt: 1,
          background: `linear-gradient(to right, ${colorScale(min)}, ${colorScale(0)}, ${colorScale(max)})`,
          borderRadius: 0.5
        }}
      />
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        mt: 0.5,
        color: theme.palette.text.secondary
      }}>
        <Typography variant="caption" sx={{ fontSize: isSmallScreen ? '0.65rem' : '0.75rem' }}>
          {formatNumber(min)}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: isSmallScreen ? '0.65rem' : '0.75rem' }}>
          0
        </Typography>
        <Typography variant="caption" sx={{ fontSize: isSmallScreen ? '0.65rem' : '0.75rem' }}>
          {formatNumber(max)}
        </Typography>
      </Box>
    </Box>
  );
};

Legend.propTypes = {
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  colorScale: PropTypes.func.isRequired,
  position: PropTypes.oneOf(['bottomright', 'bottomleft', 'topright', 'topleft']),
  title: PropTypes.string
};

export default Legend;