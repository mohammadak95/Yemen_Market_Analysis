// src/components/analysis/spatial-analysis/components/shocks/TimeControl.js

import React, { useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { Box, Slider, IconButton, Typography, Tooltip } from '@mui/material';
import { PlayArrow, Pause, SkipPrevious, SkipNext } from '@mui/icons-material';
import { DEBUG_SHOCK_ANALYSIS } from '../../../../../utils/shockAnalysisDebug';

const TimeControl = ({ timeRange, selectedDate, onChange }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [playbackSpeed] = React.useState(1000); // ms
  const playbackRef = useRef(null);
  const debugMonitor = useRef(DEBUG_SHOCK_ANALYSIS.initializeDebugMonitor('TimeControl'));

  const currentIndex = timeRange.indexOf(selectedDate);

  useEffect(() => {
    // Validate time control state
    const isValid = DEBUG_SHOCK_ANALYSIS.monitorTimeControl(timeRange, selectedDate);
    if (!isValid) {
      console.warn('Invalid time control state detected');
      setIsPlaying(false);
    }
  }, [timeRange, selectedDate]);

  const handleSliderChange = useCallback((event, newValue) => {
    if (newValue >= 0 && newValue < timeRange.length) {
      onChange(timeRange[newValue]);
    } else {
      console.warn('Invalid slider value:', newValue);
    }
  }, [timeRange, onChange]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < timeRange.length - 1) {
      onChange(timeRange[currentIndex + 1]);
    }
  }, [currentIndex, timeRange, onChange]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      onChange(timeRange[currentIndex - 1]);
    }
  }, [currentIndex, timeRange, onChange]);

  // Playback control with error handling
  useEffect(() => {
    if (isPlaying) {
      playbackRef.current = setInterval(() => {
        if (currentIndex < timeRange.length - 1) {
          handleNext();
        } else {
          setIsPlaying(false);
        }
      }, playbackSpeed);
    }

    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
      }
    };
  }, [isPlaying, currentIndex, timeRange.length, handleNext, playbackSpeed]);

  // Format date for display
  const formatDate = useCallback((date) => {
    try {
      return new Date(date).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', date);
      return 'Invalid Date';
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => debugMonitor.current.finish();
  }, []);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Tooltip title={currentIndex === 0 ? "At start" : "Previous"}>
        <span>
          <IconButton 
            onClick={handlePrevious} 
            disabled={currentIndex === 0}
            aria-label="Previous date"
          >
            <SkipPrevious />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={isPlaying ? "Pause" : "Play"}>
        <IconButton 
          onClick={handlePlayPause}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause /> : <PlayArrow />}
        </IconButton>
      </Tooltip>

      <Tooltip title={currentIndex === timeRange.length - 1 ? "At end" : "Next"}>
        <span>
          <IconButton 
            onClick={handleNext} 
            disabled={currentIndex === timeRange.length - 1}
            aria-label="Next date"
          >
            <SkipNext />
          </IconButton>
        </span>
      </Tooltip>

      <Box sx={{ flexGrow: 1, mx: 2 }}>
        <Slider
          value={currentIndex}
          min={0}
          max={timeRange.length - 1}
          onChange={handleSliderChange}
          valueLabelDisplay="auto"
          valueLabelFormat={(index) => formatDate(timeRange[index])}
          aria-label="Time range slider"
        />
      </Box>

      <Typography variant="body2" sx={{ minWidth: 100 }}>
        {formatDate(selectedDate)}
      </Typography>
    </Box>
  );
};

TimeControl.propTypes = {
  timeRange: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedDate: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default React.memo(TimeControl);