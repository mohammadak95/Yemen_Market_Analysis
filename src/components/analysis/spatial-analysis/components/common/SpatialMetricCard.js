// src/components/analysis/spatial-analysis/components/common/SpatialMetricCard.js

import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';

const SpatialMetricCard = ({
  title,
  value,
  format = 'number',
  description,
  trend,
  showTrend = false
}) => {
  const theme = useTheme();

  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';
    
    switch (format) {
      case 'percentage':
        return `${(val * 100).toFixed(1)}%`;
      case 'number':
        return val.toFixed(3);
      case 'integer':
        return Math.round(val).toString();
      default:
        return val.toString();
    }
  };

  return (
    <Paper 
      sx={{ 
        p: 2, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: theme.palette.background.paper
      }}
    >
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
        <Typography variant="h4" component="div">
          {formatValue(value)}
        </Typography>
        {showTrend && trend && (
          <Typography 
            variant="subtitle1" 
            component="span" 
            sx={{ 
              ml: 1,
              color: trend > 0 ? 'success.main' : 'error.main'
            }}
          >
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </Typography>
        )}
      </Box>

      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
    </Paper>
  );
};

SpatialMetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number,
  format: PropTypes.oneOf(['percentage', 'number', 'integer']),
  description: PropTypes.string,
  trend: PropTypes.number,
  showTrend: PropTypes.bool
};

export default SpatialMetricCard;