//src/components/analysis/spatial/components/StatCard.js

import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const StatCard = ({ title, value, subvalue, precision = 2, format = 'decimal' }) => {
  const theme = useTheme();

  const formatValue = (val) => {
    if (typeof val !== 'number') return val;
    
    switch (format) {
      case 'percentage':
        return `${(val * 100).toFixed(precision)}%`;
      case 'number':
        return val.toLocaleString();
      default:
        return val.toFixed(precision);
    }
  };

  return (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.paper,
        borderRadius: 2,
        boxShadow: theme.shadows[2]
      }}
    >
      <Typography variant="subtitle1" gutterBottom color="textSecondary">
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>
        {formatValue(value)}
      </Typography>
      {subvalue && (
        <Typography variant="body2" color="textSecondary">
          {subvalue}
        </Typography>
      )}
    </Paper>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  subvalue: PropTypes.string,
  precision: PropTypes.number,
  format: PropTypes.oneOf(['decimal', 'percentage', 'number'])
};

export default StatCard;