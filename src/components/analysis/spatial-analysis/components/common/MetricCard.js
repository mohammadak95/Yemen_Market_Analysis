// src/components/analysis/spatial-analysis/components/common/MetricCard.js

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import PropTypes from 'prop-types';

const MetricCard = ({ title, value, format, description, sx = {} }) => {
  const formatValue = (val) => {
    if (typeof val !== 'number') return 'N/A';
    
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'integer':
        return Math.round(val).toString();
      case 'number':
        return val.toFixed(3);
      default:
        return val.toString();
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        ...sx
      }}
    >
      <Box sx={{ mb: 1 }}>
        <Typography 
          variant="subtitle2" 
          color="text.secondary"
          sx={{ 
            fontSize: '0.875rem',
            fontWeight: 500,
            lineHeight: 1.2
          }}
        >
          {title}
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 0.5 }}>
        <Typography 
          variant="h6"
          sx={{ 
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'primary.main',
            lineHeight: 1.2
          }}
        >
          {formatValue(value)}
        </Typography>
      </Box>

      {description && (
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ 
            display: 'block',
            fontSize: '0.75rem',
            lineHeight: 1.2
          }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number,
  format: PropTypes.oneOf(['percentage', 'integer', 'number']),
  description: PropTypes.string,
  sx: PropTypes.object
};

MetricCard.defaultProps = {
  format: 'number',
  sx: {}
};

export default MetricCard;
