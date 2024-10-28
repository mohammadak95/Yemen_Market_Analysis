import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Slider, Typography } from '@mui/material';
import { format } from 'date-fns';

const TimeSlider = ({
  months = [],
  selectedDate = null,
  onChange
}) => {
  // Convert all dates to valid Date objects first
  const validMonths = useMemo(() => {
    return months
      .map(month => month instanceof Date ? month : new Date(month))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
  }, [months]);

  // Get timestamps for range
  const timeRange = useMemo(() => ({
    min: Number(validMonths[0]?.getTime() || 0),
    max: Number(validMonths[validMonths.length - 1]?.getTime() || 0)
  }), [validMonths]);

  // Get current timestamp
  const currentValue = useMemo(() => {
    const date = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
    return Number(date.getTime());
  }, [selectedDate]);

  // Create marks with explicit number conversion
  const marks = useMemo(() => {
    return validMonths.map((date, index) => ({
      value: Number(date.getTime()),
      label: index % 3 === 0 ? format(date, 'MMM yyyy') : ''
    }));
  }, [validMonths]);

  const handleChange = useCallback((_, newValue) => {
    // Ensure newValue is a number
    const numericValue = Number(newValue);
    const nearestDate = validMonths.reduce((prev, curr) => {
      return Math.abs(curr.getTime() - numericValue) < Math.abs(prev.getTime() - numericValue)
        ? curr
        : prev;
    });
    onChange(nearestDate);
  }, [validMonths, onChange]);

  // Formatter that ensures numeric values
  const formatLabel = useCallback((value) => {
    const numericValue = Number(value);
    return format(new Date(numericValue), 'MMM yyyy');
  }, []);

  if (!validMonths.length) return null;

  return (
    <Box sx={{ width: '100%', px: 2, py: 1 }}>
      <Slider
        min={timeRange.min}
        max={timeRange.max}
        value={currentValue}
        onChange={handleChange}
        marks={marks}
        step={null}
        valueLabelFormat={formatLabel}
        getAriaValueText={formatLabel}
        valueLabelDisplay="auto"
        scale={(x) => Number(x)}  // Ensure scale returns a number
        aria-label="Time range"
        slotProps={{
          valueLabel: {
            // Force value to be numeric in value label
            value: Number(currentValue)
          }
        }}
      />
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        mt: 1,
        px: 1 
      }}>
        <Typography variant="caption">
          {format(validMonths[0], 'MMM yyyy')}
        </Typography>
        <Typography variant="caption">
          {format(validMonths[validMonths.length - 1], 'MMM yyyy')}
        </Typography>
      </Box>
    </Box>
  );
};

TimeSlider.propTypes = {
  months: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.instanceOf(Date),
      PropTypes.string
    ])
  ).isRequired,
  selectedDate: PropTypes.oneOfType([
    PropTypes.instanceOf(Date),
    PropTypes.string
  ]),
  onChange: PropTypes.func.isRequired,
};

export default TimeSlider;