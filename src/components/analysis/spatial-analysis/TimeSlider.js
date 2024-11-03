// src/components/analysis/spatial-analysis/TimeSlider.js

import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Slider, Typography } from '@mui/material';
import { format, parseISO, isValid } from 'date-fns';

const TimeSlider = ({
  months = [],
  selectedDate,
  onChange
}) => {
  // Memoized date processing with enhanced error handling
  const dates = useMemo(() => {
    if (!Array.isArray(months)) {
      console.warn('TimeSlider: months prop must be an array');
      return [];
    }

    return months
      .map(dateStr => {
        if (!dateStr) return null;
        try {
          const parsedDate = parseISO(dateStr);
          if (!isValid(parsedDate)) {
            console.warn(`TimeSlider: Invalid date string: "${dateStr}"`);
            return null;
          }
          // Normalize to first day of month for consistent comparison
          return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
        } catch (e) {
          console.warn(`TimeSlider: Error parsing date: "${dateStr}"`, e);
          return null;
        }
      })
      .filter(Boolean) // Remove null values
      .sort((a, b) => a.getTime() - b.getTime());
  }, [months]);

  // Handle empty state
  if (dates.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No valid dates available for timeline
        </Typography>
      </Box>
    );
  }

  const minTime = dates[0].getTime();
  const maxTime = dates[dates.length - 1].getTime();

  // Safely parse selected date with fallback to minTime
  const selectedTime = useMemo(() => {
    if (!selectedDate) return minTime;
    try {
      const parsed = parseISO(selectedDate);
      if (!isValid(parsed)) return minTime;
      // Normalize to first day of month for consistent comparison
      const normalizedDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      return normalizedDate.getTime();
    } catch (e) {
      console.warn('TimeSlider: Error parsing selected date, using minimum date');
      return minTime;
    }
  }, [selectedDate, minTime]);

  // Generate marks for the slider with consistent date formatting
  const marks = useMemo(() => {
    const totalMonths = dates.length;
    const stride = totalMonths > 12 ? Math.ceil(totalMonths / 12) : 1;
    
    return dates
      .filter((_, index) => index % stride === 0)
      .map(date => ({
        value: date.getTime(),
        label: format(date, totalMonths > 12 ? 'MMM yy' : 'MMM yyyy')
      }));
  }, [dates]);

  // Handle slider change with validation and normalization
  const handleChange = useCallback((_, newValue) => {
    const numericValue = Number(newValue);
    if (isNaN(numericValue)) {
      console.warn('TimeSlider: Invalid slider value');
      return;
    }
    
    // Find nearest valid date
    const nearestDate = dates.reduce((prev, curr) => {
      return Math.abs(curr.getTime() - numericValue) < Math.abs(prev.getTime() - numericValue)
        ? curr
        : prev;
    }, dates[0]);
    
    // Return ISO string with validation
    try {
      const isoString = nearestDate.toISOString();
      onChange(isoString);
    } catch (e) {
      console.error('TimeSlider: Error converting date to ISO string', e);
    }
  }, [dates, onChange]);

  return (
    <Box sx={{ width: '100%', mt: 4, px: 3 }}>
      <Box sx={{ position: 'relative', height: 50, mb: 1 }}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            position: 'absolute',
            top: -30,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'background.paper',
            padding: '4px 8px',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            zIndex: 1,
            minWidth: '150px',
            textAlign: 'center'
          }}
        >
          {format(new Date(selectedTime), 'MMMM yyyy')}
        </Typography>
        
        <Slider
          value={selectedTime}
          min={minTime}
          max={maxTime}
          onChange={handleChange}
          marks={marks}
          step={null}
          valueLabelDisplay="auto"
          valueLabelFormat={value => {
            try {
              // Ensure value is treated as a number for the Date constructor
              return format(new Date(Number(value)), 'MMM yyyy');
            } catch (e) {
              return 'Invalid date';
            }
          }}
          sx={{
            '& .MuiSlider-mark': {
              height: 8,
            },
            '& .MuiSlider-markLabel': {
              fontSize: '0.75rem',
              transform: 'translateY(20px) rotate(-45deg)',
              transformOrigin: 'center',
              whiteSpace: 'nowrap',
              width: 'auto',
              marginLeft: '-12px'
            },
            '& .MuiSlider-valueLabel': {
              backgroundColor: 'background.paper',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'divider',
              fontSize: '0.75rem',
              zIndex: 2,
              padding: '4px 8px',
              '&:before': {
                display: 'none'
              },
              top: -6,
              '&.MuiSlider-valueLabelOpen': {
                transform: 'translate(-50%, -100%) scale(1)',
              }
            },
            '& .MuiSlider-thumb': {
              width: 12,
              height: 12,
              '&:hover, &.Mui-focusVisible': {
                boxShadow: 'none'
              },
              '&.Mui-active': {
                boxShadow: 'none'
              }
            },
            '& .MuiSlider-rail': {
              opacity: 0.5,
            },
            '& .MuiSlider-track': {
              border: 'none',
            }
          }}
        />
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        mt: 3,
        px: 1
      }}>
        <Typography variant="caption">
          Range: {format(dates[0], 'MMMM yyyy')} - {format(dates[dates.length - 1], 'MMMM yyyy')}
        </Typography>
        <Typography variant="caption">
          {dates.length} time periods
        </Typography>
      </Box>
    </Box>
  );
};

TimeSlider.propTypes = {
  months: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedDate: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

TimeSlider.defaultProps = {
  selectedDate: null,
};

export default React.memo(TimeSlider);