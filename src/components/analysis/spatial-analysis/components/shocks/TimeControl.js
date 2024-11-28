// src/components/analysis/spatial-analysis/components/shocks/TimeControl.js

import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Slider, IconButton, Typography, Tooltip } from '@mui/material';
import { PlayArrow, Pause, SkipPrevious, SkipNext } from '@mui/icons-material';
import { DEBUG_SHOCK_ANALYSIS } from '../../../../../utils/shockAnalysisDebug';
import { backgroundMonitor } from '../../../../../utils/backgroundMonitor';

const TimeControl = ({ timeRange, selectedDate, onChange }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [playbackSpeed] = React.useState(1000); // ms
  const playbackRef = useRef(null);
  const debugMonitor = useRef(DEBUG_SHOCK_ANALYSIS.initializeDebugMonitor('TimeControl'));

  // Validate and clean up time range data
  const validTimeRange = useMemo(() => {
    if (!Array.isArray(timeRange)) {
      console.warn('Invalid timeRange provided:', timeRange);
      return [];
    }

    return timeRange
      .filter(date => {
        try {
          return date && !isNaN(new Date(date).getTime());
        } catch (e) {
          console.warn('Invalid date in timeRange:', date);
          return false;
        }
      })
      .sort((a, b) => new Date(a) - new Date(b));
  }, [timeRange]);

  const currentIndex = validTimeRange.indexOf(selectedDate);

  // Monitor time control state
  useEffect(() => {
    const metric = backgroundMonitor.startMetric('time-control-monitoring');
    
    try {
      const state = {
        totalDates: validTimeRange.length,
        currentIndex,
        selectedDate,
        isValid: currentIndex !== -1,
        timeRange: {
          start: validTimeRange[0],
          end: validTimeRange[validTimeRange.length - 1]
        }
      };

      DEBUG_SHOCK_ANALYSIS.log('Time Control State:', state);
      metric.finish({ status: 'success', state });

      // Auto-select first date if current selection is invalid
      if (currentIndex === -1 && validTimeRange.length > 0) {
        onChange(validTimeRange[0]);
      }
    } catch (error) {
      console.error('Error monitoring time control:', error);
      metric.finish({ status: 'failed', error: error.message });
      setIsPlaying(false);
    }
  }, [validTimeRange, selectedDate, currentIndex, onChange]);

  const handleSliderChange = useCallback((event, newValue) => {
    if (newValue >= 0 && newValue < validTimeRange.length) {
      onChange(validTimeRange[newValue]);
    }
  }, [validTimeRange, onChange]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < validTimeRange.length - 1) {
      onChange(validTimeRange[currentIndex + 1]);
    }
  }, [currentIndex, validTimeRange, onChange]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      onChange(validTimeRange[currentIndex - 1]);
    }
  }, [currentIndex, validTimeRange, onChange]);

  // Playback control
  useEffect(() => {
    if (isPlaying) {
      playbackRef.current = setInterval(() => {
        if (currentIndex < validTimeRange.length - 1) {
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
  }, [isPlaying, currentIndex, validTimeRange.length, handleNext, playbackSpeed]);

  // Format date for display
  const formatDate = useCallback((date) => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short'
      });
    } catch (error) {
      console.warn('Invalid date:', date);
      return 'Invalid Date';
    }
  }, []);

  // Cleanup
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
      }
      debugMonitor.current.finish();
      
      const duration = performance.now() - startTime;
      console.log('TimeControl render duration:', duration.toFixed(2) + 'ms');
    };
  }, []);

  // Don't render if no valid dates
  if (!validTimeRange.length) {
    return (
      <Typography variant="body2" color="error" sx={{ my: 2 }}>
        No valid dates available for time control
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2 }}>
      <Tooltip title={currentIndex === 0 ? "At start" : "Previous"}>
        <span>
          <IconButton 
            onClick={handlePrevious} 
            disabled={currentIndex <= 0}
            aria-label="Previous date"
          >
            <SkipPrevious />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={isPlaying ? "Pause" : "Play"}>
        <IconButton 
          onClick={handlePlayPause}
          disabled={validTimeRange.length <= 1}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause /> : <PlayArrow />}
        </IconButton>
      </Tooltip>

      <Tooltip title={currentIndex === validTimeRange.length - 1 ? "At end" : "Next"}>
        <span>
          <IconButton 
            onClick={handleNext} 
            disabled={currentIndex === validTimeRange.length - 1 || currentIndex === -1}
            aria-label="Next date"
          >
            <SkipNext />
          </IconButton>
        </span>
      </Tooltip>

      <Box sx={{ flexGrow: 1, mx: 2 }}>
        <Slider
          value={currentIndex >= 0 ? currentIndex : 0}
          min={0}
          max={Math.max(0, validTimeRange.length - 1)}
          onChange={handleSliderChange}
          disabled={validTimeRange.length <= 1}
          valueLabelDisplay="auto"
          valueLabelFormat={(index) => formatDate(validTimeRange[index])}
          aria-label="Time range slider"
          marks={validTimeRange.length > 10 ? undefined : validTimeRange.map((date, index) => ({
            value: index,
            label: formatDate(date)
          }))}
        />
      </Box>

      <Typography variant="body2" sx={{ minWidth: 100 }}>
        {currentIndex >= 0 ? formatDate(selectedDate) : 'No date selected'}
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