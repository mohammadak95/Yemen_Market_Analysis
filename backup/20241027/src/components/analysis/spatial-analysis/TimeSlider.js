// src/components/spatial-analysis/TimeSlider.js

import React, { useMemo, useCallback, Suspense } from 'react';
import PropTypes from 'prop-types';
import { Slider, Typography, Box, CircularProgress } from '@mui/material';
import { format } from 'date-fns';

const TimeSlider = ({ months, selectedDate, onChange }) => {
  // Validate months array and selectedDate
  if (!Array.isArray(months) || months.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">
          No time data available
        </Typography>
      </Box>
    );
  }

  // Ensure selectedDate is valid
  const validSelectedDate = selectedDate instanceof Date && !isNaN(selectedDate) 
    ? selectedDate 
    : new Date(months[0]);

  const selectedIndex = useMemo(() => {
    return months.findIndex(month => 
      month.getTime() === validSelectedDate.getTime()
    );
  }, [months, validSelectedDate]);

  // Generate marks for the slider
  const marks = useMemo(() => months.map((month, index) => ({
    value: index,
    label: index % 3 === 0 ? format(month, 'MMM yyyy') : '',
  })), [months]);

  // Handle slider change
  const handleChange = useCallback((_, newValue) => {
    const newDate = months[newValue];
    if (newDate) {
      onChange(newDate);
    }
  }, [months, onChange]);

  return (
    <Suspense fallback={<CircularProgress />}>
      <Box sx={{ width: '100%', px: 2, py: 1 }}>
        <Slider
          value={selectedIndex !== -1 ? selectedIndex : 0}
          min={0}
          max={months.length - 1}
          marks={marks}
          onChange={handleChange}
          valueLabelDisplay="auto"
          valueLabelFormat={(index) => format(months[index], 'MMM yyyy')}
          aria-label="Time slider"
          sx={{
            '& .MuiSlider-markLabel': {
              fontSize: '0.75rem',
            }
          }}
        />
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          mt: 1,
          px: 2 
        }}>
          <Typography variant="caption">
            {format(months[0], 'MMM yyyy')}
          </Typography>
          <Typography variant="caption">
            {format(months[months.length - 1], 'MMM yyyy')}
          </Typography>
        </Box>
      </Box>
    </Suspense>
  );
};

TimeSlider.propTypes = {
  months: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired,
  selectedDate: PropTypes.instanceOf(Date),
  onChange: PropTypes.func.isRequired,
};

export default TimeSlider;