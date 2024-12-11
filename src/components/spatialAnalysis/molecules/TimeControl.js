import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  IconButton, 
  Slider, 
  Typography,
  Paper
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SpeedIcon from '@mui/icons-material/Speed';
import { debounce } from 'lodash';

// Helper function to normalize date to YYYY-MM format
const normalizeDate = (date) => {
  try {
    return date?.substring(0, 7);
  } catch (error) {
    console.error('Error normalizing date:', error);
    return date;
  }
};

// Helper function to format date for display
const formatDate = (date) => {
  try {
    const fullDate = `${normalizeDate(date)}-01`;
    return new Date(fullDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return date;
  }
};

const TimeControl = ({
  dates,
  currentDate,
  onChange,
  autoPlayInterval = 1000,
  position = null
}) => {
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [sliderValue, setSliderValue] = useState(0);
  const [internalDate, setInternalDate] = useState(currentDate);

  // Normalize all dates - memoized to prevent unnecessary recalculations
  const normalizedDates = useMemo(() => dates.map(normalizeDate), [dates]);
  const normalizedCurrentDate = useMemo(() => normalizeDate(currentDate), [currentDate]);

  // Debounced onChange handler to prevent rapid Redux updates
  const debouncedOnChange = useMemo(
    () => debounce((newDate) => {
      onChange(newDate);
    }, 150),
    [onChange]
  );

  // Initialize slider value based on current date
  useEffect(() => {
    const currentIndex = normalizedDates.indexOf(normalizedCurrentDate);
    
    if (currentIndex >= 0) {
      setSliderValue(currentIndex);
      setInternalDate(normalizedCurrentDate);
    } else if (dates.length > 0) {
      setSliderValue(0);
      setInternalDate(normalizeDate(dates[0]));
      onChange(normalizeDate(dates[0]));
    }
  }, [currentDate, dates, normalizedCurrentDate, normalizedDates, onChange]);

  // Handle auto-play with useCallback to prevent recreation
  const handleAutoPlay = useCallback(() => {
    if (isPlaying) {
      setSliderValue(prev => {
        const next = prev + 1;
        if (next >= dates.length) {
          setIsPlaying(false);
          return 0;
        }
        const newDate = normalizeDate(dates[next]);
        setInternalDate(newDate);
        debouncedOnChange(newDate);
        return next;
      });
    }
  }, [isPlaying, dates.length, debouncedOnChange]);

  // Auto-play effect
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(handleAutoPlay, autoPlayInterval / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, autoPlayInterval, playbackSpeed, handleAutoPlay]);

  // Optimized slider change handler
  const handleSliderChange = useCallback((_, value) => {
    if (value !== sliderValue) {
      const newDate = normalizeDate(dates[value]);
      setSliderValue(value);
      setInternalDate(newDate);
      debouncedOnChange(newDate);
    }
  }, [dates, sliderValue, debouncedOnChange]);

  // Memoized handlers to prevent unnecessary recreations
  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handlePrevious = useCallback(() => {
    const newValue = Math.max(0, sliderValue - 1);
    handleSliderChange(null, newValue);
  }, [sliderValue, handleSliderChange]);

  const handleNext = useCallback(() => {
    const newValue = Math.min(dates.length - 1, sliderValue + 1);
    handleSliderChange(null, newValue);
  }, [dates.length, sliderValue, handleSliderChange]);

  const handleSpeedChange = useCallback(() => {
    setPlaybackSpeed(prev => (prev === 4 ? 1 : prev * 2));
  }, []);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  // Memoize the rendered date to prevent unnecessary recalculations
  const formattedDate = useMemo(() => formatDate(dates[sliderValue]), [dates, sliderValue]);

  return (
    <Paper
      elevation={2}
      sx={{
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        borderRadius: 1,
        p: 2,
        ...(position && {
          position: 'absolute',
          zIndex: 1000,
          ...position
        })
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Typography 
          variant="subtitle2" 
          color="textPrimary"
          sx={{ 
            display: 'block', 
            mb: 1, 
            textAlign: 'center',
            fontWeight: 500
          }}
        >
          {formattedDate}
        </Typography>

        <Slider
          value={sliderValue}
          min={0}
          max={dates.length - 1}
          onChange={handleSliderChange}
          sx={{ 
            mb: 2,
            '& .MuiSlider-thumb': {
              width: 12,
              height: 12
            }
          }}
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
            disabled={sliderValue === 0}
            title="Previous"
          >
            <SkipPreviousIcon fontSize="small" />
          </IconButton>

          <IconButton 
            size="small" 
            onClick={handlePlayPause}
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
            disabled={sliderValue === dates.length - 1}
            title="Next"
          >
            <SkipNextIcon fontSize="small" />
          </IconButton>

          <IconButton 
            size="small" 
            onClick={handleSpeedChange}
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

TimeControl.propTypes = {
  dates: PropTypes.arrayOf(PropTypes.string).isRequired,
  currentDate: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  autoPlayInterval: PropTypes.number,
  position: PropTypes.shape({
    top: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    right: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    bottom: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    left: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    transform: PropTypes.string
  })
};

export default React.memo(TimeControl, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.currentDate === nextProps.currentDate &&
    prevProps.dates.length === nextProps.dates.length &&
    prevProps.autoPlayInterval === nextProps.autoPlayInterval &&
    JSON.stringify(prevProps.position) === JSON.stringify(nextProps.position)
  );
});
