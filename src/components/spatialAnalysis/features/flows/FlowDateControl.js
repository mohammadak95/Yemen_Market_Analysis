// src/components/spatialAnalysis/features/flows/FlowDateControl.js

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  IconButton, 
  Slider, 
  Typography,
  Paper,
  CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SpeedIcon from '@mui/icons-material/Speed';
import { debounce } from 'lodash';

// Helper function to prevent default events
const preventEvent = (e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  return false;
};

// Date format utilities
const dateUtils = {
  // Convert YYYY-MM to YYYY-MM-DD
  toFlowDate: (date) => {
    if (!date) return null;
    return date.length === 7 ? `${date}-01` : date;
  },
  // Convert YYYY-MM-DD to YYYY-MM
  toSpatialDate: (date) => {
    if (!date) return null;
    return date.substring(0, 7);
  },
  // Format date for display
  formatDate: (date) => {
    try {
      // Always use YYYY-MM format for display
      const spatialDate = dateUtils.toSpatialDate(date);
      return new Date(`${spatialDate}-01`).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return date;
    }
  }
};

const FlowDateControl = ({
  dates,
  currentDate,
  onChange,
  autoPlayInterval = 1000,
  loading = false
}) => {
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [sliderValue, setSliderValue] = useState(0);
  const [internalDate, setInternalDate] = useState(currentDate);

  // Refs for cleanup and state tracking
  const intervalRef = useRef(null);
  const lastChangeRef = useRef(null);

  // Normalize all dates to YYYY-MM format for spatial slice
  const normalizedDates = useMemo(() => 
    dates.map(dateUtils.toSpatialDate),
    [dates]
  );
  const normalizedCurrentDate = useMemo(() => 
    dateUtils.toSpatialDate(currentDate),
    [currentDate]
  );

  // Create stable onChange handler
  const handleChange = useCallback((e, newDate) => {
    preventEvent(e);
    
    const now = Date.now();
    // Prevent rapid consecutive updates
    if (lastChangeRef.current && now - lastChangeRef.current < 200) {
      return;
    }
    lastChangeRef.current = now;

    // Always pass YYYY-MM format to spatial slice
    const spatialDate = dateUtils.toSpatialDate(newDate);
    onChange(null, spatialDate);
  }, [onChange]);

  // Debounced onChange handler with cleanup
  const debouncedOnChange = useMemo(
    () => debounce(handleChange, 200, { leading: true, trailing: true }),
    [handleChange]
  );

  // Initialize slider value based on current date
  useEffect(() => {
    const currentIndex = normalizedDates.indexOf(normalizedCurrentDate);
    if (currentIndex >= 0) {
      setSliderValue(currentIndex);
      setInternalDate(normalizedCurrentDate);
    } else if (dates.length > 0) {
      setSliderValue(0);
      const firstDate = dateUtils.toSpatialDate(dates[0]);
      setInternalDate(firstDate);
      handleChange(null, firstDate);
    }
  }, [currentDate, dates, normalizedCurrentDate, normalizedDates, handleChange]);

  // Handle auto-play with cleanup
  const handleAutoPlay = useCallback(() => {
    if (isPlaying) {
      setSliderValue(prev => {
        const next = prev + 1;
        if (next >= dates.length) {
          setIsPlaying(false);
          return 0;
        }
        const newDate = dateUtils.toSpatialDate(dates[next]);
        setInternalDate(newDate);
        debouncedOnChange(null, newDate);
        return next;
      });
    }
  }, [isPlaying, dates, debouncedOnChange]);

  // Auto-play effect with proper cleanup
  useEffect(() => {
    if (isPlaying && !loading) {
      intervalRef.current = setInterval(handleAutoPlay, autoPlayInterval / playbackSpeed);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, autoPlayInterval, playbackSpeed, handleAutoPlay, loading]);

  // Button handlers with event prevention
  const handlePlayPause = useCallback((e) => {
    preventEvent(e);
    setIsPlaying(prev => !prev);
  }, []);

  const handlePrevious = useCallback((e) => {
    preventEvent(e);
    const newValue = Math.max(0, sliderValue - 1);
    const newDate = dateUtils.toSpatialDate(dates[newValue]);
    setSliderValue(newValue);
    setInternalDate(newDate);
    debouncedOnChange(null, newDate);
  }, [sliderValue, dates, debouncedOnChange]);

  const handleNext = useCallback((e) => {
    preventEvent(e);
    const newValue = Math.min(dates.length - 1, sliderValue + 1);
    const newDate = dateUtils.toSpatialDate(dates[newValue]);
    setSliderValue(newValue);
    setInternalDate(newDate);
    debouncedOnChange(null, newDate);
  }, [dates.length, sliderValue, dates, debouncedOnChange]);

  const handleSpeedChange = useCallback((e) => {
    preventEvent(e);
    setPlaybackSpeed(prev => (prev === 4 ? 1 : prev * 2));
  }, []);

  // Slider change handler with event prevention
  const handleSliderChange = useCallback((e, value) => {
    preventEvent(e);
    if (value !== sliderValue) {
      const newDate = dateUtils.toSpatialDate(dates[value]);
      setSliderValue(value);
      setInternalDate(newDate);
      debouncedOnChange(null, newDate);
    }
  }, [dates, sliderValue, debouncedOnChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  return (
    <Paper
      elevation={2}
      sx={{
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        borderRadius: 1,
        p: 2,
        position: 'relative'
      }}
      onMouseDown={preventEvent}
      onClick={preventEvent}
    >
      {/* Loading Indicator Overlay */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 999,
            backgroundColor: 'rgba(255,255,255,0.7)',
            borderRadius: '50%',
            p: 2
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}

      <Box sx={{ width: '100%', opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s' }}>
        <Typography 
          variant="subtitle2" 
          color="textPrimary"
          sx={{ display: 'block', mb: 1, textAlign: 'center', fontWeight: 500 }}
        >
          {dateUtils.formatDate(dates[sliderValue])}
        </Typography>

        <Slider
          value={sliderValue}
          min={0}
          max={dates.length - 1}
          onChange={handleSliderChange}
          onMouseDown={preventEvent}
          disabled={loading}
          sx={{ mb: 2, '& .MuiSlider-thumb': { width: 12, height: 12 } }}
        />

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 1,
          '& .MuiIconButton-root': {
            padding: 1,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }
        }}>
          <IconButton 
            size="small" 
            onClick={handlePrevious}
            onMouseDown={preventEvent}
            disabled={sliderValue === 0 || loading}
            title="Previous"
          >
            <SkipPreviousIcon fontSize="small" />
          </IconButton>

          <IconButton 
            size="small" 
            onClick={handlePlayPause}
            onMouseDown={preventEvent}
            disabled={loading}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <PauseIcon fontSize="small" />
            ) : (
              <PlayArrowIcon fontSize="small" />
            )}
          </IconButton>

          <IconButton 
            size="small" 
            onClick={handleNext}
            onMouseDown={preventEvent}
            disabled={sliderValue === dates.length - 1 || loading}
            title="Next"
          >
            <SkipNextIcon fontSize="small" />
          </IconButton>

          <IconButton 
            size="small" 
            onClick={handleSpeedChange}
            onMouseDown={preventEvent}
            disabled={loading}
            title={`Playback Speed: ${playbackSpeed}x`}
            sx={{ position: 'relative' }}
          >
            <SpeedIcon fontSize="small" />
            <Typography 
              variant="caption" 
              sx={{ 
                position: 'absolute',
                bottom: 2,
                right: 2,
                fontSize: '0.6rem',
                fontWeight: 'bold',
                backgroundColor: theme.palette.background.paper,
                borderRadius: '50%',
                width: 12,
                height: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {playbackSpeed}x
            </Typography>
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

FlowDateControl.propTypes = {
  dates: PropTypes.arrayOf(PropTypes.string).isRequired,
  currentDate: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  autoPlayInterval: PropTypes.number,
  loading: PropTypes.bool
};

export default React.memo(FlowDateControl);
