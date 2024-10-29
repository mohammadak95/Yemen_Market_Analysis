//src/utils/enhancedDataFetcher.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Slider, Typography } from '@mui/material';
import { format } from 'date-fns';

const TimeSlider = ({
  months = [],
  selectedDate,
  onChange
}) => {
  // Convert dates to timestamps and sort them
  const dates = useMemo(() => 
    months
      .map(m => m instanceof Date ? m : new Date(m))
      .filter(m => !isNaN(m)) // Filter out invalid dates
      .sort((a, b) => a - b),
    [months]
  );
  
  if (dates.length === 0) {
    return <Typography>No dates available</Typography>;
  }

  const minTime = dates[0].getTime();
  const maxTime = dates[dates.length - 1].getTime();
  
  // Ensure selectedDate is a valid Date and convert to timestamp
  const selectedTime = useMemo(() => {
    const time = new Date(selectedDate).getTime();
    return isNaN(time) ? minTime : time;
  }, [selectedDate, minTime]);

  // Create marks with improved spacing
  const marks = useMemo(() => {
    // If we have too many dates, show fewer marks
    const stride = dates.length > 12 ? Math.ceil(dates.length / 12) : 1;
    
    return dates
      .filter((_, index) => index % stride === 0)
      .map(date => ({
        value: date.getTime(),
        label: format(date, dates.length > 12 ? 'MMM yy' : 'MMM yyyy')
      }));
  }, [dates]);

  const handleChange = (_, newValue) => {
    // Ensure newValue is a number
    const numericValue = Number(newValue);
    if (isNaN(numericValue)) return;
    
    // Find the closest date to the slider value
    const nearestDate = dates.reduce((prev, curr) => {
      return Math.abs(curr.getTime() - numericValue) < Math.abs(prev.getTime() - numericValue)
        ? curr
        : prev;
    }, dates[0]);
    
    onChange(nearestDate);
  };

  return (
    <Box sx={{ width: '100%', mt: 4, px: 3 }}>
      <Box sx={{ 
        position: 'relative',
        height: 50,
        mb: 1
      }}>
        {/* Current date display - positioned above slider */}
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
            zIndex: 1
          }}
        >
          {format(new Date(selectedTime), 'MMMM d, yyyy')}
        </Typography>
        
        <Slider
          value={selectedTime}
          min={minTime}
          max={maxTime}
          onChange={handleChange}
          marks={marks}
          step={null}
          valueLabelDisplay="auto"
          valueLabelFormat={value => format(new Date(Number(value)), 'MMM d, yyyy')}
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
              zIndex: 2
            }
          }}
        />
      </Box>
      
      {/* Range display */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        mt: 3,
        px: 1
      }}>
        <Typography variant="caption">
          Range: {format(new Date(minTime), 'MMMM yyyy')} - {format(new Date(maxTime), 'MMMM yyyy')}
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
  ]).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default TimeSlider;