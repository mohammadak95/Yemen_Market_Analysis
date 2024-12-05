// src/components/analysis/spatial/components/Legend.js

import React from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  useTheme, 
  useMediaQuery,
  Paper,
  Tooltip
} from '@mui/material';
import { formatNumber } from '../utils/mapUtils';

const Legend = ({ min, max, colorScale, position = 'bottomright', title = 'Price Deviations' }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const getPositionStyle = () => {
    const base = isSmallScreen ? 12 : 20;
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

  const getLegendDescription = () => {
    switch (title.toLowerCase()) {
      case 'price deviations':
        return 'Shows how regional prices differ from model predictions. ' +
               'Positive values (red) indicate higher prices than expected, ' +
               'negative values (blue) indicate lower prices.';
      case 'market spillovers':
        return 'Indicates the strength of price transmission between markets. ' +
               'Higher values show stronger market integration, ' +
               'lower values suggest market fragmentation.';
      default:
        return 'Distribution of values across regions';
    }
  };

  if (!colorScale || min == null || max == null) return null;

  return (
    <Tooltip 
      title={getLegendDescription()}
      placement="left"
      arrow
    >
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          ...getPositionStyle(),
          p: isSmallScreen ? 1.5 : 2,
          borderRadius: 1,
          zIndex: 1000,
          minWidth: isSmallScreen ? 120 : 180,
          maxWidth: isSmallScreen ? 150 : 220,
          opacity: 0.95,
          transition: theme.transitions.create(['opacity', 'box-shadow']),
          '&:hover': {
            opacity: 1,
            boxShadow: theme.shadows[8]
          }
        }}
      >
        <Typography 
          variant="subtitle2"
          sx={{ 
            fontSize: isSmallScreen ? '0.75rem' : '0.875rem',
            fontWeight: 600,
            mb: 1,
            color: theme.palette.text.primary
          }}
        >
          {title}
        </Typography>

        {/* Gradient Bar */}
        <Box
          sx={{
            width: '100%',
            height: isSmallScreen ? 10 : 12,
            background: `linear-gradient(to right, 
              ${colorScale(min)}, 
              ${colorScale(min/2)},
              ${colorScale(0)},
              ${colorScale(max/2)},
              ${colorScale(max)}
            )`,
            borderRadius: 0.5,
            border: `1px solid ${theme.palette.divider}`
          }}
          role="img"
          aria-label={`Color scale from ${formatNumber(min)} to ${formatNumber(max)}`}
        />

        {/* Value Labels */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mt: 1,
          px: 0.5
        }}>
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: isSmallScreen ? '0.7rem' : '0.75rem',
              color: theme.palette.text.secondary,
              fontWeight: 500
            }}
          >
            {formatNumber(min)}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: isSmallScreen ? '0.7rem' : '0.75rem',
              color: theme.palette.text.secondary,
              fontWeight: 500
            }}
          >
            0
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: isSmallScreen ? '0.7rem' : '0.75rem',
              color: theme.palette.text.secondary,
              fontWeight: 500
            }}
          >
            {formatNumber(max)}
          </Typography>
        </Box>

        {/* Description (small screens only show on hover) */}
        <Typography
          variant="caption"
          sx={{
            display: isSmallScreen ? 'none' : 'block',
            mt: 1,
            color: theme.palette.text.secondary,
            fontSize: '0.7rem',
            opacity: 0.8,
            transition: 'opacity 0.2s',
            '.MuiPaper-root:hover &': {
              opacity: 1
            }
          }}
        >
          {getLegendDescription().split('.')[0] + '.'}
        </Typography>
      </Paper>
    </Tooltip>
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
