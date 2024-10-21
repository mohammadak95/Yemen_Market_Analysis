// src/components/spatial-analysis/TimeSlider.js

import React from 'react';
import PropTypes from 'prop-types';
import { Slider, Typography, Box } from '@mui/material';
import { format } from 'date-fns';

const TimeSlider = ({ months, selectedDate, onChange }) => {
  const selectedIndex = React.useMemo(() => {
    return months.findIndex(month => month.getTime() === selectedDate.getTime());
  }, [months, selectedDate]);

  const handleSliderChange = (event, newValue) => {
    const newDate = months[newValue];
    onChange(newDate);
  };

  const formatLabel = (index) => {
    const date = months[index];
    return format(date, 'MMM yyyy');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Slider
        value={selectedIndex}
        min={0}
        max={months.length - 1}
        onChange={handleSliderChange}
        valueLabelDisplay="auto"
        valueLabelFormat={formatLabel}
        step={1}
        marks={months.map((month, index) => ({
          value: index,
          label: index % 12 === 0 ? format(month, 'yyyy') : '',
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
  months: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired,
  selectedDate: PropTypes.instanceOf(Date).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default TimeSlider;