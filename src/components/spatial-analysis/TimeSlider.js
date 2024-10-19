// src/components/spatial-analysis/TimeSlider.js

import React from 'react';
import PropTypes from 'prop-types';
import { Slider, Typography, Box } from '@mui/material';
import { format } from 'date-fns'; // Ensure date-fns is installed: npm install date-fns

const TimeSlider = ({ months, selectedDate, onChange }) => {
  // Find the index of the selected date
  const selectedIndex = React.useMemo(() => {
    return months.findIndex(month => month.getTime() === selectedDate.getTime());
  }, [months, selectedDate]);

  const handleSliderChange = (event, newValue) => {
    const newDate = months[newValue];
    onChange(newDate);
  };

  const formatLabel = (index) => {
    const date = months[index];
    return format(date, 'MMM yyyy'); // e.g., Jan 2020
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography gutterBottom>Select Month</Typography>
      <Slider
        value={selectedIndex}
        min={0}
        max={months.length - 1}
        onChange={handleSliderChange}
        valueLabelDisplay="on"
        valueLabelFormat={formatLabel}
        step={1}
        marks={months.map((month, index) => ({
          value: index,
          label: format(month, 'MMM yyyy'),
        }))}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption">{format(months[0], 'MMM yyyy')}</Typography>
        <Typography variant="caption">{format(months[months.length - 1], 'MMM yyyy')}</Typography>
      </Box>
    </Box>
  );
};

TimeSlider.propTypes = {
  months: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired, // Changed from uniqueMonths to months
  selectedDate: PropTypes.instanceOf(Date).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default TimeSlider;