import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Slider, Typography } from '@mui/material';
import { format } from 'date-fns';

const TimeSlider = ({ months, selectedDate, onChange }) => {
  // Convert dates to numbers for the slider
  const monthIndices = useMemo(() => {
    return months.map((_, index) => index);
  }, [months]);

  // Find current index
  const currentIndex = useMemo(() => {
    return months.findIndex(
      (month) => month.getTime() === selectedDate.getTime()
    );
  }, [months, selectedDate]);

  // Convert slider index back to date
  const handleChange = useCallback(
    (_, newValue) => {
      if (typeof newValue === 'number' && months[newValue]) {
        onChange(months[newValue]);
      }
    },
    [months, onChange]
  );

  // Create marks for the slider
  const marks = useMemo(() => {
    return monthIndices.map(index => ({
      value: index,
      label: index % 3 === 0 ? format(months[index], 'MMM yyyy') : ''
    }));
  }, [months, monthIndices]);

  return (
    <Box sx={{ width: '100%', px: 2, py: 1 }}>
      <Slider
        value={currentIndex}
        onChange={handleChange}
        step={1}
        marks={marks}
        min={0}
        max={monthIndices.length - 1}
        valueLabelDisplay="auto"
        valueLabelFormat={(index) => format(months[index], 'MMM yyyy')}
        aria-label="Time slider"
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption">
          {months.length > 0 && format(months[0], 'MMM yyyy')}
        </Typography>
        <Typography variant="caption">
          {months.length > 0 && format(months[months.length - 1], 'MMM yyyy')}
        </Typography>
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