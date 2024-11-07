// src/components/analysis/spatial-analysis/TimeControls.js

import React from 'react';
import { Box, Slider, Typography } from '@mui/material';

const TimeControls = ({ availableMonths, selectedMonth, onMonthChange }) => {
  if (
    !availableMonths ||
    availableMonths.length === 0 ||
    !selectedMonth ||
    !availableMonths.includes(selectedMonth)
  ) {
    return null; // Or render a placeholder or message
  }

  const monthIndices = availableMonths.map((month, index) => index);
  const currentMonthIndex = availableMonths.indexOf(selectedMonth);

  const handleSliderChange = (event, newValue) => {
    const newMonth = availableMonths[newValue];
    onMonthChange(newMonth);
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Typography variant="subtitle1">Select Month:</Typography>
      <Slider
        value={currentMonthIndex}
        min={0}
        max={availableMonths.length - 1}
        onChange={handleSliderChange}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => availableMonths[value]}
        marks={availableMonths.map((month, index) => ({
          value: index,
          label: month,
        }))}
      />
    </Box>
  );
};

export default TimeControls;