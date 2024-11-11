// src/components/analysis/spatial-analysis/TimeControls.js

import React, { useMemo, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Box,
  Slider,
  Typography,
  Tooltip as MuiTooltip,
  IconButton,
  LinearProgress,
} from '@mui/material';
import { PlayArrow, Pause, SkipPrevious, SkipNext } from '@mui/icons-material';
import debounce from 'lodash.debounce';

const TimeControls = ({
  availableMonths = [],
  selectedMonth,
  onMonthChange,
  isPlaying = false,
  onPlayToggle,
  playbackSpeed = 1000,
}) => {
  // Memoize formatted dates
  const formattedDates = useMemo(
    () =>
      availableMonths.map((month) =>
        new Date(`${month}-01`).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        })
      ),
    [availableMonths]
  );

  // Handle Slider Change with debounce
  const debouncedSliderChange = useMemo(
    () =>
      debounce((event, newValue) => {
        onMonthChange(availableMonths[newValue]);
      }, 300),
    [availableMonths, onMonthChange]
  );

  const handleSliderChange = useCallback(
    (event, newValue) => {
      debouncedSliderChange(event, newValue);
    },
    [debouncedSliderChange]
  );

  // Handle Previous Button Click
  const handlePrevious = useCallback(() => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex > 0) {
      onMonthChange(availableMonths[currentIndex - 1]);
    }
  }, [availableMonths, selectedMonth, onMonthChange]);

  // Handle Next Button Click
  const handleNext = useCallback(() => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex < availableMonths.length - 1) {
      onMonthChange(availableMonths[currentIndex + 1]);
    }
  }, [availableMonths, selectedMonth, onMonthChange]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const currentIndex = availableMonths.indexOf(selectedMonth);
      if (currentIndex < availableMonths.length - 1) {
        onMonthChange(availableMonths[currentIndex + 1]);
      } else {
        clearInterval(interval);
      }
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, availableMonths, selectedMonth, onMonthChange, playbackSpeed]);

  return (
    <Paper
      elevation={3}
      sx={{
        width: '100%',
        p: 2,
        mt: 2,
      }}
    >
      <Box sx={{ width: '100%' }}>
        {/* Timeline Slider */}
        <Box sx={{ px: 2, pb: 1 }}>
          <Slider
            value={availableMonths.indexOf(selectedMonth)}
            min={0}
            max={availableMonths.length - 1}
            onChange={handleSliderChange}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => formattedDates[value]}
            marks={availableMonths.map((_, index) => ({
              value: index,
              label: index % 6 === 0 ? formattedDates[index] : '',
            }))}
          />
        </Box>

        {/* Playback Controls */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <IconButton
            onClick={handlePrevious}
            disabled={availableMonths.indexOf(selectedMonth) === 0}
          >
            <SkipPrevious />
          </IconButton>
          <IconButton onClick={onPlayToggle}>
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
          <IconButton
            onClick={handleNext}
            disabled={
              availableMonths.indexOf(selectedMonth) === availableMonths.length - 1
            }
          >
            <SkipNext />
          </IconButton>
        </Box>

        {/* Playback Progress */}
        {isPlaying && (
          <LinearProgress
            variant="determinate"
            value={
              (availableMonths.indexOf(selectedMonth) / (availableMonths.length - 1)) *
              100
            }
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
