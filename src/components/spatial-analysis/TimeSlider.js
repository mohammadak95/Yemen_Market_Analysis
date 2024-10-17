// src/components/TimeSlider.js

import React from 'react';
import PropTypes from 'prop-types';
import { Slider, Typography, Box } from '@mui/material';

const TimeSlider = ({ minDate, maxDate, value, onChange }) => {
  const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date)) {
      console.warn('Invalid date:', date);
      return 'Invalid Date';
    }
    return date.toLocaleDateString();
  };

  const safeMinDate = minDate instanceof Date && !isNaN(minDate) ? minDate : new Date(0);
  const safeMaxDate = maxDate instanceof Date && !isNaN(maxDate) ? maxDate : new Date();
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : safeMinDate.getTime();

  return (
    <Box sx={{ width: '100%', mt: 2, px: 2 }}>
      <Typography gutterBottom>Select Date</Typography>
      <Slider
        value={safeValue}
        min={safeMinDate.getTime()}
        max={safeMaxDate.getTime()}
        onChange={onChange}
        valueLabelDisplay="auto"
        valueLabelFormat={formatDate}
        step={86400000} // One day in milliseconds
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption">{formatDate(safeMinDate)}</Typography>
        <Typography variant="caption">{formatDate(safeMaxDate)}</Typography>
      </Box>
    </Box>
  );
};

TimeSlider.propTypes = {
  minDate: PropTypes.instanceOf(Date).isRequired,
  maxDate: PropTypes.instanceOf(Date).isRequired,
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default TimeSlider;