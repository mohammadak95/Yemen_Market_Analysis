// src/components/analysis/spatial-analysis/TimeControls.js
import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Box,
  Slider,
  IconButton,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
} from '@mui/icons-material';

const TimeControls = ({
  availableMonths = [],
  selectedMonth,
  onMonthChange,
  isPlaying = false,
  onPlayToggle,
  playbackSpeed = 1000,
}) => {
  const formattedDates = useMemo(() => 
    availableMonths.map(month => 
      new Date(month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    ), [availableMonths]);

  const currentIndex = availableMonths.indexOf(selectedMonth);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      onMonthChange(availableMonths[currentIndex - 1]);
    }
  }, [currentIndex, availableMonths, onMonthChange]);

  const handleNext = useCallback(() => {
    if (currentIndex < availableMonths.length - 1) {
      onMonthChange(availableMonths[currentIndex + 1]);
    }
  }, [currentIndex, availableMonths, onMonthChange]);

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Box sx={{ width: '100%' }}>
        <Slider
          value={currentIndex}
          min={0}
          max={availableMonths.length - 1}
          onChange={(_, value) => onMonthChange(availableMonths[value])}
          valueLabelDisplay="auto"
          valueLabelFormat={value => formattedDates[value]}
          marks={availableMonths.map((_, index) => ({
            value: index,
            label: index % 6 === 0 ? formattedDates[index] : '',
          }))}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <IconButton onClick={handlePrevious} disabled={currentIndex === 0}>
            <SkipPrevious />
          </IconButton>
          <IconButton onClick={onPlayToggle}>
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
          <IconButton 
            onClick={handleNext} 
            disabled={currentIndex === availableMonths.length - 1}
          >
            <SkipNext />
          </IconButton>
        </Box>

        {isPlaying && (
          <LinearProgress
            variant="determinate"
            value={(currentIndex / (availableMonths.length - 1)) * 100}
            sx={{ mt: 1 }}
          />
        )}
      </Box>
    </Paper>
  );
};

TimeControls.propTypes = {
  availableMonths: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedMonth: PropTypes.string.isRequired,
  onMonthChange: PropTypes.func.isRequired,
  isPlaying: PropTypes.bool,
  onPlayToggle: PropTypes.func,
  playbackSpeed: PropTypes.number,
};

export default React.memo(TimeControls);