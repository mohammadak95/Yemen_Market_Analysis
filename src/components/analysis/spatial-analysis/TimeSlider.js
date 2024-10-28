import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Slider, Typography } from '@mui/material';
import { format } from 'date-fns';

const TimeSlider = ({ 
  months = [], 
  selectedDate = null,
  onChange
}) => {
  // Ensure we have a valid selected date
  const safeSelectedDate = selectedDate || (months.length > 0 ? months[0] : new Date());

  // Convert dates to indices for the slider
  const monthIndices = useMemo(() => 
    Array.from({ length: months.length }, (_, i) => i),
    [months]
  );

  // Find current index
  const currentIndex = useMemo(() => {
    const index = months.findIndex(month => 
      month.getTime() === safeSelectedDate.getTime()
    );
    return index >= 0 ? index : 0;
  }, [months, safeSelectedDate]);

  // Create marks for the slider
  const marks = useMemo(() => {
    return monthIndices.map(index => ({
      value: index,
      label: index % 3 === 0 ? format(months[index], 'MMM yyyy') : ''
    }));
  }, [months, monthIndices]);

  // Handle slider change
  const handleChange = useCallback((_, newValue) => {
    if (typeof newValue === 'number' && 
        newValue >= 0 && 
        newValue < months.length) {
      onChange(months[newValue]);
    }
  }, [months, onChange]);

  // Value label formatter
  const valueLabelFormat = useCallback((value) => {
    if (typeof value === 'number' && 
        value >= 0 && 
        value < months.length) {
      return format(months[value], 'MMM yyyy');
    }
    return '';
  }, [months]);

  // Don't render if no months
  if (!months.length) {
    return null;
  }

  return (
    <Box sx={{ width: '100%', px: 2, py: 1 }}>
      <Slider
        value={currentIndex}
        onChange={handleChange}
        valueLabelFormat={valueLabelFormat}
        getAriaValueText={valueLabelFormat}
        step={1}
        marks={marks}
        min={0}
        max={Math.max(0, monthIndices.length - 1)}
        valueLabelDisplay="auto"
        aria-label="Time range"
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption">
          {format(months[0], 'MMM yyyy')}
        </Typography>
        <Typography variant="caption">
          {format(months[months.length - 1], 'MMM yyyy')}
        </Typography>
      </Box>
    </Box>
  );
};

TimeSlider.propTypes = {
  months: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired,
  selectedDate: PropTypes.instanceOf(Date),
  onChange: PropTypes.func.isRequired,
};

export default TimeSlider;